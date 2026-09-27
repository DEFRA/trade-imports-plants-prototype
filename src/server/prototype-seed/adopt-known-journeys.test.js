import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer } from '../server.js'
import { createSeedClient } from './http-client.js'
import { EXAMPLE_DATA_AUTHOR_ID, seedSet } from './seed-set.js'
import { recordExamples, recordSeeded } from './registry.js'

const SET_ID = 'high-risk-plants'
const DASHBOARD = `/${SET_ID}`
const FIRST_ORGANISATION = 'first-organisation'
const EXAMPLE_ORGANISATION = 'example-organisation-b'

const signedInClient = async (server, organisationId) => {
  const client = createSeedClient(server)
  await client.get(`/auth/stub-sign-in?organisationId=${organisationId}`)
  return client
}

describe('adopting the shared seeded journeys onto a signed-in session', () => {
  let server
  let journeyIds
  let theirs
  let deleted

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    const made = await seedSet(server, SET_ID)
    const shared = made.filter(
      (example) =>
        example.organisationId === null && example.status !== 'deleted'
    )
    journeyIds = shared.map((example) => example.journeyId)
    theirs = made.find((example) => example.organisationId !== null)
    deleted = made.find((example) => example.status === 'deleted')
    recordExamples(SET_ID, made)
    recordSeeded(SET_ID, journeyIds)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it('Should show an example made for one organisation only to sessions signed in to it', async () => {
    const member = await signedInClient(server, EXAMPLE_ORGANISATION)
    const outsider = await signedInClient(server, FIRST_ORGANISATION)

    const memberDashboard = await member.get(DASHBOARD)
    const outsiderDashboard = await outsider.get(DASHBOARD)

    expect(theirs.organisationId).toBe(EXAMPLE_ORGANISATION)
    expect(memberDashboard.result).toContain(theirs.journeyId)
    expect(outsiderDashboard.result).not.toContain(theirs.journeyId)
    for (const journeyId of journeyIds) {
      expect(memberDashboard.result).toContain(journeyId)
    }
  })

  it('Should not adopt a deleted example onto anyone', async () => {
    const client = await signedInClient(server, FIRST_ORGANISATION)

    const dashboard = await client.get(DASHBOARD)

    expect(dashboard.result).not.toContain(deleted.journeyId)
  })

  it('Should show every seeded reference on a session that never started them', async () => {
    const client = await signedInClient(server, FIRST_ORGANISATION)

    const dashboard = await client.get(DASHBOARD)

    expect(dashboard.statusCode).toBe(200)
    for (const journeyId of journeyIds) {
      expect(dashboard.result).toContain(journeyId)
    }
  })

  it('Should show the same seeded references to every signed-in user, whatever their organisation', async () => {
    const first = await signedInClient(server, FIRST_ORGANISATION)
    const second = await signedInClient(server, 'second-organisation')

    const firstDashboard = await first.get(DASHBOARD)
    const secondDashboard = await second.get(DASHBOARD)

    for (const journeyId of journeyIds) {
      expect(firstDashboard.result).toContain(journeyId)
      expect(secondDashboard.result).toContain(journeyId)
    }
  })

  it('Should not adopt the seeded references onto the seed’s own author identity', async () => {
    // The seeder itself is authenticated (see seed-set.js), so
    // without this guard its own requests would trip this same adoption
    // logic — and, via `ensureSeeded`, the lazy seed check it exists to
    // satisfy, recursively, forever.
    const client = await signedInClient(server, EXAMPLE_DATA_AUTHOR_ID)

    const dashboard = await client.get(DASHBOARD)

    expect(dashboard.statusCode).toBe(200)
    for (const journeyId of journeyIds) {
      expect(dashboard.result).not.toContain(journeyId)
    }
  })

  it('Should keep a session’s own notifications alongside the seeded ones', async () => {
    const client = await signedInClient(server, FIRST_ORGANISATION)
    await client.get(DASHBOARD)
    const started = await client.post(`${DASHBOARD}/notifications`, {})
    const [, ownJourneyId] =
      /\/notifications\/([^/]+)\//.exec(started.headers.location) ?? []

    const dashboard = await client.get(DASHBOARD)

    expect(ownJourneyId).toBeDefined()
    expect(dashboard.result).toContain(ownJourneyId)
    for (const journeyId of journeyIds) {
      expect(dashboard.result).toContain(journeyId)
    }
  })
})
