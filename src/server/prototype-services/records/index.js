/**
 * The records wrapper for design releases: dashboard filters, tabs and counts,
 * data that survives a restart, and Reset that clears the fakes.
 *
 * - Wire it in the release's gateway, `src/server/app/routes-<set-id>.js`
 *   (`npm run new:set` does this for a release copied from high-risk-plants):
 *   `configureRecords(SET_ID, designerRecords(SET_ID, records))`.
 * - Use it from the release's dashboard controller:
 *   `filtersFromQuery(request.query)`, then `listKnownWithFilters(request, …)`
 *   and `countKnown(request, …)`.
 *
 * See `docs/designers/services-and-dashboards.md`.
 */
import { wrapRecords } from './wrap.js'

export { designerRecordsFor } from './wrap.js'
export { DEFAULT_TABS, STATUSES } from './filters.js'
export { FILTER_ERRORS, filtersFromQuery } from './query.js'
export { countKnown, listKnownWithFilters } from './dashboard.js'

/**
 * Wraps a design release's records store. See `wrapRecords` in `./wrap.js`
 * for everything it adds and its options.
 *
 * Declared here, not re-exported, because `npm run new:set` looks for this
 * exact declaration before it wires a new release to it.
 *
 * @param {string} setId - the release's set id.
 * @param {object} records - the upstream records store.
 * @param {object} [options] - `tabs`, and `persist`/`dir` for tests.
 * @returns {object} the wrapped records store.
 */
export const designerRecords = (setId, records, options) =>
  wrapRecords(setId, records, options)
