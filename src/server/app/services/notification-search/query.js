import { DEFAULT_TABS, STATUSES } from './filters.js'

const YEAR_DIGITS = 4
const MONTH_DIGITS = 2
const LAST_MONTH = 12
const WHOLE_NUMBER = /^\d+$/

/** Error codes `filtersFromQuery` can report. The words a user sees belong in
 * the release's dashboard copy, keyed by these codes. */
export const FILTER_ERRORS = Object.freeze({
  INVALID_DATE: 'invalid',
  TO_BEFORE_FROM: 'beforeFrom'
})

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '')

const pad = (value, digits) => value.padStart(digits, '0')

/** The day, month and year a govukDateInput with `namePrefix: name` sends,
 * or the parts of an ISO date sent as `name` itself. */
const dateParts = (query, name) => {
  const iso = trimmed(query[name])
  if (iso) {
    const [year = '', month = '', day = ''] = iso.split('-')
    return { day, month, year }
  }
  return {
    day: trimmed(query[`${name}-day`]),
    month: trimmed(query[`${name}-month`]),
    year: trimmed(query[`${name}-year`])
  }
}

const isBlank = ({ day, month, year }) => !day && !month && !year

/** `YYYY-MM-DD` for real calendar dates only; null otherwise. */
const isoFrom = ({ day, month, year }) => {
  if (![day, month, year].every((part) => WHOLE_NUMBER.test(part))) {
    return null
  }
  if (year.length !== YEAR_DIGITS) {
    return null
  }
  const [dayNumber, monthNumber, yearNumber] = [day, month, year].map(Number)
  const date = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber))
  const real =
    monthNumber >= 1 &&
    monthNumber <= LAST_MONTH &&
    date.getUTCDate() === dayNumber &&
    date.getUTCMonth() === monthNumber - 1
  return real
    ? `${year}-${pad(month, MONTH_DIGITS)}-${pad(day, MONTH_DIGITS)}`
    : null
}

const readDate = (query, name, errors) => {
  const parts = dateParts(query, name)
  if (isBlank(parts)) {
    return { parts, iso: null }
  }
  const iso = isoFrom(parts)
  if (!iso) {
    errors[name] = FILTER_ERRORS.INVALID_DATE
  }
  return { parts, iso }
}

const readLate = (value) => {
  const text = trimmed(Array.isArray(value) ? value[0] : value)
  return text === 'yes' || text === 'no' ? text : ''
}

const readStatuses = (value) =>
  [value]
    .flat()
    .map(trimmed)
    .filter((status) => STATUSES.includes(status))

const readTab = (value, tabs) =>
  Object.hasOwn(tabs, trimmed(value)) ? trimmed(value) : ''

/** Both arrival dates. A "to" date before the "from" date is reported, and
 * then neither is used: half a range would show the wrong rows. */
const readRange = (query, errors) => {
  const from = readDate(query, 'dateFrom', errors)
  const to = readDate(query, 'dateTo', errors)
  if (from.iso && to.iso && to.iso < from.iso) {
    errors.dateTo = FILTER_ERRORS.TO_BEFORE_FROM
  }
  const usable = !errors.dateTo
  return {
    dateFrom: usable ? from.iso : null,
    dateTo: usable ? to.iso : null,
    fromParts: from.parts,
    toParts: to.parts
  }
}

const isActive = ({ status, commodity, late, dateFrom, dateTo }) =>
  status.length > 0 || Boolean(commodity || late || dateFrom || dateTo)

/**
 * Reads a dashboard's filters from the query string, the way a GOV.UK filter
 * form (a `method="get"` form) sends them.
 *
 * Understood parameters:
 *
 * - `status` — `draft`, `submitted` or `amend`; repeat it for several
 *   (checkboxes named `status`).
 * - `commodity` — text the commodity name contains.
 * - `late` — `yes` for late only, `no` for on time only.
 * - `dateFrom`, `dateTo` — arrival dates, either as `YYYY-MM-DD` or as the
 *   `-day`, `-month`, `-year` fields `govukDateInput` sends with
 *   `namePrefix: "dateFrom"`.
 * - `tab` — one of the tab ids.
 *
 * @param {object} [query] - `request.query`.
 * @param {object} [options]
 * @param {object} [options.tabs] - the release's tabs, `DEFAULT_TABS` by default.
 * @returns {{filters: object, values: object, errors: object, active: boolean}}
 * `filters` to pass to `listKnownWithFilters` and `countKnown`; `values` to put
 * back in the form; `errors` as `{ field: code }` (see `FILTER_ERRORS`);
 * `active` when any filter other than the tab is in use.
 */
export const filtersFromQuery = (query = {}, { tabs = DEFAULT_TABS } = {}) => {
  const errors = {}
  const statuses = readStatuses(query.status)
  const commodity = trimmed(query.commodity)
  const late = readLate(query.late)
  const range = readRange(query, errors)
  const tab = readTab(query.tab, tabs)

  const filters = {
    status: statuses,
    commodity,
    late,
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    tab
  }
  return {
    filters,
    values: {
      status: statuses,
      commodity,
      late,
      dateFrom: range.fromParts,
      dateTo: range.toParts,
      tab
    },
    errors,
    active: isActive(filters)
  }
}
