import { isStubDataMode } from '../../../common/services/mode.js'
import * as client from './client.js'
import * as stub from './stub.js'

export { DEFAULT_TABS, STATUSES, openTabFor } from './filters.js'
export { FILTER_ERRORS, filtersFromQuery } from './query.js'

const impl = () => (isStubDataMode() ? stub : client)

/**
 * One page of the dashboard's notifications, with filters. A drop-in for the
 * engine's `listKnownJourneys(request, { page, sort, referenceNumber })` that
 * also takes the filters `filtersFromQuery` reads: `status`, `commodity`,
 * `late`, `dateFrom`, `dateTo` and `tab`.
 *
 * @param {object} request - the Hapi request.
 * @param {object} [options] - `page`, `sort`, `referenceNumber`, filters and
 * an optional `tabs`.
 * @returns {Promise<object>} `{ rows, page, size, totalElements, totalPages }`.
 */
export const searchNotifications = (request, options) =>
  impl().searchNotifications(request, options)

/**
 * Counts for the dashboard's tabs and filter panel. Every filter in use
 * counts except `status` and `tab`, so each tab shows its own number.
 *
 * @param {object} request - the Hapi request.
 * @param {object} [options] - as for `searchNotifications`.
 * @returns {Promise<{total: number, byStatus: object, late: number, byTab: object}>}
 * the counts.
 */
export const countNotifications = (request, options) =>
  impl().countNotifications(request, options)
