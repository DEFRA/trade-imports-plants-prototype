import { hubPath } from '../../../../../../../shared/paths.js'
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
import { CATEGORY, GENUS, LINES, POTATO_VARIETY, QUANTITY } from '../fields.js'

/**
 * The commodities the consignment holds.
 *
 * The page owns the `commodityLines` group: it reads the saved lines back,
 * removes one, and is where Continue leaves the loop. The lines themselves are
 * written by the entry sub-page. A load with no lines and nothing to report
 * sends the trader straight to that sub-page, because an empty list is not a
 * page worth showing.
 */
export const meta = { ...page, collects: [LINES] }

const view = `${TEMPLATES}/features/commodities/list/template`

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
  const errors = model.errors ?? {}
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(model.journey.journeyId),
      journey: model.journey,
      page,
      recoverableError: model.recoverableError ?? false
    }),
    // A table of saved lines is a display surface, not a form field: the
    // longest category label needs the full width to stay on one line.
    contentColumnClass: kit.surfaceClass('display'),
    copy,
    errors,
    errorSummary: kit.errorSummary(errors),
    rows: rowsOf(model.lines, request),
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
  const { journey, answers, scope, evaluation } = await state.get(request, h)
  return {
    journey,
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
    return buildView(request, h, current).code(HTTP_STATUS_BAD_REQUEST)
  }
  const { failure } = await kit.recoverableSave(
    async () => state.removeEntryAt(request, h, [LINES], index),
    async () =>
      buildView(request, h, { ...current, recoverableError: true }).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
  )
  return failure ?? h.redirect(listHref(request))
}

// The model's floor, enforced where the trader meets it. The list is only ever
// reached empty through a removal or a direct request, so the message is the
// last thing between an empty consignment and the rest of the journey.
const post = async (request, h) => {
  const action = String(request.payload?.action ?? '')
  const current = await pageState(request, h)
  if (action.startsWith(REMOVE_PREFIX)) {
    return removeLine(request, h, current, action)
  }
  if (current.lines.length === 0) {
    return buildView(request, h, {
      ...current,
      errors: { [LINES]: copy.errors.commodityLines }
    }).code(HTTP_STATUS_BAD_REQUEST)
  }
  return h.redirect(await kit.nextTarget(request, page, current.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
