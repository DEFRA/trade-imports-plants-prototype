import { session } from '../../engine/persistence/session.js'
import { currentSetId } from '../../shared/set-context.js'
import { organisationIdOf } from '../../../common/helpers/organisation-id.js'
import { designerRecordsFor } from '../../../prototype-support/records.js'
import { countRows } from './filters.js'

/**
 * The stub: filters and counts the release's own records, through the
 * records wrapper its gateway wires (`designerRecords` in
 * `src/server/prototype-support/records.js`). Answers only for the
 * notifications this browser knows, exactly as the engine's
 * `listKnownJourneys` does.
 */

const EMPTY_LIST = Object.freeze({
  rows: [],
  page: 1,
  size: 0,
  totalElements: 0,
  totalPages: 0
})

/** What the signed-in user may see: the notifications their browser knows,
 * read through the set's session seam, plus their organisation. */
const knownTo = async (request) => ({
  journeyIds: await session.knownJourneyIds(request),
  organisationId: organisationIdOf(request)
})

export const searchNotifications = async (request, options = {}) => {
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

export const countNotifications = async (request, options = {}) => {
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
