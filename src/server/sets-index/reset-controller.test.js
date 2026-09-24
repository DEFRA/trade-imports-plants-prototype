import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer } from '../server.js'
import { records } from '../app/engine/persistence/records.js'
import { withSetContext } from '../app/shared/set-context.js'
import { PROTOTYPE_ORGANISATIONS } from '../prototype-sets/organisations.js'
import { seedHighRiskPlantsFor } from '../prototype-seed/seed-high-risk-plants.js'
import { recordSeeded, seededIdsFor } from '../prototype-seed/registry.js'
import { createSeedClient } from '../prototype-seed/http-client.js'

const SET_ID = 'high-risk-plants'
const RESET_PATH = `/reset/${SET_ID}`

const loadedOrUndefined = (journeyId) =>
  withSetContext(SET_ID, () => records.load({ journeyId }))

const signedInClient = async (server, organisationId) => {
  const client = createSeedClient(server)
  await client.get(
    `/auth/stub-sign-in?organisationId=${encodeURIComponent(organisationId)}`
  )
  await client.get('/')
  return client
}

describe('resetting a set from the chooser', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it('Should clear and re-seed the signed-in organisation, redirecting to the chooser with a banner naming it', async () => {
    const [organisation] = PROTOTYPE_ORGANISATIONS
    const before = await seedHighRiskPlantsFor(server, organisation.id)
    recordSeeded(SET_ID, organisation.id, before)

    const client = await signedInClient(server, organisation.id)
    const response = await client.post(RESET_PATH, {})

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(`/?reset=${SET_ID}`)

    for (const journeyId of before) {
      expect(await loadedOrUndefined(journeyId)).toBeUndefined()
    }

    const chooser = await client.get(response.headers.location)
    expect(chooser.result).toContain('has been reset')
    expect(chooser.result).toContain(organisation.name)

    const after = await withSetContext(SET_ID, () =>
      records.list({ journeyIds: before })
    )
    expect(after.rows).toEqual([])

    // Re-seeded: the organisation is one this prototype seeds, so its example
    // notifications come straight back under fresh reference numbers.
    const reseededIds = seededIdsFor(SET_ID, organisation.id)
    expect(reseededIds).not.toEqual(before)
    const reseeded = await withSetContext(SET_ID, () =>
      records.list({ journeyIds: reseededIds })
    )
    expect(reseeded.rows.length).toBeGreaterThan(0)
  })

  it('Should leave another organisation in the same set untouched', async () => {
    const untouchedOrganisation = 'organisation-not-reset'
    const resettingOrganisation = 'organisation-being-reset'
    const untouchedIds = await seedHighRiskPlantsFor(
      server,
      untouchedOrganisation
    )
    const resettingIds = await seedHighRiskPlantsFor(
      server,
      resettingOrganisation
    )

    const client = await signedInClient(server, resettingOrganisation)
    await client.post(RESET_PATH, {})

    for (const journeyId of resettingIds) {
      expect(await loadedOrUndefined(journeyId)).toBeUndefined()
    }
    for (const journeyId of untouchedIds) {
      expect(await loadedOrUndefined(journeyId)).toBeDefined()
    }
  })

  it('Should not reset anything, and not show the banner, while signed out', async () => {
    const [organisation] = PROTOTYPE_ORGANISATIONS
    const before = await seedHighRiskPlantsFor(server, organisation.id)

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
