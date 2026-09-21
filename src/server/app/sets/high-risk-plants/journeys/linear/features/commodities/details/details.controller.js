import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import {
  compose,
  requiredOneOf,
  validate
} from '../../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as commodities from '../../../../../services/commodities/index.js'
import { commodityDetailsPage as page } from '../page.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { entryIndexOf, hasEntryIndex } from '../entry-index.js'
import { commodityTypeHref, detailsHref, listHref } from '../links.js'
import { CATEGORY, GENUS, LINES } from '../fields.js'
import {
  classesOf,
  entryOf,
  inputmodeOf,
  ruleFor,
  valuesOf,
  widgetOf
} from '../line-form.js'

/**
 * One commodity line, added or edited.
 *
 * The page collects nothing of its own: the list page owns `commodityLines`
 * and this sub-page writes into that group. A line is created as soon as its
 * category is chosen, because which fields a line is asked for is decided by
 * that category and the model can only scope them once the instance exists.
 * So the page asks for the category, saves it, and returns carrying the fields
 * that category asks for.
 */
export const meta = { ...page, collects: [] }

const view = `${TEMPLATES}/features/commodities/details/template`

// The group's copy bundle: the vocabulary both pages render sits at its root,
// this page's own wording under `details`.
const bundle = copyFor({ en, cy })
const copy = bundle.details

const ADD_ANOTHER = 'add'

const categoryRule = (commodityType) =>
  requiredOneOf(
    CATEGORY,
    commodities.categoriesFor(commodityType),
    copy.errors.category
  )

const hintFor = (text) => (text ? { text } : undefined)

const categoryItems = (commodityType, selected) =>
  commodities.categoriesFor(commodityType).map((value) => ({
    value,
    text: bundle.categoryLabels[value],
    hint: hintFor(copy.categoryHints[value]),
    checked: value === selected
  }))

const genusItems = (category, selected) => [
  { value: '', text: copy.genusPlaceholder },
  ...commodities.generaFor(category).map((value) => ({
    value,
    text: bundle.genusLabels[value],
    selected: value === selected
  }))
]

const fieldViews = (fields, values, errors, fieldsCategory) =>
  fields.map((field) => ({
    name: field,
    widget: widgetOf(field),
    classes: classesOf(field),
    inputmode: inputmodeOf(field),
    label: copy.fields[field].label,
    hint: copy.fields[field].hint,
    value: values[field] ?? '',
    error: errors[field],
    items: field === GENUS ? genusItems(fieldsCategory, values[GENUS]) : []
  }))

const buildView = (request, h, model) => {
  const errors = model.errors ?? {}
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: model.hasLines ? listHref(request) : commodityTypeHref(request),
      journey: model.journey,
      page,
      recoverableError: model.recoverableError ?? false
    }),
    copy,
    values: model.values,
    errors,
    errorSummary: kit.errorSummary(errors),
    index: model.index,
    hasIndex: model.index !== null,
    categoryItems: categoryItems(model.commodityType, model.values[CATEGORY]),
    categoryHint: copy.categoryHintByCommodityType[model.commodityType],
    fieldViews: fieldViews(
      model.fields,
      model.values,
      errors,
      model.fieldsCategory
    ),
    revealed: model.fields.length > 0
  })
}

const pageState = async (request, h) => {
  const { journey, answers, evaluation } = await state.get(request, h)
  return {
    journey,
    commodityType: answers.commodityType,
    lines: state.collectionView(answers, [LINES], evaluation)
  }
}

/**
 * The view model for one render.
 *
 * @param {object} current - the page state.
 * @param {number|null} index - the line being edited, or null for a new one.
 * @param {object} source - where the shown values come from: a stored entry, a
 * validated value or the raw payload.
 * @param {string} [fieldsCategory] - the category whose fields are shown, when
 * that is not the category in `source` — a rejected category leaves the page
 * showing the fields the line already had.
 * @returns {object} the model `buildView` renders.
 */
