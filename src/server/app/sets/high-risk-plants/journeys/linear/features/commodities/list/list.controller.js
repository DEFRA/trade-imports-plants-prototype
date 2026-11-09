import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { commoditiesPage as page } from '../page.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { entryIndexOf } from '../entry-index.js'
import { detailsHref, listHref } from '../links.js'
import { commodityTableRows } from './table-rows.js'
import { CATEGORY, GENUS, LINES, POTATO_VARIETY, QUANTITY } from '../fields.js'

export const meta = { ...page, collects: [LINES] }

const view = `${TEMPLATES}/features/commodities/list/list`

const bundle = copyFor({ en, cy })
const copy = bundle.list

const REMOVE_PREFIX = 'remove:'

const removedCountOf = (raw) => {
  const count = Number(raw)
  return Number.isInteger(count) && count > 0 ? count : null
}

const genusOrVariety = (entry) => {
  const genus = entry[GENUS]
  return genus ? bundle.genusLabels[genus] : (entry[POTATO_VARIETY] ?? '')
}

const rowsOf = (lines, request) =>
  lines.map(({ index, entry }) => ({
    index,
    position: index + 1,
    category: bundle.categoryLabels[entry[CATEGORY]] ?? '',
    genusOrVariety: genusOrVariety(entry),
    quantity: entry[QUANTITY] ?? '',
    changeHref: detailsHref(request, { index }),
    removeAction: `${REMOVE_PREFIX}${index}`
  }))

const buildView = (request, h, model) => {
  const rows = rowsOf(model.lines, request)
  const errors = model.errors ?? {}
  return h.view(view, {
    ...kit.base(copy.title, {
      request,
      backLink: model.backLink,
      journey: model.journey,
      page,
      recoverableError: model.recoverableError ?? false
    }),
    contentColumnClass: kit.surfaceClass('display'),
    copy,
    errors,
    errorSummary: kit.errorSummary(errors),
    rows,
    tableRows: commodityTableRows(rows, copy),
    addAnotherHref: detailsHref(request),
    removedCount: model.removedCount,
    removedMessage:
      model.removedCount === null
        ? null
        : copy.removed.body(
            model.removedCount,
            bundle.typeLabels[model.commodityType]
          )
  })
}

const pageState = async (request, h) => {
  const current = await state.get(request, h)
  const { journey, answers, scope, evaluation } = current
  return {
    journey,
    backLink: await kit.runBackLink(request, page.id, current),
    scope,
    commodityType: answers.commodityType,
    lines: state.collectionView(answers, [LINES], evaluation),
    removedCount: removedCountOf(request.query.removed)
  }
}

const get = async (request, h) => {
  const current = await pageState(request, h)
  if (current.removedCount === null && current.lines.length === 0) {
    return h.redirect(detailsHref(request))
  }
  return buildView(request, h, current)
}

const removeLine = async (request, h, current, action) => {
  const index = entryIndexOf(
    action.slice(REMOVE_PREFIX.length),
    current.lines.length
  )
  if (index === null) {
    kit.logRefusal(request, {
      reason: 'remove-index-out-of-range',
      removeAction: action
    })
    return buildView(request, h, current).code(HTTP_STATUS_BAD_REQUEST)
  }
  const { failure } = await kit.recoverableSave(
    request,
    async () => state.removeEntryAt(request, h, [LINES], index),
    async () =>
      buildView(request, h, { ...current, recoverableError: true }).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      ),
    { action: 'remove-line', index }
  )
  return failure ?? h.redirect(listHref(request))
}

const post = async (request, h) => {
  const action = String(request.payload?.action ?? '')
  const current = await pageState(request, h)
  if (action.startsWith(REMOVE_PREFIX)) {
    return removeLine(request, h, current, action)
  }
  if (current.lines.length === 0) {
    const errors = { [LINES]: copy.errors.commodityLines }
    return buildView(request, h, { ...current, errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }
  return h.redirect(await kit.nextTarget(request, page, current.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
