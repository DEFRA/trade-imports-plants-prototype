import { hubPath } from '../../../../../../shared/paths.js'
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
import { consignorPage as page } from './page.js'
import { CONSIGNOR } from './fields.js'
import { pickerViewModel } from './view-model/index.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

/**
 * The consignor or exporter, picked from the organisation's address book.
 *
 * The whole page is one form. The search button and the primary are both
 * submits, told apart by their `action` value, and paging is a link — so the
 * picker needs no client JavaScript at all.
 *
 * The answer stored is the address-book id and nothing else. The details are
 * resolved from the book on every read, so a record the trader later corrects
 * is corrected on the notification too, and a record they delete stops
 * resolving rather than leaving a stale copy behind.
 */
export const meta = { ...page, collects: [CONSIGNOR] }

const view = `${TEMPLATES}/features/consignor-select/template`

const copy = copyFor({ en, cy })

const FIRST_PAGE = 1
const SEARCH_ACTION = 'search'

const parsePageNumber = (value) => {
  const number = Number.parseInt(value, 10)
  return Number.isNaN(number) ? FIRST_PAGE : number
}

const isSearch = (payload) => payload.action === SEARCH_ACTION

const committedId = (answers) => answers[CONSIGNOR]?.addressId

// The page asks one question in one voice, so the heading and the description
// are the page's own copy rather than chosen per notification.
const render = (request, h, current, pageState) =>
  renderPicker(request, h, current, pageState, {
    view,
    page,
    copy,
    fieldName: CONSIGNOR,
    pickerViewModel,
    heading: copy.title,
    description: copy.description
  })

const get = async (request, h) => {
  const current = await state.get(request, h)
  if (!current.scope.has(CONSIGNOR)) {
    return h.redirect(hubPath(current.journey.journeyId))
  }
  return render(request, h, current, {
    query: request.query.q ?? '',
    page: parsePageNumber(request.query.page),
    selectedId: request.query.selected ?? committedId(current.answers)
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const query = payload.q ?? ''
  const selectedId = payload[CONSIGNOR] || payload.selected || ''
  const current = await state.get(request, h)

  if (!current.scope.has(CONSIGNOR)) {
    return h.redirect(hubPath(current.journey.journeyId))
  }

  if (isSearch(payload)) {
    // A new search starts at the first page, whichever page it was run from.
    return render(request, h, current, {
      query,
      page: FIRST_PAGE,
      selectedId
    })
  }

  const chosen = await chosenFor(organisationIdOf(request), selectedId)
  if (!chosen) {
    return (
      await render(request, h, current, {
        query,
        page: parsePageNumber(payload.page),
        selectedId: '',
        error: copy.errors.consignor
      })
    ).code(HTTP_STATUS_BAD_REQUEST)
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, {
        [CONSIGNOR]: { addressId: chosen.id }
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
