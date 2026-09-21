import { hubPath } from '../../../../../../shared/paths.js'
import * as kit from '../../../../../../shared/kit.js'
import * as addressBook from '../../../../../../services/address-book/index.js'
import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'

/** A selection resolves only to a record the book still holds: a missing or
 * soft-deleted id is treated as no selection, the same way a stored reference
 * to a deleted record reads as never entered. An outage is not that — the
 * address book throws and the throw propagates, because an unavailable service
 * must never be indistinguishable from a deletion. */
export const chosenFor = async (orgId, selectedId) => {
  if (!selectedId) {
    return undefined
  }
  const record = await addressBook.party(orgId, selectedId)
  return record && !record.deleted ? record : undefined
}

/**
 * Render one address-book picker page.
 *
 * Every picker renders the same surface — a search box, one page of results as
 * radios, the selection and the paging — so only the page's own identity, its
 * copy and its heading vary. Those arrive in `binding`; the rest is the same
 * page each time.
 *
 * @param {object} request - the Hapi request.
 * @param {object} h - the Hapi response toolkit.
 * @param {object} current - the journey state the engine has resolved.
 * @param {object} state - what to render.
 * @param {string} state.query - the search term to run.
 * @param {number} state.page - the page of results to show.
 * @param {string} state.selectedId - the address-book id currently ticked.
 * @param {string} [state.error] - the refusal to render above the table.
 * @param {boolean} [state.recoverableError] - whether a save has just failed.
 * @param {object} binding - what makes this picker its own page.
 * @param {string} binding.view - the template path.
 * @param {object} binding.page - the page's id and slug.
 * @param {object} binding.copy - the page's resolved copy bundle.
 * @param {string} binding.fieldName - the answer name the page collects.
 * @param {Function} binding.pickerViewModel - the page's bound view model.
 * @param {string} binding.heading - the question, as this page asks it.
 * @param {string} binding.description - the text under the question.
 * @returns {Promise<object>} the Hapi view response.
 */
export const renderPicker = async (
  request,
  h,
  current,
  { query, page: pageNumber, selectedId, error, recoverableError = false },
  { view, page, copy, fieldName, pickerViewModel, heading, description }
) => {
  const orgId = organisationIdOf(request)
  const found = await addressBook.search(orgId, { query, page: pageNumber })
  const selected = await chosenFor(orgId, selectedId)
  // A reference that no longer resolves must not travel as "Selected address"
  // or in the paging links, so it counts as no selection here too.
  const effectiveSelectedId = selected ? selectedId : ''

  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(current.journey.journeyId),
      journey: current.journey,
      page,
      recoverableError
    }),
    contentColumnClass: kit.surfaceClass('display'),
    copy,
    heading,
    description,
    errorSummary: kit.errorSummary(error ? { [fieldName]: error } : undefined, {
      href: () => (found.results.length > 0 ? `#${fieldName}` : '#q')
    }),
    picker: pickerViewModel(
      current.journey.journeyId,
      { query, selectedId: effectiveSelectedId, error, found, selected },
      copy
    )
  })
}
