import { describe, expect, it } from 'vitest'

import { arrivalBounds } from './arrival-bounds.js'

// Mid-afternoon on a British Summer Time day: 15:30 in London is 14:30 UTC, so
// a helper that read the wrong zone would still name the same day here.
const SUMMER_AFTERNOON = new Date('2026-06-15T14:30:00Z')
// 23:30 UTC on a BST day is 00:30 the NEXT day in London — the case that
// separates a London read from a UTC one.
const SUMMER_LATE_EVENING = new Date('2026-06-15T23:30:00Z')

describe('#arrivalBounds', () => {
  it('Should leave a consignment that has not arrived unbounded', () => {
    expect(arrivalBounds(false, SUMMER_AFTERNOON)).toEqual({})
  })

  it('Should cap an arrived consignment at today', () => {
    // The two sides take the bound in different shapes and mixing them fails
    // quietly, so both come from this one call.
    const { max, maxText } = arrivalBounds(true, SUMMER_AFTERNOON)

    expect(max).toEqual(new Date(Date.UTC(2026, 5, 15)))
    expect(maxText).toBe('15/6/2026')
  })

  it('Should read the calendar day in London, not in UTC', () => {
    const { max, maxText } = arrivalBounds(true, SUMMER_LATE_EVENING)

    expect(max).toEqual(new Date(Date.UTC(2026, 5, 16)))
    expect(maxText).toBe('16/6/2026')
  })
})
