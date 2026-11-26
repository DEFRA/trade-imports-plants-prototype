import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import * as kit from '../../../../../../shared/kit.js'
import { hubPath } from '../../../../../../shared/paths.js'
import { answerForPickedParty } from '../../parties/picked-party.js'
import { renderPicker } from './render.js'
import { FIRST_PAGE, pageAskedFor } from '../../../../../../shared/paging.js'
import { resolveSelectionOnSave, SELECTION } from './save-selection.js'

const SEARCH_ACTION = 'search'

const isSearch = (payload) => payload.action === SEARCH_ACTION

const resultsPageToOpen = (request, fieldName, requestedPage) => {
  const asked = pageAskedFor(requestedPage)
  if (asked !== undefined) {
    return asked
  }
  if (requestedPage !== undefined) {
    request.logger.info(
      {
        journeyId: request.params.journeyId,
        fieldName,
        requestedPage,
        servedPage: FIRST_PAGE
      },
      'Address picker page is not a page number, serving the first page'
    )
  }
  return FIRST_PAGE
}

const logOutOfScope = (request, fieldName) =>
  kit.logRefusal(request, { reason: `${fieldName}-out-of-scope` })

const postedPickerState = (request, fieldName, payload, extra) => ({
  query: payload.q ?? '',
  resultsPage: resultsPageToOpen(request, fieldName, payload.page),
  ...extra
})

const renderPickerPage = (picker, request, h, current, pickerState) =>
  renderPicker(request, h, current, pickerState, {
    page: picker.page,
    copy: picker.copy,
    fieldName: picker.fieldName,
    role: picker.role,
    pickerViewModel: picker.pickerViewModel,
    heading: picker.heading(current),
    description: picker.description(current),
    saveActionsCopy: picker.saveActionsCopy
  })

const redirectOutOfScope = (picker, request, h, current) => {
  logOutOfScope(request, picker.fieldName)
  return h.redirect(hubPath(current.journey.journeyId))
}

const renderNotInBook = async (picker, request, h, current, payload) =>
  (
    await renderPickerPage(
      picker,
      request,
      h,
      current,
      postedPickerState(request, picker.fieldName, payload, {
        selectedId: '',
        error: picker.copy.errors[picker.fieldName]
      })
    )
  ).code(HTTP_STATUS_BAD_REQUEST)

const renderSaveFailure = async (
  picker,
  request,
  h,
  current,
  chosen,
  payload
) =>
  (
    await renderPickerPage(
      picker,
      request,
      h,
      current,
      postedPickerState(request, picker.fieldName, payload, {
        selectedId: chosen.id,
        recoverableError: true
      })
    )
  ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)

const commitSelection = async (
  picker,
  request,
  h,
  current,
  chosen,
  payload
) => {
  let committed
  const { failure } = await kit.recoverableSave(
    request,
    async () => {
      committed = await state.commit(request, h, {
        [picker.fieldName]: answerForPickedParty(chosen)
      })
    },
    () => renderSaveFailure(picker, request, h, current, chosen, payload)
  )
  return (
    failure ?? h.redirect(kit.nextTarget(request, picker.page, committed.scope))
  )
}

const getPicker = async (picker, request, h) => {
  const current = await state.get(request, h)
  if (!picker.inScope(current)) {
    return redirectOutOfScope(picker, request, h, current)
  }
  return renderPickerPage(picker, request, h, current, {
    query: request.query.q ?? '',
    resultsPage: resultsPageToOpen(
      request,
      picker.fieldName,
      request.query.page
    ),
    selectedId:
      request.query.selected ?? current.answers[picker.fieldName]?.pickedFromId
  })
}

const saveSelection = async (
  picker,
  request,
  h,
  current,
  payload,
  selectedId
) => {
  const selection = await resolveSelectionOnSave(request, {
    fieldName: picker.fieldName,
    selectedId,
    notInBookMessage: picker.copy.errors[picker.fieldName],
    role: picker.role
  })
  if (selection.outcome === SELECTION.nothingChosen) {
    return h.redirect(kit.nextTarget(request, picker.page, current.scope))
  }
  if (selection.outcome === SELECTION.notInBook) {
    return renderNotInBook(picker, request, h, current, payload)
  }
  return commitSelection(picker, request, h, current, selection.record, payload)
}

const postPicker = async (picker, request, h) => {
  const payload = request.payload ?? {}
  const current = await state.get(request, h)
  if (!picker.inScope(current)) {
    return redirectOutOfScope(picker, request, h, current)
  }

  const selectedId = payload[picker.fieldName] || payload.selected || ''
  if (isSearch(payload)) {
    return renderPickerPage(picker, request, h, current, {
      query: payload.q ?? '',
      resultsPage: FIRST_PAGE,
      selectedId
    })
  }
  return saveSelection(picker, request, h, current, payload, selectedId)
}

/**
 * The GET and POST routes of one address-book picker page.
 *
 * @param {object} picker
 * @param {object} picker.page - the page's id and slug.
 * @param {string} picker.fieldName - the answer name the page collects.
 * @param {string} [picker.role] - the address-book role the page asks for.
 * @param {object} picker.copy - the page's resolved copy bundle.
 * @param {Function} picker.pickerViewModel - the page's bound view model.
 * @param {Function} picker.heading - gives the question, as this page asks it, from the journey state.
 * @param {Function} picker.description - gives the text under the question from the journey state.
 * @param {object} [picker.saveActionsCopy] - the page's own words for its save-and-return and cancel controls, defaulting to the shared copy.
 * @param {Function} [picker.inScope] - tells from the journey state whether the page applies; out of scope it redirects to the overview.
 * @returns {object[]} the Hapi routes.
 */
export const pickerRoutes = ({ inScope = () => true, ...settings }) => {
  const picker = { ...settings, inScope }
  return kit.pageRoutes(picker.page, {
    get: (request, h) => getPicker(picker, request, h),
    post: (request, h) => postPicker(picker, request, h)
  })
}
