import { describe, expect, it } from 'vitest'

import {
  buildDashboardListQueryString,
  buildPageResultsRange,
  buildPageResultsRangeLabel,
  buildPaginationLinks,
  DEFAULT_NOTIFICATION_SORT,
  formatCommodity,
  formatDisplayDate,
  NOTIFICATION_SORT_OPTIONS,
  normalizePageNumber,
  parseNotificationSort
} from './notification-helper.js'

const CREATED_AT_ASCENDING_SORT = 'createdAt,asc'
const NO_RESULTS_LABEL = 'No Results'

const labels = {
  previous: 'Previous',
  next: 'Next',
  results: {
    none: NO_RESULTS_LABEL,
    one: 'Showing 1 Result',
    oneOf: (item, total) => `Showing ${item} of ${total} Results`,
    many: (start, end, total) =>
      `Showing ${start} to ${end} of ${total} Results`
  }
}

describe('#NOTIFICATION_SORT_OPTIONS', () => {
  it('Should carry sort values only, leaving every label to the copy pair', () => {
    expect(NOTIFICATION_SORT_OPTIONS).toEqual([
      'arrivalDate,desc',
      'arrivalDate,asc',
      'createdAt,desc',
      'createdAt,asc'
    ])
  })
})

describe('#parseNotificationSort', () => {
  it('Should keep a recognised sort value', () => {
    expect(parseNotificationSort(CREATED_AT_ASCENDING_SORT)).toBe(
      CREATED_AT_ASCENDING_SORT
    )
  })

  it('Should fall back to arrival newest-first for anything else', () => {
    expect(parseNotificationSort('reference,sideways')).toBe(
      DEFAULT_NOTIFICATION_SORT
    )
    expect(parseNotificationSort(undefined)).toBe(DEFAULT_NOTIFICATION_SORT)
  })
})

describe('#normalizePageNumber', () => {
  it('Should keep a page inside the available range', () => {
    expect(normalizePageNumber(2, 3)).toBe(2)
  })

  it('Should clamp a page beyond the last one', () => {
    expect(normalizePageNumber(9, 3)).toBe(3)
  })

  it('Should answer the first page for a non-integer, a zero or a negative', () => {
    expect(normalizePageNumber(Number.NaN)).toBe(1)
    expect(normalizePageNumber(0)).toBe(1)
    expect(normalizePageNumber(-4)).toBe(1)
  })

  it('Should answer the first page when there are no pages at all', () => {
    expect(normalizePageNumber(2, 0)).toBe(1)
  })
})

describe('#buildDashboardListQueryString', () => {
  it('Should answer an empty suffix for the default view', () => {
    expect(buildDashboardListQueryString()).toBe('')
  })

  it('Should carry only the values that differ from the default', () => {
    expect(
      buildDashboardListQueryString({
        page: 2,
        sort: CREATED_AT_ASCENDING_SORT,
        referenceNumber: '26-ABC123'
      })
    ).toBe('?page=2&sort=createdAt%2Casc&referenceNumber=26-ABC123')
  })

  it('Should omit the default sort and the first page', () => {
    expect(
      buildDashboardListQueryString({
        page: 1,
        sort: DEFAULT_NOTIFICATION_SORT,
        referenceNumber: '26-ABC123'
      })
    ).toBe('?referenceNumber=26-ABC123')
  })
})

describe('#buildPaginationLinks', () => {
  const pagination = (page, totalPages) => ({ page, totalPages })

  it('Should answer nothing while everything fits on one page', () => {
    expect(
      buildPaginationLinks(pagination(1, 1), '/', undefined, labels)
    ).toBeNull()
  })

  it('Should offer only next on the first page', () => {
    const links = buildPaginationLinks(pagination(1, 3), '/', undefined, labels)

    expect(links.previous).toBeUndefined()
    expect(links.next).toEqual({ href: '/?page=2', text: 'Next' })
  })

  it('Should offer only previous on the last page', () => {
    const links = buildPaginationLinks(pagination(3, 3), '/', undefined, labels)

    expect(links.next).toBeUndefined()
    expect(links.previous).toEqual({ href: '/?page=2', text: 'Previous' })
  })

  it('Should preserve the sort and the search term in both links', () => {
    const links = buildPaginationLinks(
      pagination(2, 3),
      '/',
      CREATED_AT_ASCENDING_SORT,
      labels,
      '26-ABC123'
    )

    expect(links.previous.href).toBe(
      '/?sort=createdAt%2Casc&referenceNumber=26-ABC123'
    )
    expect(links.next.href).toBe(
      '/?page=3&sort=createdAt%2Casc&referenceNumber=26-ABC123'
    )
  })
})

