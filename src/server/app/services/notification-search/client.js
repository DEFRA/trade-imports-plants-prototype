import { getTraceId } from '@defra/hapi-tracing'

import { organisationIdOf } from '../../../common/helpers/organisation-id.js'
import { BackendRequestError } from '../persistence/records/errors.js'
import { mapStatus } from '../persistence/records/real/status.js'
import { countRows, DEFAULT_TABS, STATUSES } from './filters.js'

/** The proposed real client: the plants backend's notification list, asked
 * to filter and count on the server. The backend does not take these
 * filters yet: see `contract.json`. */

const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'
const DEFAULT_SORT = 'arrivalDate,desc'

const backendUrl =
  process.env.TRADE_IMPORTS_PLANTS_BACKEND_URL ?? 'http://localhost:8091'

const tracingHeader = process.env.TRACING_HEADER ?? 'x-cdp-request-id'

const EMPTY_LIST = Object.freeze({
  rows: [],
  page: 1,
  size: 0,
  totalElements: 0,
  totalPages: 0
})

const headers = (orgId) => ({
  'Content-Type': 'application/json',
  [ORGANISATION_ID_HEADER]: orgId,
  [tracingHeader]: getTraceId() ?? ''
})

/** The statuses asked for and the open tab's statuses, as the backend
 * writes them. */
const statusesOf = ({ status, tab, tabs = DEFAULT_TABS }) => {
  const tabStatuses = tab && Object.hasOwn(tabs, tab) ? tabs[tab] : []
  return [...new Set([status ?? [], tabStatuses].flat())]
    .filter((value) => STATUSES.includes(value))
    .map((value) => value.toUpperCase())
}

const LATE_VALUES = Object.freeze({
  true: 'true',
  yes: 'true',
  false: 'false',
  no: 'false'
})

/** The filters as query parameters. A repeated `status`; `late` as
 * `true`/`false`; arrival dates as `arrivalFrom`/`arrivalTo`. */
const filterParams = (url, options) => {
  for (const value of statusesOf(options)) {
    url.searchParams.append('status', value)
  }
  const single = {
    commodity: options.commodity,
    late: LATE_VALUES[String(options.late)],
    arrivalFrom: options.dateFrom,
    arrivalTo: options.dateTo
  }
  for (const [name, value] of Object.entries(single)) {
    if (value) {
      url.searchParams.set(name, value)
    }
  }
}

/**
 * One notification from the backend's list, as the dashboard's row. The
 * same fields the real records client reads, taking party names as the
 * backend stores them.
 *
 * @param {object} notification - one item of the list's `content`.
 * @returns {object} the dashboard row.
 */
export const toRecord = (notification) => {
  const status = mapStatus(notification.status)
  return {
    journeyId: notification.referenceNumber,
    status,
    createdAt: notification.created ?? null,
    submittedAt: notification.submittedAt ?? null,
    concurrencyToken: notification.concurrencyToken ?? null,
    reference: notification.referenceNumber,
    commodity: notification.commodity ?? null,
    originCountryCode: notification.origin?.countryCode ?? null,
    arrivalDate: notification.transport?.arrivalDate ?? null,
    lateNotificationIndicator: Boolean(notification.lateNotificationIndicator),
    consignorName: notification.consignor?.name ?? null,
    consigneeName: notification.consignee?.name ?? null
  }
}

const fetchJson = async (url, orgId, action) => {
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: headers(orgId)
  })
  if (!response.ok) {
    throw new BackendRequestError(action, response)
  }
  return response.json()
}

export const searchNotifications = async (request, options = {}) => {
  const orgId = organisationIdOf(request)
  if (!orgId) {
    return { ...EMPTY_LIST }
  }
  const { page = 1, sort = DEFAULT_SORT, referenceNumber } = options
  const url = new URL(`${backendUrl}/notifications`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('sort', sort)
  if (referenceNumber) {
    url.searchParams.set('referenceNumber', referenceNumber)
  }
  filterParams(url, options)
  const body = await fetchJson(url, orgId, 'search notifications')
  return {
    rows: body.content.map(toRecord),
    page: body.page,
    size: body.size,
    totalElements: body.totalElements,
    totalPages: body.totalPages
  }
}

export const countNotifications = async (request, options = {}) => {
  const tabs = options.tabs ?? DEFAULT_TABS
  const orgId = organisationIdOf(request)
  if (!orgId) {
    return countRows([], tabs)
  }
  const url = new URL(`${backendUrl}/notifications/counts`)
  if (options.referenceNumber) {
    url.searchParams.set('referenceNumber', options.referenceNumber)
  }
  filterParams(url, { ...options, status: null, tab: null })
  const body = await fetchJson(url, orgId, 'count notifications')
  const byStatus = Object.fromEntries(
    STATUSES.map((status) => [
      status,
      body.byStatus?.[status.toUpperCase()] ?? 0
    ])
  )
  const inStatuses = (statuses) =>
    (statuses.length > 0 ? statuses : STATUSES).reduce(
      (sum, status) => sum + byStatus[status],
      0
    )
  return {
    total: body.total ?? 0,
    byStatus,
    late: body.late ?? 0,
    byTab: Object.fromEntries(
      Object.entries(tabs).map(([tabId, statuses]) => [
        tabId,
        inStatuses(statuses)
      ])
    )
  }
}
