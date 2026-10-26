import * as kit from '../../../../../../shared/kit.js'
import * as addressBook from '../../../../../../services/address-book/index.js'
import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { partyOf } from '../../parties/index.js'
import { toDisplayParty } from '../../parties/picked-party.js'
import { partyEditHref } from '../party-edit/edit-href.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { addressText } from './address-lines.js'
import { chosenFor } from './save-selection.js'
import { TEMPLATES } from '../../config.js'

const pickerCopy = copyFor({ en, cy })

const view = `${TEMPLATES}/features/address-book-picker/template`

const heldCopyOf = async (request, current, fieldName) => {
  const partyDisplayValues = await toDisplayParty(current.answers[fieldName])
  if (!partyDisplayValues) {
    return null
  }
  const partyRegistryEntry = partyOf(fieldName)
  return {
    title: partyRegistryEntry.current,
    name: partyDisplayValues.name,
    summary: [
      addressText(partyDisplayValues.address),
      partyDisplayValues.address.country
    ]
      .filter(Boolean)
      .join(', '),
    editDetails: pickerCopy.editDetails,
    editHref: partyEditHref(
      current.journey.journeyId,
      partyRegistryEntry,
      partyRegistryEntry.slug,
      { change: kit.changeContext(request) }
    )
  }
}

/**
 * Renders one address-book picker page.
 *
 * @param {object} request - the Hapi request.
 * @param {object} h - the Hapi response toolkit.
 * @param {object} current - the journey state the engine has resolved.
 * @param {object} state - what to render.
 * @param {string} state.query - the search term to run.
 * @param {number} state.page - the page of results to show.
 * @param {string} state.selectedId - the address-book id currently ticked.
 * @param {string} [state.error] - the refusal to render with the results.
 * @param {boolean} [state.recoverableError] - whether a save has just failed.
 * @param {object} binding - what makes this picker its own page.
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
  { page, copy, fieldName, pickerViewModel, heading, description }
) => {
  const orgId = organisationIdOf(request)
  const found = await addressBook.search(orgId, { query, page: pageNumber })
  const tickedRecord = await chosenFor(orgId, selectedId)
  const effectiveSelectedId = tickedRecord ? selectedId : ''

  return h.view(view, {
    ...kit.base(copy.title, {
      request,
      backLink: await kit.runBackLink(request, page.id, current),
      journey: current.journey,
      page,
      recoverableError
    }),
    contentColumnClass: kit.surfaceClass('display'),
    copy,
    fieldName,
    pickerCopy,
    heading,
    description,
    heldCopy: await heldCopyOf(request, current, fieldName),
    errorSummary: kit.errorSummary(error ? { [fieldName]: error } : undefined, {
      href: () => (found.results.length > 0 ? `#${fieldName}` : '#q')
    }),
    picker: pickerViewModel(
      current.journey.journeyId,
      { query, selectedId: effectiveSelectedId, error, found, tickedRecord },
      pickerCopy
    )
  })
}
