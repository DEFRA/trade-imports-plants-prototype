import { AMEND, DRAFT, SUBMITTED } from '../../engine/persistence/records.js'

/** The statuses a dashboard row can have. Deleted rows never reach a list. */
export const STATUSES = Object.freeze([DRAFT, SUBMITTED, AMEND])

/**
 * The dashboard tabs a release gets unless it names its own, as
 * `{ tabId: [statuses] }`. An empty list means "every status".
 */
export const DEFAULT_TABS = Object.freeze({
  all: Object.freeze([]),
  drafts: Object.freeze([DRAFT]),
  submitted: Object.freeze([SUBMITTED]),
  amended: Object.freeze([AMEND])
})

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const asList = (value) => {
  if (value === undefined || value === null || value === '') {
    return []
  }
  return Array.isArray(value) ? value : [value]
}

const asBoolean = (value) => {
  if (value === true || value === 'true' || value === 'yes') {
    return true
  }
  if (value === false || value === 'false' || value === 'no') {
    return false
  }
  return null
}

const asIsoDate = (value) =>
  typeof value === 'string' && ISO_DATE.test(value) ? value : null

const asText = (value) =>
  typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null

/**
 * Filters in one checked shape. Anything unrecognised is dropped rather than
 * refused: a filter is a view, and a view never throws.
 *
 * @param {object} filters
 * @param {string|string[]} [filters.status] - one status or several.
 * @param {string} [filters.commodity] - text the commodity name contains.
 * @param {boolean|string} [filters.late] - only late (true) or only on time (false).
 * @param {string} [filters.dateFrom] - earliest arrival date, `YYYY-MM-DD`.
 * @param {string} [filters.dateTo] - latest arrival date, `YYYY-MM-DD`.
 * @param {string} [filters.tab] - a tab id from `tabs`.
 * @param {object} [tabs] - the tabs, as `DEFAULT_TABS` is shaped.
 * @returns {object} the normalised filters; a key is null when unused.
 */
export const normaliseFilters = (
  { status, commodity, late, dateFrom, dateTo, tab } = {},
  tabs = DEFAULT_TABS
) => {
  const statuses = asList(status).filter((value) => STATUSES.includes(value))
  const tabStatuses =
    typeof tab === 'string' && Object.hasOwn(tabs, tab) ? tabs[tab] : []
  return {
    statuses: statuses.length > 0 ? statuses : null,
    tabStatuses: tabStatuses.length > 0 ? [...tabStatuses] : null,
    commodity: asText(commodity),
    late: asBoolean(late),
    dateFrom: asIsoDate(dateFrom),
    dateTo: asIsoDate(dateTo)
  }
}

/** Whether any filter is in use. */
export const hasFilters = (filters) =>
  Object.values(filters).some((value) => value !== null)

const inStatuses = (statuses, row) => !statuses || statuses.includes(row.status)

const inDateRange = ({ dateFrom, dateTo }, row) => {
  if (!dateFrom && !dateTo) {
    return true
  }
  if (!row.arrivalDate) {
    return false
  }
  return (
    (!dateFrom || row.arrivalDate >= dateFrom) &&
    (!dateTo || row.arrivalDate <= dateTo)
  )
}

/**
 * Whether one dashboard row passes every filter in use.
 *
 * @param {object} filters - as `normaliseFilters` returns them.
 * @param {object} row - a list row, as the records store's `list()` returns it.
 * @returns {boolean} true when the row should be shown.
 */
export const matchesFilters = (filters, row) =>
  inStatuses(filters.statuses, row) &&
  inStatuses(filters.tabStatuses, row) &&
  (!filters.commodity ||
    (row.commodity?.name ?? '').toLowerCase().includes(filters.commodity)) &&
  (filters.late === null ||
    Boolean(row.lateNotificationIndicator) === filters.late) &&
  inDateRange(filters, row)

/**
 * The tab to open. The tab in the address when there is one; otherwise the
 * first tab with a row that passes the status filter, so ticking "Submitted"
 * while the Drafts tab was open never lands on an empty tab while another tab
 * has matches. The dashboard's filter form sends no tab for this reason.
 *
 * @param {{ tab?: string, status?: string[] }} values - `values` from
 * `filtersFromQuery`.
 * @param {{ byStatus: object }} counts - from `countKnown`.
 * @param {object} [tabs] - the tabs, as `DEFAULT_TABS` is shaped.
 * @returns {string} a tab id.
 */
export const openTabFor = (values, counts, tabs = DEFAULT_TABS) => {
  const { tab, status = [] } = values ?? {}
  const ids = Object.keys(tabs)
  if (typeof tab === 'string' && Object.hasOwn(tabs, tab)) {
    return tab
  }
  const chosen = status.length > 0 ? status : STATUSES
  const rowsIn = (id) => {
    const statuses = tabs[id].length > 0 ? tabs[id] : STATUSES
    return statuses
      .filter((value) => chosen.includes(value))
      .reduce((sum, value) => sum + (counts?.byStatus?.[value] ?? 0), 0)
  }
  return ids.find((id) => rowsIn(id) > 0) ?? ids[0]
}

/**
 * Counts for a dashboard: in total, by status, late, and per tab.
 *
 * @param {Array<object>} rows - the rows to count, already filtered by
 * everything except status and tab.
 * @param {object} [tabs] - the tabs to count, as `DEFAULT_TABS` is shaped.
 * @returns {{total: number, byStatus: object, late: number, byTab: object}}
 * the counts.
 */
export const countRows = (rows, tabs = DEFAULT_TABS) => {
  const countIn = (statuses) =>
    rows.filter((row) => inStatuses(statuses, row)).length
  return {
    total: rows.length,
    byStatus: Object.fromEntries(
      STATUSES.map((status) => [status, countIn([status])])
    ),
    late: rows.filter((row) => Boolean(row.lateNotificationIndicator)).length,
    byTab: Object.fromEntries(
      Object.entries(tabs).map(([tabId, statuses]) => [
        tabId,
        countIn(statuses.length > 0 ? statuses : null)
      ])
    )
  }
}
