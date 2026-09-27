import { clearFakesFor } from '../lib/registry.js'
import {
  countRows,
  DEFAULT_TABS,
  hasFilters,
  matchesFilters,
  normaliseFilters
} from './filters.js'
import { recordsPersistence } from './persistence.js'

/** Changes that must be saved when persistence is on. */
const CHANGES = Object.freeze([
  'create',
  'replaceFulfilment',
  'finalise',
  'amend',
  'cancelAmend',
  'copy',
  'softDelete'
])

/** Reads that pass straight through. `list` and `clear` are wrapped below. */
const READS = Object.freeze(['load', 'has'])

const FALLBACK_PAGE_SIZE = 20

const wrappedBySet = new Map()

const splitFilters = ({
  status,
  commodity,
  late,
  dateFrom,
  dateTo,
  tab,
  tabs,
  ...upstream
} = {}) => ({
  requested: { status, commodity, late, dateFrom, dateTo, tab },
  tabs,
  upstream
})

/** Every row the upstream store would list for these options, across all its
 * pages, in the order it sorts them. */
const allRows = async (records, upstream) => {
  const first = await records.list({ ...upstream, page: 1 })
  const rows = [...first.rows]
  for (let page = 2; page <= first.totalPages; page += 1) {
    rows.push(...(await records.list({ ...upstream, page })).rows)
  }
  return { rows, size: first.size || FALLBACK_PAGE_SIZE }
}

const validPage = (page) => (Number.isInteger(page) && page > 0 ? page : 1)

const pageOfRows = (rows, page, size) => {
  const current = validPage(page)
  const offset = (current - 1) * size
  return {
    rows: rows.slice(offset, offset + size),
    page: current,
    size,
    totalElements: rows.length,
    totalPages: Math.ceil(rows.length / size)
  }
}

/**
 * Wraps a set's records store for a design release.
 *
 * The wrapped store keeps every upstream method and its contract, and adds:
 *
 * - **Filters on `list()`**: `status`, `commodity`, `late`, `dateFrom`,
 *   `dateTo` and `tab`, applied before paging. With none of them, `list()` is
 *   exactly the upstream call.
 * - **`counts()`**: totals by status, late and tab, for tab labels and filter
 *   counts. Status and tab filters are ignored when counting, so every tab
 *   shows its own number.
 * - **Data that survives a restart** on a designer's own computer (see
 *   `persistence.js`).
 * - **Reset clears the fakes**: `clear()` also empties every fake service the
 *   set used, and deletes the saved file.
 *
 * Wire it in the release's `src/server/app/routes-<set-id>.js`:
 *
 * ```js
 * configureRecords(SET_ID, designerRecords(SET_ID, records))
 * ```
 *
 * Never wrap high-risk-plants: it is the real journey and must behave as
 * plants-frontend does.
 *
 * @param {string} setId - the release's set id.
 * @param {object} records - the upstream records store.
 * @param {object} [options]
 * @param {object} [options.tabs] - the release's dashboard tabs,
 * `{ tabId: [statuses] }`; `DEFAULT_TABS` by default.
 * @param {boolean} [options.persist] - force saving on or off.
 * @param {string} [options.dir] - where saved data goes.
 * @param {object} [options.state] - the stub store's state (tests).
 * @param {object} [options.seed] - the seeder link (tests).
 * @returns {object} the wrapped records store.
 */
export const wrapRecords = (setId, records, options = {}) => {
  const releaseTabs = options.tabs ?? DEFAULT_TABS
  const persistence = recordsPersistence(setId, options)
  persistence.restore()

  const wrapped = {}
  for (const name of READS) {
    wrapped[name] = (...args) => records[name](...args)
  }
  for (const name of CHANGES) {
    wrapped[name] = async (...args) => {
      const result = await records[name](...args)
      persistence.save()
      return result
    }
  }

  wrapped.list = async (listOptions) => {
    const { requested, tabs, upstream } = splitFilters(listOptions)
    const filters = normaliseFilters(requested, tabs ?? releaseTabs)
    if (!hasFilters(filters)) {
      return records.list(upstream)
    }
    const { rows, size } = await allRows(records, upstream)
    return pageOfRows(
      rows.filter((row) => matchesFilters(filters, row)),
      upstream.page,
      size
    )
  }

  wrapped.counts = async (countOptions) => {
    const { requested, tabs, upstream } = splitFilters(countOptions)
    const countedTabs = tabs ?? releaseTabs
    const filters = normaliseFilters(
      { ...requested, status: null, tab: null },
      countedTabs
    )
    const { rows } = await allRows(records, upstream)
    return countRows(
      rows.filter((row) => matchesFilters(filters, row)),
      countedTabs
    )
  }

  wrapped.clear = async (...args) => {
    await records.clear(...args)
    persistence.remove()
    clearFakesFor(setId)
  }

  wrapped.persistence = Object.freeze({
    enabled: persistence.enabled,
    file: persistence.file
  })

  const frozen = Object.freeze(wrapped)
  wrappedBySet.set(setId, frozen)
  return frozen
}

/**
 * The wrapped records store of a release, for the dashboard helpers.
 *
 * @param {string} setId - the release's set id.
 * @returns {object} the store `designerRecords` (`wrapRecords`) returned for
 * that set.
 * @throws {Error} with the fix, when the release never wrapped its records.
 */
export const designerRecordsFor = (setId) => {
  if (!wrappedBySet.has(setId)) {
    throw new Error(
      `The records for "${setId}" are not wrapped for designers. In src/server/app/routes-${setId}.js, change configureRecords(SET_ID, records) to configureRecords(SET_ID, designerRecords(SET_ID, records)).`
    )
  }
  return wrappedBySet.get(setId)
}
