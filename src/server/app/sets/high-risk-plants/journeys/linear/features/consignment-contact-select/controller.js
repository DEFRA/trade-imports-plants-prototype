import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'
import { chosenFor, renderPicker } from '../address-book-picker/render.js'
import { consignmentContactSelectPage as page } from './page.js'
import { CONTACT_ADDRESS } from './fields.js'
import { pickerViewModel } from './view-model/index.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

/**
 * The contact for the consignment, picked from the organisation's address book.
 *
 * The whole page is one form. The search button and the primary are both
 * submits, told apart by their `action` value. Paging is a GET link; a small
 * progressive enhancement adds a newly ticked row to those links before the
 * browser follows them.
 *
 * Two things set this picker apart from the destination and consignor pages.
 * The answer stored is a COPY of the record — its id, name and address — so
 * the notification carries the contact details as they were when chosen, and
 * a blank save is allowed: Save and continue with nothing ticked commits
 * nothing and moves on, leaving the task row not yet started.
 */
export const meta = { ...page, collects: [CONTACT_ADDRESS] }

const view = `${TEMPLATES}/features/consignment-contact-select/template`

const copy = copyFor({ en, cy })

const FIRST_PAGE = 1
const SEARCH_ACTION = 'search'

const parsePageNumber = (value) => {
  const number = Number.parseInt(value, 10)
  return Number.isNaN(number) ? FIRST_PAGE : number
}

const isSearch = (payload) => payload.action === SEARCH_ACTION

const committedId = (answers) => answers[CONTACT_ADDRESS]?.addressId

const copyOf = (record) => ({
  addressId: record.id,
  name: record.name,
  address: { ...record.address }
})

// The page asks one question in one voice, so the heading and the description
// are the page's own copy rather than chosen per notification.
const render = (request, h, current, pageState) =>
  renderPicker(request, h, current, pageState, {
    view,
    page,
    copy,
    fieldName: CONTACT_ADDRESS,
    pickerViewModel,
    heading: copy.title,
    description: copy.description
  })

const get = async (request, h) => {
  const current = await state.get(request, h)
  return render(request, h, current, {
    query: request.query.q ?? '',
    page: parsePageNumber(request.query.page),
    selectedId: request.query.selected ?? committedId(current.answers)
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const query = payload.q ?? ''
  const selectedId = payload[CONTACT_ADDRESS] || payload.selected || ''
  const current = await state.get(request, h)

  if (isSearch(payload)) {
    // A new search starts at the first page, whichever page it was run from.
    return render(request, h, current, {
      query,
      page: FIRST_PAGE,
      selectedId
    })
  }

  if (!selectedId) {
    return h.redirect(await kit.nextTarget(request, page, current.scope))
  }

  const chosen = await chosenFor(organisationIdOf(request), selectedId)
  if (!chosen) {
    return (
      await render(request, h, current, {
        query,
        page: parsePageNumber(payload.page),
        selectedId: '',
        error: copy.errors.contactAddress
      })
    ).code(HTTP_STATUS_BAD_REQUEST)
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, {
        [CONTACT_ADDRESS]: copyOf(chosen)
      })
    },
    async () =>
      (
        await render(request, h, current, {
          query,
          page: parsePageNumber(payload.page),
          selectedId: chosen.id,
          recoverableError: true
        })
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) {
    return failure
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