const modelFor = (current, index, source, fieldsCategory) => {
  const category = String(source?.[CATEGORY] ?? '').trim()
  const fieldsFor = fieldsCategory ?? category
  const fields = commodities.lineFieldsFor(fieldsFor)
  return {
    journey: current.journey,
    commodityType: current.commodityType,
    index,
    hasLines: current.lines.length > 0,
    fieldsCategory: fieldsFor,
    fields,
    values: { [CATEGORY]: category, ...valuesOf(source, fields) }
  }
}

// A commodity type that offers no category leaves the page with nothing to ask
// and nothing it could accept, so the trader is sent back to the question that
// decides the categories.
const offersNoCategory = (current) =>
  commodities.categoriesFor(current.commodityType).length === 0

const get = async (request, h) => {
  const current = await pageState(request, h)
  if (offersNoCategory(current)) {
    return h.redirect(commodityTypeHref(request))
  }
  const raw = request.query.index
  const index = entryIndexOf(raw, current.lines.length)
  if (hasEntryIndex(raw) && index === null) {
    return h.redirect(listHref(request))
  }
  const entry = index === null ? {} : current.lines[index].entry
  return buildView(request, h, modelFor(current, index, entry))
}

const rejected = (request, h, model, errors) =>
  buildView(request, h, { ...model, errors }).code(HTTP_STATUS_BAD_REQUEST)

const commitAndRedirect = async (request, h, model, write) => {
  const { failure, value } = await kit.recoverableSave(write, async () =>
    buildView(request, h, { ...model, recoverableError: true }).code(
      HTTP_STATUS_INTERNAL_SERVER_ERROR
    )
  )
  return failure ?? h.redirect(value)
}

// A line is created carrying its category alone. The category is a bound leaf,
// so the instance persists, the model scopes the rest of the line's fields
// against it, and the page returns with them.
const addLine = (request, h, model, category) =>
  commitAndRedirect(request, h, model, async () => {
    const index = await state.appendEntryAt(request, h, [LINES], {
      [CATEGORY]: category
    })
    return index === null ? listHref(request) : detailsHref(request, { index })
  })

// Changing a saved line's category changes which fields it is asked for, and
// the values on the page belong to the old set. The line is rewritten as the
// bare new category — the engine wipes whatever left scope — and the page
// returns with the new fields.
const recategoriseLine = (request, h, model, index, category) =>
  commitAndRedirect(request, h, model, async () => {
    await state.updateEntryAt(request, h, [LINES], index, {
      [CATEGORY]: category
    })
    return detailsHref(request, { index })
  })

const saveLine = async (request, h, current, index, category, payload) => {
  const fields = commodities.lineFieldsFor(category)
  const model = modelFor(current, index, { ...payload, [CATEGORY]: category })
  const { errors, value } = validate(
    compose(...fields.map((field) => ruleFor(field, category, copy))),
    payload
  )
  if (errors) {
    return rejected(request, h, model, errors)
  }
  return commitAndRedirect(request, h, model, async () => {
    await state.updateEntryAt(
      request,
      h,
      [LINES],
      index,
      entryOf(category, fields, value)
    )
    return payload.action === ADD_ANOTHER
      ? detailsHref(request)
      : listHref(request)
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const current = await pageState(request, h)
  if (offersNoCategory(current)) {
    return h.redirect(commodityTypeHref(request))
  }
  const index = entryIndexOf(payload.index, current.lines.length)
  const stored = index === null ? {} : current.lines[index].entry
  const { errors, value } = validate(
    compose(categoryRule(current.commodityType)),
    payload
  )
  if (errors) {
    const model = modelFor(current, index, payload, stored[CATEGORY])
    return rejected(request, h, model, errors)
  }
  if (index === null) {
    // The re-render this call can fall back to describes a line that was never
    // created, so it asks the category alone: anything typed under the fields
    // of a category would be discarded on retry.
    return addLine(
      request,
      h,
      modelFor(current, index, value, ''),
      value[CATEGORY]
    )
  }
  if (stored[CATEGORY] !== value[CATEGORY]) {
    const model = modelFor(current, index, value)
    return recategoriseLine(request, h, model, index, value[CATEGORY])
  }
  return saveLine(request, h, current, index, value[CATEGORY], payload)
}

export const routes = kit.pageRoutes(page, { get, post })
