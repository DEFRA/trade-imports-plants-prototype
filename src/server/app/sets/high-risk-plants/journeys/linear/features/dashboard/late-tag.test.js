import { describe, expect, it } from 'vitest'
import { records } from '../../../../../../engine/persistence/records.js'
import { store } from '../../../../../../engine/store.js'
import {
  COMPLETE_NOTIFICATION,
  useStubbedHighRiskPlantsJourney
} from '../../test-support.js'
import { toRow } from './view-model/row/index.js'

describe('dashboard late tag', () => {
  useStubbedHighRiskPlantsJourney()

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
