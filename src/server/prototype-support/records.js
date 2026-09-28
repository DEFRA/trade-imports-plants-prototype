/**
 * The records wrapper for design releases: the data behind the
 * notification-search stub (dashboard filters, tabs and counts), data that
 * survives a restart, and Reset that clears every stub store for the release.
 *
 * Wire it in the release's gateway, `src/server/app/routes-<set-id>.js`
 * (`npm run new:set` does this):
 * `configureRecords(SET_ID, designerRecords(SET_ID, records))`.
 *
 * Pages never import this file. A dashboard reads its filters and counts
 * through `src/server/app/services/notification-search/index.js`. See
 * `docs/designers/services-and-dashboards.md`.
 */
import { wrapRecords } from './wrap.js'

export { designerRecordsFor } from './wrap.js'

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
