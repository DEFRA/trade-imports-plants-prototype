import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer } from '../server.js'
import {
  AMEND,
  DRAFT,
  records,
  SUBMITTED
} from '../app/engine/persistence/records.js'
import { withSetContext } from '../app/shared/set-context.js'
import { seedHighRiskPlants } from './seed-high-risk-plants.js'

describe('seedHighRiskPlants', () => {
  let server
  let journeyIds

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    journeyIds = await seedHighRiskPlants(server)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it('Should answer with the reference numbers every session is told about: shared and not deleted', () => {
    const SHARED_AND_LISTED = 7
    expect(journeyIds).toHaveLength(SHARED_AND_LISTED)
    expect(new Set(journeyIds).size).toBe(journeyIds.length)
  })

  it('Should leave the dashboard with a mix of statuses, not only drafts', async () => {
    const listed = await withSetContext('high-risk-plants', () =>
      records.list({ journeyIds })
    )
    const statuses = listed.rows.map((row) => row.status)

    expect(listed.rows).toHaveLength(journeyIds.length)
    expect(statuses).toContain(DRAFT)
    expect(statuses).toContain(SUBMITTED)
    expect(statuses).toContain(AMEND)
    expect(listed.rows.some((row) => row.lateNotificationIndicator)).toBe(true)
  })
})
