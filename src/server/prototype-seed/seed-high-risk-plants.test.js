import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer } from '../server.js'
import { AMEND, DRAFT, SUBMITTED } from '../app/engine/persistence/records.js'
import { records } from '../app/engine/persistence/records.js'
import { withSetContext } from '../app/shared/set-context.js'
import { seedHighRiskPlantsFor } from './seed-high-risk-plants.js'

describe('seedHighRiskPlantsFor', () => {
  let server
  let journeyIds

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    journeyIds = await seedHighRiskPlantsFor(server, 'test-org-1')
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it('Should seed one notification per scenario', () => {
    expect(journeyIds).toHaveLength(4)
    expect(new Set(journeyIds).size).toBe(journeyIds.length)
  })

  it('Should leave the dashboard with a mix of statuses, not only drafts', async () => {
    const listed = await withSetContext('high-risk-plants', () =>
      records.list({ journeyIds })
    )
    const statuses = listed.rows.map((row) => row.status)

    const DRAFT_COUNT = 2
    const SUBMITTED_COUNT = 1
    const AMEND_COUNT = 1
    expect(statuses.filter((status) => status === DRAFT)).toHaveLength(
      DRAFT_COUNT
    )
    expect(statuses.filter((status) => status === SUBMITTED)).toHaveLength(
      SUBMITTED_COUNT
    )
    expect(statuses.filter((status) => status === AMEND)).toHaveLength(
      AMEND_COUNT
    )
  })
})
