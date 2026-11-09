import { isValid, parseISO } from 'date-fns'
import {
  formatCalendarDate,
  formatMomentAsDay
} from '../../../../../../lib/validate/index.js'

export const DEFAULT_NOTIFICATION_SORT = 'arrivalDate,desc'

/** Sort values only. The label for each one is copy, so it lives in the
 * feature's copy pair and is paired back with these in view-model/sort-options.js. */
export const NOTIFICATION_SORT_OPTIONS = [
  'arrivalDate,desc',
  'arrivalDate,asc',
  'createdAt,desc',
  'createdAt,asc'
]

/** The delimiters date-fns accepts between the date and the time. */
const TIME_DELIMITER = /[T ]/

/** A trailing `Z`, `+01`, `+0100` or `+01:00` on the time part. */
const ZONE_DESIGNATOR = /(?:Z|[+-]\d\d(?::?\d\d)?)$/

/**
 * Labels an ISO string that carries no zone as UTC, so it parses to the value
 * the wire meant rather than to one read off the container's clock. An arrival
 * date arrives date-only, as `2026-07-21`, and parses to a `Date` whose UTC
 * components are that day — what the calendar renderer reads.
 * @param {string} value
 * @returns {string} The value with an explicit UTC designator.
 */
const asUtcInstant = (value) => {
  const [, time] = value.split(TIME_DELIMITER)

  if (time === undefined) {
    return `${value}T00:00:00Z`
  }

  return ZONE_DESIGNATOR.test(time) ? value : `${value}Z`
}

const displayDate = (value, formatter) => {
  if (!value) {
    return ''
  }

  const date = typeof value === 'string' ? parseISO(asUtcInstant(value)) : value
  return isValid(date) ? formatter(date) : ''
}

/**
 * A day the user chose — an arrival date. Rendered from its own UTC
 * components, because the value already is the day.
 * @param {string|Date} value
 */
export const formatDisplayCalendarDate = (value) =>
  displayDate(value, formatCalendarDate)

/**
 * A moment that happened — created, submitted. Rendered as the day it
 * happened in the service's zone, not the container's ambient `TZ`.
 * @param {string|Date} value
 */
export const formatDisplayMoment = (value) =>
  displayDate(value, formatMomentAsDay)

const commodityDisplayValue = (commodity) =>
  commodity.name ?? commodity.text ?? commodity.category ?? commodity.genus

export const formatCommodity = (commodity) => {
  if (!commodity) {
    return ''
  }

  if (typeof commodity === 'string') {
    return commodity
  }

  const displayValue = commodityDisplayValue(commodity)
  return displayValue ? String(displayValue) : ''
}

export const normalizePageNumber = (
  page,
  totalPages = Number.MAX_SAFE_INTEGER
) => {
  if (!Number.isInteger(page) || page < 1 || totalPages <= 0) {
    return 1
  }
  return Math.min(page, totalPages)
}

export const parseNotificationSort = (sortQuery) =>
  NOTIFICATION_SORT_OPTIONS.includes(sortQuery)
    ? sortQuery
    : DEFAULT_NOTIFICATION_SORT

export const buildDashboardListQueryString = ({
  page = 1,
  sort = DEFAULT_NOTIFICATION_SORT,
  referenceNumber
} = {}) => {
  const params = new URLSearchParams()

  if (page > 1) {
    params.set('page', String(page))
  }
  if (sort && sort !== DEFAULT_NOTIFICATION_SORT) {
    params.set('sort', sort)
  }
  if (referenceNumber) {
    params.set('referenceNumber', referenceNumber)
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

export const buildPaginationLinks = (
  pagination,
  baseUrl,
  sort = DEFAULT_NOTIFICATION_SORT,
  labels = {},
  referenceNumber = ''
) => {
  const { totalPages } = pagination
  const page = normalizePageNumber(pagination.page, totalPages)

  if (totalPages <= 1) {
    return null
  }

  const pageLink = (targetPage, text) => ({
    href: `${baseUrl}${buildDashboardListQueryString({
      page: targetPage,
      sort,
      referenceNumber
    })}`,
    text
  })

  return {
    previous: page > 1 ? pageLink(page - 1, labels.previous) : undefined,
    next: page < totalPages ? pageLink(page + 1, labels.next) : undefined
  }
}

export const buildPageResultsRange = (
  { page = 1, size, totalElements = 0 } = {},
  itemCount = 0
) => {
  if (totalElements === 0 || itemCount === 0) {
    return { start: 0, end: 0, total: totalElements }
  }

  const pageSize = size ?? itemCount
  const start = (page - 1) * pageSize + 1
  return {
    start,
    end: Math.min(start + itemCount - 1, totalElements),
    total: totalElements
  }
}

export const buildPageResultsRangeLabel = (pagination, itemCount, labels) => {
  const range = buildPageResultsRange(pagination, itemCount)
  if (range.end === 0) {
    return labels.none
  }
  if (range.total === 1) {
    return labels.one
  }
  if (range.start === range.end) {
    return labels.oneOf(range.start, range.total)
  }
  return labels.many(range.start, range.end, range.total)
}
