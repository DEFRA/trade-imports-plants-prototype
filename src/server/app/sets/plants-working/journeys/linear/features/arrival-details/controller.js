import { hubPath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import {
  compose,
  requiredDateTextInRange,
  requiredOneOf,
  requiredTime,
  validate
} from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as ports from '../../../../../../services/ports/index.js'
import {
  ALREADY_ARRIVED,
  ARRIVAL_STATUS,
  NOT_YET_ARRIVED
} from '../arrival-status/statuses.js'
import { arrivalDetailsPage as page } from './page.js'
import { arrivalBounds } from './arrival-bounds.js'
import {
  ARRIVAL_DATE,
  ARRIVAL_TIME,
  POTATO_ARRIVAL,
  PROPOSED_PLACE_OF_LANDING
} from './fields.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

/**
 * When the consignment arrives, and for potatoes what time and where.
 *
 * Every notification owes the date, so every commodity type is asked this page.
 * The time and the place of landing are potato matters — reg 24A(2)(a) and
 * (aa), which reg 26(2) has no counterpart to — so they are rendered and
 * validated only while `scope.has()` says they apply. A plants or wood notifier
 * never sees them, and a change of commodity type purges whatever a potato
 * notification had stored.
 */
export const meta = {
  ...page,
  collects: [ARRIVAL_DATE, ARRIVAL_TIME, PROPOSED_PLACE_OF_LANDING]
}

const view = `${TEMPLATES}/features/arrival-details/template`

const copy = copyFor({ en, cy })

const asksForPotatoDetails = (scope) => scope.has(ARRIVAL_TIME)

/**
 * Which of the three sentences the date question asks.
 *
 * Potatoes have no arrival status — reg 24A gives them no post-arrival branch —
 * so the commodity type answers for them. Plants and wood take the state from
 * the arrival-status page; a notifier who reaches this page without having
 * answered that question is asked the pre-arrival sentence, which is the one
 * the journey opens on.
 */
const dateStateOf = (answers, scope) => {
  if (asksForPotatoDetails(scope)) {
    return POTATO_ARRIVAL
  }
  return answers[ARRIVAL_STATUS] === ALREADY_ARRIVED
    ? ALREADY_ARRIVED
    : NOT_YET_ARRIVED
}

const portItems = async () => [
  { value: '', text: copy.placeOfLanding.placeholder },
  ...(await ports.portOptions())
]

// Built inside POST rather than frozen in a module-level schema: the readers
// self-load on first use, and a schema built at import time would hold
// whatever the stub knew first.
const portCodes = async () => (await ports.list()).map(({ code }) => code)

const dateRule = (bounds) =>
  requiredDateTextInRange(ARRIVAL_DATE, {
    max: bounds.max,
    messages: {
      required: copy.errors.arrivalDate.required,
      invalid: copy.errors.arrivalDate.invalid,
      range: copy.errors.arrivalDate.inFuture
    }
  })

const potatoRules = async () => [
  requiredTime(ARRIVAL_TIME, { required: copy.errors.arrivalTime }),
  requiredOneOf(
    PROPOSED_PLACE_OF_LANDING,
    await portCodes(),
    copy.errors.proposedPlaceOfLanding
  )
]

const fields = async (scope, bounds) =>
  compose(
    dateRule(bounds),
    ...(asksForPotatoDetails(scope) ? await potatoRules() : [])
  )

/** The fields the page shows, and only those — a hidden field is never read
 * back from the payload and never committed. */
const valuesFrom = (source, scope) => ({
  [ARRIVAL_DATE]: source[ARRIVAL_DATE] ?? '',
  ...(asksForPotatoDetails(scope)
    ? {
        [ARRIVAL_TIME]: source[ARRIVAL_TIME] ?? '',
        [PROPOSED_PLACE_OF_LANDING]: source[PROPOSED_PLACE_OF_LANDING] ?? ''
      }
    : {})
})

const boundsFor = (answers, scope) =>
  arrivalBounds(dateStateOf(answers, scope) === ALREADY_ARRIVED)

const render = async (h, current, values, options = {}) => {
  const errors = options.errors ?? {}
  const bounds = options.bounds ?? boundsFor(current.answers, current.scope)
  const dateState = dateStateOf(current.answers, current.scope)
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(current.journey.journeyId),
      journey: current.journey,
      page,
      recoverableError: options.recoverableError ?? false
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    showPotatoFields: asksForPotatoDetails(current.scope),
    portItems: await portItems(),
    dateField: kit.dateField(ARRIVAL_DATE, {
      label: copy.dateLabels[dateState],
      hint: copy.dateHints[dateState],
      value: values[ARRIVAL_DATE],
      error: errors[ARRIVAL_DATE],
      maxDate: bounds.maxText
    })
  })
}

const isPortStale = async (code) => {
  if (!code) {
    return false
  }
  const offered = new Set(await portCodes())
  return !offered.has(code)
}

const get = async (request, h) => {
  const current = await state.get(request, h)
  const values = valuesFrom(current.answers, current.scope)
  const inScope = asksForPotatoDetails(current.scope)
  const stalePort =
    inScope && (await isPortStale(current.answers[PROPOSED_PLACE_OF_LANDING]))
  if (stalePort) {
    values[PROPOSED_PLACE_OF_LANDING] = ''
  }
  const errors = stalePort
    ? {
        [PROPOSED_PLACE_OF_LANDING]:
          copy.errors.proposedPlaceOfLandingNoLongerAvailable
      }
    : {}
  return render(h, current, values, { errors })
}

// The picker is one text box, so the answer arrives as `d/m/yyyy` text and is
// stored as the parts object every other date in the service uses.
const committedValues = (cleaned, scope) => ({
  ...valuesFrom(cleaned, scope),
  [ARRIVAL_DATE]: kit.readDate(cleaned, ARRIVAL_DATE)
})

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const current = await state.get(request, h)
  const values = valuesFrom(payload, current.scope)
  const bounds = boundsFor(current.answers, current.scope)
  const { errors, value } = validate(
    await fields(current.scope, bounds),
    payload
  )
  if (errors) {
    return (await render(h, current, values, { bounds, errors })).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(
        request,
        h,
        committedValues(value, current.scope)
      )
    },
    async () =>
      (
        await render(h, current, values, { bounds, recoverableError: true })
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) {
    return failure
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
