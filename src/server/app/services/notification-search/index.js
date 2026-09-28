import { isStubDataMode } from '../../../common/services/mode.js'
import * as client from './client.js'
import * as stub from './stub.js'

/**
 * Prototype-owned service: search the dashboard's notifications with
 * filters, tabs and counts.
 *
 * Built in the real services' shape (`index.js` picks `stub.js` or
 * `client.js`), so a developer can copy `index.js`, `client.js`, `query.js`
 * and `filters.js` into plants-frontend unchanged. `stub.js` is the only file
 * that uses the prototype's own plumbing.
 */

export { DEFAULT_TABS, STATUSES, openTabFor } from './filters.js'
export { FILTER_ERRORS, filtersFromQuery } from './query.js'

export const NEEDS_A_REAL_SERVICE =
  'A notification search for the dashboard: the plants backend lists notifications by page only, so it needs to filter them by status, commodity, lateness and arrival date, and to count them by status for the tabs.'

const SAME_AS_SEARCH = 'as for searchNotifications'

export const CONTRACT = Object.freeze({
  service: 'notification-search',
  owner: 'plants-backend',
  baseUrlEnv: 'TRADE_IMPORTS_PLANTS_BACKEND_URL',
  operations: [
    {
      name: 'searchNotifications',
      method: 'GET',
      path: '/notifications',
      params: {
        page: 'number, from 1',
        sort: 'text, for example arrivalDate,desc',
        referenceNumber: 'text, optional',
        status: 'DRAFT, SUBMITTED or AMEND; repeat for several',
        commodity: 'text the commodity name contains',
        late: 'true or false',
        arrivalFrom: 'YYYY-MM-DD',
        arrivalTo: 'YYYY-MM-DD'
      },
      returns:
        '{ content: [notification], page, size, totalElements, totalPages }, scoped to the organisation in the Trade-Imports-Organisation-Id header',
      errors: ['400 when a filter is not valid, for example a date']
    },
    {
      name: 'countNotifications',
      method: 'GET',
      path: '/notifications/counts',
      params: {
        referenceNumber: 'text, optional',
        commodity: SAME_AS_SEARCH,
        late: SAME_AS_SEARCH,
        arrivalFrom: SAME_AS_SEARCH,
        arrivalTo: SAME_AS_SEARCH
      },
      returns:
        '{ total, byStatus: { DRAFT, SUBMITTED, AMEND }, late }, counting every notification that passes the filters',
      errors: ['400 when a filter is not valid']
    }
  ],
  record: {
    fields: [
      { name: 'referenceNumber', type: 'string', required: true },
      {
        name: 'status',
        type: 'string',
        required: true,
        enum: ['DRAFT', 'SUBMITTED', 'AMEND']
      },
      { name: 'commodity', type: '{ name: string }', required: false },
      {
        name: 'transport.arrivalDate',
        type: 'string (YYYY-MM-DD)',
        required: false
      },
      { name: 'lateNotificationIndicator', type: 'boolean', required: false },
      { name: 'consignor.name', type: 'string', required: false },
      { name: 'consignee.name', type: 'string', required: false }
    ]
  },
  examples: [
    {
      request:
        'GET /notifications?page=1&sort=arrivalDate,desc&status=SUBMITTED&late=true',
      response: {
        content: [
          {
            referenceNumber: 'GBN-HRP-26-000123',
            status: 'SUBMITTED',
            commodity: { name: 'Rosa canina' },
            transport: { arrivalDate: '2026-10-05' },
            lateNotificationIndicator: true
          }
        ],
        page: 1,
        size: 20,
        totalElements: 1,
        totalPages: 1
      }
    },
    {
      request: 'GET /notifications/counts?commodity=rosa',
      response: {
        total: 3,
        byStatus: { DRAFT: 1, SUBMITTED: 1, AMEND: 1 },
        late: 1
      }
    }
  ],
  openQuestions: [
    'Should the backend work out lateness, or keep the flag the frontend sends?',
    'The real list rows leave Commodity and Arrival empty today, because the list reads fields the plants pages never save. Which fields should the backend read?',
    'Are tabs a frontend idea only, or should the backend know them?'
  ]
})

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
