import { dashboardPath, hubPath } from '../../../../../../shared/paths.js'
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
import { hasCommittedNotificationAnswers } from '../../flow/entry-guard.js'
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

// Which timing window each type's hint quotes. The number itself is the
// constants module's; this map only says which of the two applies.
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

// A page reachable before anything is committed has its back link told by what
// has been saved: a notification with nothing committed has no overview worth
// returning to, so it goes back to the dashboard instead.
const backLinkFor = (journey, answers) =>
  hasCommittedNotificationAnswers(answers)
    ? hubPath(journey.journeyId)
    : dashboardPath()

const linesOf = (current) =>
  state.collectionView(current.answers, [LINES], current.evaluation)

// The categories partition by commodity type, so a line survives a change of
// type only when its category belongs to the type now chosen — in practice,
// only when the type has not really changed.
const linesKeptBy = (lines, commodityType) => {
  const allowed = commodities.categoriesFor(commodityType)
  return lines
    .map(({ entry }) => entry)
    .filter((entry) => allowed.includes(entry[CATEGORY]))
}

// Lines are reconciled by what identifies one to a trader, not by position: a
// line they can still see keeps the rest of its answers.
const keyOf = (entry) =>
  [entry[CATEGORY], entry[GENUS], entry[POTATO_VARIETY]].join('|')

const render = (h, current, values, options = {}) => {
  const errors = options.errors ?? {}
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: backLinkFor(current.journey, current.answers),
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
  const { errors, value } = validate(fields(), payload)
  const current = await state.get(request, h)
  if (errors) {
    return render(h, current, values, { errors }).code(HTTP_STATUS_BAD_REQUEST)
  }

  const lines = linesOf(current)
  const kept = linesKeptBy(lines, value.commodityType)
  const removed = lines.length - kept.length

  let committed
  const { failure } = await kit.recoverableSave(
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

  // A change that dropped lines says so on the list page, whichever control
  // was pressed — the trader has to see what went before they move on.
  if (removed > 0) {
    return h.redirect(listHref(request, { removed }))
  }
  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