describe('#buildPageResultsRange', () => {
  it('Should answer an empty range when nothing matched', () => {
    expect(
      buildPageResultsRange({ page: 1, size: 20, totalElements: 0 })
    ).toEqual({ start: 0, end: 0, total: 0 })
  })

  it('Should offset the range by the page', () => {
    expect(
      buildPageResultsRange({ page: 2, size: 20, totalElements: 21 }, 1)
    ).toEqual({ start: 21, end: 21, total: 21 })
  })
})

describe('#buildPageResultsRangeLabel', () => {
  const pagination = (page, size, totalElements) => ({
    page,
    size,
    totalElements
  })

  it('Should answer the none label when nothing matched', () => {
    expect(
      buildPageResultsRangeLabel(pagination(1, 20, 0), 0, labels.results)
    ).toBe(NO_RESULTS_LABEL)
  })

  it('Should answer the none label when the page carries no displayable rows', () => {
    expect(
      buildPageResultsRangeLabel(pagination(1, 20, 1), 0, labels.results)
    ).toBe(NO_RESULTS_LABEL)
    expect(
      buildPageResultsRangeLabel(pagination(1, 20, 3), 0, labels.results)
    ).toBe(NO_RESULTS_LABEL)
  })

  it('Should answer the singular label for exactly one result', () => {
    expect(
      buildPageResultsRangeLabel(pagination(1, 20, 1), 1, labels.results)
    ).toBe('Showing 1 Result')
  })

  it('Should answer the one-of label for a single row on a later page', () => {
    expect(
      buildPageResultsRangeLabel(pagination(2, 20, 21), 1, labels.results)
    ).toBe('Showing 21 of 21 Results')
  })

  it('Should answer the range label for a full page', () => {
    expect(
      buildPageResultsRangeLabel(pagination(1, 20, 21), 20, labels.results)
    ).toBe('Showing 1 to 20 of 21 Results')
  })
})

describe('#formatDisplayDate', () => {
  it('Should format an ISO date for the list', () => {
    expect(formatDisplayDate('2026-03-05')).toBe('5 Mar 2026')
  })

  it('Should answer an empty string for a missing or unparseable value', () => {
    expect(formatDisplayDate(null)).toBe('')
    expect(formatDisplayDate('not-a-date')).toBe('')
  })
})

describe('#formatCommodity', () => {
  it('Should answer an empty string when the row carries no commodity', () => {
    expect(formatCommodity(null)).toBe('')
  })

  it('Should pass a plain string through', () => {
    expect(formatCommodity('Plants for planting')).toBe('Plants for planting')
  })

  it('Should read the first display value the commodity offers, in order', () => {
    expect(
      formatCommodity({
        name: 'Potatoes',
        text: 'Solanum tuberosum',
        category: 'Wood',
        genus: 'Solanum'
      })
    ).toBe('Potatoes')
    expect(
      formatCommodity({
        text: 'Wood and cut trees',
        category: 'Wood',
        genus: 'Quercus'
      })
    ).toBe('Wood and cut trees')
    expect(formatCommodity({ category: 'Wood', genus: 'Quercus' })).toBe('Wood')
    expect(formatCommodity({ genus: 'Solanum' })).toBe('Solanum')
  })

  it('Should answer an empty string when the commodity offers nothing to display', () => {
    expect(formatCommodity({})).toBe('')
  })
})
