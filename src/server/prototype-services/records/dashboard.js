import { session } from '../../app/engine/persistence/session.js'
import { currentSetId } from '../../app/shared/set-context.js'
import { organisationIdOf } from '../../common/helpers/organisation-id.js'
import { countRows } from './filters.js'
import { designerRecordsFor } from './wrap.js'

const EMPTY_LIST = Object.freeze({
  rows: [],
  page: 1,
  size: 0,
  totalElements: 0,
  totalPages: 0
})

/** What the signed-in user may see: the notifications their browser knows,
 * read through the set's session seam exactly as the engine's
 * `listKnownJourneys` reads them, plus their organisation. */
const knownTo = async (request) => ({
  journeyIds: await session.knownJourneyIds(request),
  organisationId: organisationIdOf(request)
})

/**
 * The release dashboard's list, with filters.
 *
 * A drop-in for the engine's `listKnownJourneys(request, { page, sort,
 * referenceNumber })` that also takes the filters `filtersFromQuery` reads:
 * `status`, `commodity`, `late`, `dateFrom`, `dateTo` and `tab`.
 *
 * Call it from the release's dashboard controller, inside the release's own
 * routes. The release's gateway must wrap its records with `designerRecords`.
 *
 * @param {object} request - the Hapi request.
 * @param {object} [options] - `page`, `sort`, `referenceNumber` and filters.
 * @returns {Promise<object>} `{ rows, page, size, totalElements, totalPages }`.
 */
export const listKnownWithFilters = async (request, options = {}) => {
  const { journeyIds, organisationId } = await knownTo(request)
  // Signed in with no organisation: there is no address book to resolve names
  // against, so the engine answers empty, and so does this.
  if (!organisationId) {
    return { ...EMPTY_LIST }
  }
  return designerRecordsFor(currentSetId()).list({
    ...options,
    journeyIds,
    organisationId
  })
}

/**
 * Counts for the release dashboard's tabs and filter panel.
 *
 * Counts every notification the user can see that passes the filters in
 * use, except `status` and `tab`: each tab shows its own number whichever tab
 * is open.
 *
 * @param {object} request - the Hapi request.
 * @param {object} [options] - `referenceNumber` and filters, as for
 * `listKnownWithFilters`, plus an optional `tabs`.
 * @returns {Promise<{total: number, byStatus: object, late: number, byTab: object}>}
 * the counts.
 */
export const countKnown = async (request, options = {}) => {
  const { journeyIds, organisationId } = await knownTo(request)
  if (!organisationId) {
    return countRows([], options.tabs)
  }
  return designerRecordsFor(currentSetId()).counts({
    ...options,
    journeyIds,
    organisationId
  })
}
