import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServer } from '../server.js'
import { records } from '../app/engine/persistence/records.js'
import { withSetContext } from '../app/shared/set-context.js'
import { createSeedClient } from './http-client.js'
import {
  ensureSeeded,
  exampleHref,
  findExample,
  listExamples,
  resetSet
} from './index.js'
import { clearSeeded, seededIdsFor } from './registry.js'

const SET_ID = 'high-risk-plants'
const DASHBOARD = `/${SET_ID}`
const ORGANISATION = 'first-organisation'
// The high-risk-plants examples every session sees: all but the deleted one and
// the one made for another organisation (scenarios/high-risk-plants.js).
const SHARED_EXAMPLES = 7

const signedInClient = async (server, organisationId) => {
  const client = createSeedClient(server)
  await client.get(`/auth/stub-sign-in?organisationId=${organisationId}`)
  return client
}

describe('seeding a set on its first visit', () => {
  let server

  // Every test here wants seeding on bar the one proving
  // `PROTOTYPE_SEED=false`, which sets it back off itself; this is belt and
  // braces against a stray override leaking in from another test file.
  beforeEach(() => {
    delete process.env.PROTOTYPE_SEED
  })

  afterEach(async () => {
    await server?.stop({ timeout: 0 })
    delete process.env.PROTOTYPE_SEED
    clearSeeded(SET_ID)
  })

  it('Should seed nothing once the server has started but no set request has come in', async () => {
    server = await createServer()
    await server.initialize()

    expect(seededIdsFor(SET_ID)).toEqual([])
  })

  it('Should seed the shared example notifications on the first signed-in request, and show them in that same response', async () => {
    server = await createServer()
    await server.initialize()
    const client = await signedInClient(server, ORGANISATION)

    const dashboard = await client.get(DASHBOARD)

    const journeyIds = seededIdsFor(SET_ID)
    expect(dashboard.statusCode).toBe(200)
    expect(journeyIds).toHaveLength(SHARED_EXAMPLES)
    for (const journeyId of journeyIds) {
      expect(dashboard.result).toContain(journeyId)
    }
  })

  it('Should seed nothing when PROTOTYPE_SEED is false', async () => {
    process.env.PROTOTYPE_SEED = 'false'
    server = await createServer()
    await server.initialize()
    const client = await signedInClient(server, ORGANISATION)

    const dashboard = await client.get(DASHBOARD)

    expect(dashboard.statusCode).toBe(200)
    expect(seededIdsFor(SET_ID)).toEqual([])
  })

  it('Should re-seed a set that is reset', async () => {
    server = await createServer()
    await server.initialize()
    const client = await signedInClient(server, ORGANISATION)
    await client.get(DASHBOARD)
    const seededBeforeReset = seededIdsFor(SET_ID)

    await resetSet(server, SET_ID)

    const seededAfterReset = seededIdsFor(SET_ID)
    expect(seededAfterReset).toHaveLength(SHARED_EXAMPLES)
    expect(seededAfterReset).not.toEqual(seededBeforeReset)
    const listed = await withSetContext(SET_ID, () =>
      records.list({ journeyIds: seededAfterReset })
    )
    expect(listed.rows).toHaveLength(seededAfterReset.length)
  })

  it('Should keep each example’s slug across a reset, pointing at its new notification', async () => {
    server = await createServer()
    await server.initialize()
    const before = await exampleHref(server, SET_ID, 'submitted')

    await resetSet(server, SET_ID)

    const after = findExample(SET_ID, 'submitted')
    expect(before).toMatch(/\/confirmation$/)
    expect(after.href).toMatch(/\/confirmation$/)
    expect(after.href).not.toBe(before)
    expect(seededIdsFor(SET_ID)).toContain(after.journeyId)
  })

  it('Should seed on the first example link after a restart', async () => {
    server = await createServer()
    await server.initialize()

    const href = await exampleHref(server, SET_ID, 'draft-midway')

    expect(href).toBe(
      `${DASHBOARD}/notifications/${findExample(SET_ID, 'draft-midway').journeyId}/destinations/select`
    )
    expect(await exampleHref(server, SET_ID, 'no-such-example')).toBeUndefined()
  })

  it('Should list the examples before seeding, then with where each one stopped', async () => {
    server = await createServer()
    await server.initialize()
    const unseeded = listExamples(SET_ID)

    await ensureSeeded(server, SET_ID)

    const seeded = listExamples(SET_ID)
    expect(unseeded[0]).toEqual({
      slug: 'draft-just-started',
      label: 'Draft, just started',
      status: 'draft',
      organisationId: null,
      through: 'commodities/details'
    })
    expect(seeded[0]).toMatchObject({
      slug: 'draft-just-started',
      stopAt: 'commodities/details',
      href: expect.stringContaining('/commodities/details')
    })
    expect(listExamples('sample-journey')).toEqual([])
  })
})
