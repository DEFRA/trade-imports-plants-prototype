/**
 * Prototype-only services for design releases.
 *
 * Nothing here exists in plants-frontend. It lets a design release show things
 * the real service cannot do yet, and says so:
 *
 * - `records/` wraps a release's records store: dashboard filters, tabs and
 *   counts, data that survives a restart, and Reset that clears the fakes.
 * - `transporters/` and `templates/` are fake services. Each one is named in
 *   every hand-off as "needs a real service" (`describeFakes()`).
 *
 * Only a design release may import from here: never high-risk-plants, which
 * must behave as plants-frontend does. See
 * `docs/designers/services-and-dashboards.md`.
 */
export {
  countKnown,
  designerRecords,
  filtersFromQuery,
  listKnownWithFilters
} from './records/index.js'
export { clearFakesFor, describeFakes } from './lib/registry.js'
