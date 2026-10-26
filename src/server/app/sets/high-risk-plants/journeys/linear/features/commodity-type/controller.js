import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import {
  compose,
  requiredOneOf,
  validate
} from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as commodities from '../../../../services/commodities/index.js'
import { entryBackLink } from '../../flow/entry-guard.js'
import {
  CATEGORY,
  GENUS,
  LINES,
  POTATO_VARIETY
} from '../commodities/fields.js'
import { listHref } from '../commodities/links.js'
import {
  PLANTS_WOOD_DAYS_AFTER_ARRIVAL,
  POTATO_DAYS_BEFORE_ARRIVAL
} from '../timing-windows.js'
import { commodityTypePage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

export const meta = { ...page, collects: ['commodityType'] }

const view = `${TEMPLATES}/features/commodity-type/template`

const copy = copyFor({ en, cy })

const HINT_DAYS = {
  potatoes: POTATO_DAYS_BEFORE_ARRIVAL,
  'plants-for-planting': PLANTS_WOOD_DAYS_AFTER_ARRIVAL,
  'wood-and-cut-trees': PLANTS_WOOD_DAYS_AFTER_ARRIVAL
}

const fields = () =>
  compose(
    requiredOneOf(
      'commodityType',
      commodities.commodityTypes(),
      copy.errors.commodityType
    )
  )

const typeOptions = (selected) =>
  commodities.commodityTypes().map((value) => ({
    value,
    text: copy.typeLabels[value],
    hint: { text: copy.typeHints[value](HINT_DAYS[value]) },
    checked: value === selected
  }))

const linesOf = (current) =>
  state.collectionView(current.answers, [LINES], current.evaluation)

const linesKeptBy = (lines, commodityType) => {
  const allowed = commodities.categoriesFor(commodityType)
  return lines
    .map(({ entry }) => entry)
    .filter((entry) => allowed.includes(entry[CATEGORY]))
}

const keepLinesAllowedBy = (lines, commodityType) => {
  if (!commodityType) {
    return { kept: [], removed: 0 }
  }
  const kept = linesKeptBy(lines, commodityType)
  return { kept, removed: lines.length - kept.length }
}

const keyOf = (entry) =>
  [entry[CATEGORY], entry[GENUS], entry[POTATO_VARIETY]].join('|')

const render = (h, current, values, options = {}) => {
  const errors = options.errors ?? {}
  return h.view(view, {
    ...kit.base(copy.title, {
      request: h.request,
      backLink: entryBackLink(current.journey, current.answers),
      journey: current.journey,
      page,
      recoverableError: options.recoverableError ?? false
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    typeOptions: typeOptions(values.commodityType),
    hasLines: linesOf(current).length > 0
  })
}

const get = async (request, h) => {
  const current = await state.get(request, h)
  return render(h, current, {
    commodityType: current.answers.commodityType ?? ''
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = { commodityType: payload.commodityType ?? '' }
  const { errors, value } = validate(fields(), payload, {
    allowMissing: kit.isHubExit(request)
  })
  const current = await state.get(request, h)
  if (errors) {
    return render(h, current, values, { errors }).code(HTTP_STATUS_BAD_REQUEST)
  }

  const { kept, removed } = keepLinesAllowedBy(
    linesOf(current),
    value.commodityType
  )

  let committed
  const { failure } = await kit.recoverableSave(
    request,
    async () => {
      committed = await state.commit(request, h, {
        commodityType: value.commodityType
      })
      if (removed > 0) {
        await state.reconcileEntriesAt(request, h, [LINES], keyOf, kept)
      }
    },
    async () =>
      render(h, current, values, { recoverableError: true }).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
  )
  if (failure) {
    return failure
  }

  if (removed > 0) {
    return h.redirect(listHref(request, { removed }))
  }
  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
