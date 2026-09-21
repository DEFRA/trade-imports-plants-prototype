import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  configureRecords,
  records
} from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { store } from '../../../../../../engine/store.js'
import {
  COMPLETE_NOTIFICATION,
  installHighRiskPlantsJourney
} from '../../test-support.js'
import { toRow } from './view-model/row/index.js'

// The Late tag beside the card's status tag reads the stored
// lateNotificationIndicator straight off the marshalled row (c-030/c-035). The
// stored value is the string 'late' or 'on-time' — both truthy — so the marshal
// has to narrow it before the row's `Boolean(...)` sees it.
describe('dashboard late tag', () => {
  beforeAll(() => {
    installHighRiskPlantsJourney()
    configureRecords(recordsStub)
    configureSession(sessionStub)
  })
  beforeEach(() => store.clear())

  it.each([
    { indicator: 'late', late: true },
    { indicator: 'on-time', late: false }
  ])(
    'Should mark a $indicator notification late: $late',
    async ({ indicator, late }) => {
      const { journeyId } = await store.create()
      await store.seedAnswers(journeyId, {
        ...COMPLETE_NOTIFICATION,
        lateNotificationIndicator: indicator
      })
      await store.submit(journeyId)

      const { rows } = await records.list({ journeyIds: [journeyId] })

      expect((await toRow(rows[0])).late).toBe(late)
    }
  )
})
