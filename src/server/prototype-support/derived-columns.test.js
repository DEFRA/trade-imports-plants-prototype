import { beforeAll, describe, expect, it } from 'vitest'

import { configureObligationSet } from '../app/model/obligations/manifest.js'
import { records as stubRecords } from '../app/services/persistence/records/stub/index.js'
import * as realJourneyObligations from '../app/sets/high-risk-plants/obligations/index.js'
import { withSetContext } from '../app/shared/set-context.js'
import {
  commodityTypeName,
  fillFromAnswers,
  isoFromDateParts,
  withDerivedColumns
} from './derived-columns.js'

const REAL_JOURNEY = 'high-risk-plants'
const COMMODITY_TYPE = '9f2c4b71-3e58-4a6d-9c02-71d8f5a3e6b4'
const ARRIVAL_DATE = '63e22d64-b9a0-40b4-aec6-0f5f48bdd556'

describe('derived dashboard columns', () => {
  beforeAll(() => {
    // What the real journey's gateway does when the server starts.
    configureObligationSet(REAL_JOURNEY, realJourneyObligations)
  })

  it('Should name a commodity type in sentence case', () => {
    expect(commodityTypeName('wood-and-cut-trees')).toBe('Wood and cut trees')
    expect(commodityTypeName('')).toBeNull()
    expect(commodityTypeName(undefined)).toBeNull()
  })

  it('Should write date parts as an ISO date', () => {
    expect(isoFromDateParts({ day: 3, month: 10, year: 2026 })).toBe(
      '2026-10-03'
    )
    expect(isoFromDateParts({ day: 3 })).toBeNull()
  })

  it('Should fill only the columns a row lacks', () => {
    expect(
      fillFromAnswers(
        { journeyId: 'a', commodity: { name: 'Rosa' }, arrivalDate: null },
        {
          commodityType: 'potatoes',
          arrivalDate: { day: 1, month: 2, year: 2027 }
        }
      )
    ).toEqual({
      journeyId: 'a',
      commodity: { name: 'Rosa' },
      arrivalDate: '2027-02-01'
    })
  })

  it('Should read the answers the plants pages save, through the real journey’s obligations', async () => {
    const row = await withSetContext(REAL_JOURNEY, async () => {
      const { journeyId } = await stubRecords.create()
      await stubRecords.replaceFulfilment(journeyId, {
        [COMMODITY_TYPE]: 'potatoes',
        [ARRIVAL_DATE]: { day: 3, month: 10, year: 2026 }
      })
      const listed = await stubRecords.list({ journeyIds: [journeyId] })
      const [filled] = await withDerivedColumns(stubRecords, listed.rows)
      return { before: listed.rows[0], after: filled }
    })

    expect(row.before).toMatchObject({ commodity: null, arrivalDate: null })
    expect(row.after).toMatchObject({
      commodity: { name: 'Potatoes' },
      arrivalDate: '2026-10-03'
    })
  })
})
