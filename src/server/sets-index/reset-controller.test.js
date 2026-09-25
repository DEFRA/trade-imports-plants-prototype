import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createServer } from '../server.js'
import { records } from '../app/engine/persistence/records.js'
import { withSetContext } from '../app/shared/set-context.js'
import { seedHighRiskPlants } from '../prototype-seed/seed-high-risk-plants.js'
import { recordSeeded, seededIdsFor } from '../prototype-seed/registry.js'
import { createSeedClient } from '../prototype-seed/http-client.js'

const SET_ID = 'high-risk-plants'
const RESET_PATH = `/reset/${SET_ID}`
const RESETTING_ORGANISATION = 'resetting-organisation'

const loadedOrUndefined = (journeyId) =>
  withSetContext(SET_ID, () => records.load({ journeyId }))

const signedInClient = async (server, organisationId) => {
  const client = createSeedClient(server)
  await client.get(`/auth/stub-sign-in?organisationId=${organisationId}`)
  await client.get('/')
  return client
}

const startNotification = async (client) => {
  await client.get(`/${SET_ID}`)
  const started = await client.post(`/${SET_ID}/notifications`, {})
  const [, journeyId] =
    /\/notifications\/([^/]+)\//.exec(started.headers.location) ?? []
  return journeyId
}

describe('resetting a set from the chooser', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterEach(() => {
    delete process.env.PROTOTYPE_SEED
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it('Should clear everyone’s records in the set, re-seed the examples and redirect to the chooser with a banner', async () => {
    const before = await seedHighRiskPlants(server)
    recordSeeded(SET_ID, before)
    const someoneElse = await signedInClient(server, 'another-organisation')
    const theirs = await startNotification(someoneElse)

    const client = await signedInClient(server, RESETTING_ORGANISATION)
    const response = await client.post(RESET_PATH, {})

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(`/?reset=${SET_ID}`)

    for (const journeyId of [...before, theirs]) {
      expect(await loadedOrUndefined(journeyId)).toBeUndefined()
    }

    const chooser = await client.get(response.headers.location)
    expect(chooser.result).toContain('has been reset')

    const reseededIds = seededIdsFor(SET_ID)
    expect(reseededIds).toHaveLength(before.length)
    expect(reseededIds.some((journeyId) => before.includes(journeyId))).toBe(
      false
    )
    const reseeded = await withSetContext(SET_ID, () =>
      records.list({ journeyIds: reseededIds })
    )
    expect(reseeded.rows).toHaveLength(reseededIds.length)
  })

  it('Should show the re-seeded examples on a signed-in dashboard straight after', async () => {
    const client = await signedInClient(server, RESETTING_ORGANISATION)
    await client.post(RESET_PATH, {})

    const dashboard = await client.get(`/${SET_ID}`)

    for (const journeyId of seededIdsFor(SET_ID)) {
      expect(dashboard.result).toContain(journeyId)
    }
  })

  it('Should clear without re-seeding while seeding is switched off', async () => {
    process.env.PROTOTYPE_SEED = 'false'
    const client = await signedInClient(server, RESETTING_ORGANISATION)
    const own = await startNotification(client)

    await client.post(RESET_PATH, {})

    expect(await loadedOrUndefined(own)).toBeUndefined()
    expect(seededIdsFor(SET_ID)).toEqual([])
  })

  it('Should not reset anything while signed out', async () => {
    const before = await seedHighRiskPlants(server)

    const client = createSeedClient(server)
    await client.get('/')
    const response = await client.post(RESET_PATH, {})

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/')
    for (const journeyId of before) {
      expect(await loadedOrUndefined(journeyId)).toBeDefined()
    }
  })

  it('Should answer not found for a set that is not mounted', async () => {
    const client = await signedInClient(server, 'organisation-checking-404')

    const response = await client.post('/reset/not-a-mounted-set', {})

    expect(response.statusCode).toBe(404)
  })
})
