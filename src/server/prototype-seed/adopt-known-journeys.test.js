import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer } from '../server.js'
import { createSeedClient } from './http-client.js'
import { seedHighRiskPlantsFor } from './seed-high-risk-plants.js'
import { recordSeeded } from './registry.js'

const ORGANISATION_ID = 'test-org-1'

describe('adopting seeded journeys onto a fresh session', () => {
  let server
  let journeyIds

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    journeyIds = await seedHighRiskPlantsFor(server, ORGANISATION_ID)
    recordSeeded('high-risk-plants', ORGANISATION_ID, journeyIds)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it('Should show every seeded reference on a browser session that never started them', async () => {
    const client = createSeedClient(server)
    await client.get(`/auth/stub-sign-in?organisationId=${ORGANISATION_ID}`)

    const dashboard = await client.get('/high-risk-plants')

    expect(dashboard.statusCode).toBe(200)
    for (const journeyId of journeyIds) {
      expect(dashboard.result).toContain(journeyId)
    }
  })

  it('Should show nothing seeded to an organisation nothing was seeded for', async () => {
    const client = createSeedClient(server)
    await client.get(
      '/auth/stub-sign-in?organisationId=an-organisation-with-no-seed-data'
    )

    const dashboard = await client.get('/high-risk-plants')

    expect(dashboard.statusCode).toBe(200)
    for (const journeyId of journeyIds) {
      expect(dashboard.result).not.toContain(journeyId)
    }
  })
})
