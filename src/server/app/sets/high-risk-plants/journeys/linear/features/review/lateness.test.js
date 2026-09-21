import { describe, expect, it } from 'vitest'
import { lateness } from './lateness.js'

const PLANTS_FOR_PLANTING = 'plants-for-planting'
const WOOD_AND_CUT_TREES = 'wood-and-cut-trees'

const date = (year, month, day) => ({
  year: String(year),
  month: String(month),
  day: String(day)
})

describe('calendar-day lateness in Great Britain', () => {
  it.each([
    ['potatoes', '2026-06-08T22:59:59Z', date(2026, 6, 10), 'on-time'],
    ['potatoes', '2026-06-08T23:00:00Z', date(2026, 6, 10), 'late'],
    ['potatoes', '2026-01-08T23:59:59Z', date(2026, 1, 10), 'on-time'],
    ['potatoes', '2026-01-09T00:00:00Z', date(2026, 1, 10), 'late'],
    ['potatoes', '2026-06-10T10:00:00Z', date(2026, 6, 9), 'late'],
    [PLANTS_FOR_PLANTING, '2026-06-14T22:59:59Z', date(2026, 6, 10), 'on-time'],
    [PLANTS_FOR_PLANTING, '2026-06-14T23:00:00Z', date(2026, 6, 10), 'late'],
    [WOOD_AND_CUT_TREES, '2026-06-14T22:59:59Z', date(2026, 6, 10), 'on-time'],
    [WOOD_AND_CUT_TREES, '2026-06-14T23:00:00Z', date(2026, 6, 10), 'late'],
    [WOOD_AND_CUT_TREES, '2026-06-01T10:00:00Z', date(2026, 6, 10), 'on-time'],
    [PLANTS_FOR_PLANTING, '2026-03-30T22:59:59Z', date(2026, 3, 26), 'on-time'],
    [PLANTS_FOR_PLANTING, '2026-03-30T23:00:00Z', date(2026, 3, 26), 'late'],
    [WOOD_AND_CUT_TREES, '2026-10-27T23:59:59Z', date(2026, 10, 23), 'on-time'],
    [WOOD_AND_CUT_TREES, '2026-10-28T00:00:00Z', date(2026, 10, 23), 'late'],
    [PLANTS_FOR_PLANTING, '2024-03-04T00:00:00Z', date(2024, 2, 29), 'on-time'],
    [PLANTS_FOR_PLANTING, '2024-03-05T00:00:00Z', date(2024, 2, 29), 'late'],
    ['potatoes', '2026-12-31T23:59:59Z', date(2027, 1, 2), 'on-time']
  ])(
    'Should classify %s at %s for %j as %s',
    (type, clock, arrival, expected) => {
      expect(lateness(new Date(clock), type, arrival)).toBe(expected)
    }
  )

  it.each([undefined, {}, date(2026, 2, 30)])(
    'Should not warn about a missing or invalid arrival date %j',
    (arrival) => {
      expect(
        lateness(new Date('2026-06-01T00:00:00Z'), 'potatoes', arrival)
      ).toBe('on-time')
    }
  )
})
