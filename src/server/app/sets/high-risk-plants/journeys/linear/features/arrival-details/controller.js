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

export const meta = {
  ...page,
  collects: [ARRIVAL_DATE, ARRIVAL_TIME, PROPOSED_PLACE_OF_LANDING]
}

const view = `${TEMPLATES}/features/arrival-details/template`

const copy = copyFor({ en, cy })

const QUESTION_LABEL_CLASSES = 'govuk-label--m'

const asksForPotatoDetails = (scope) => scope.has(ARRIVAL_TIME)

const dateStateOf = (answers, scope) => {
  if (asksForPotatoDetails(scope)) {
    return POTATO_ARRIVAL
  }
  return answers[ARRIVAL_STATUS] === ALREADY_ARRIVED
    ? ALREADY_ARRIVED
    : NOT_YET_ARRIVED
}

const portItems = async () => [
  { value: '', text: copy.placeOfLanding.selectText },
  ...(await ports.portOptions())
]

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

const render = async (request, h, current, values, options = {}) => {
  const errors = options.errors ?? {}
  const bounds = options.bounds ?? boundsFor(current.answers, current.scope)
  const dateState = dateStateOf(current.answers, current.scope)
  return h.view(view, {
    ...kit.base(copy.title, {
      request,
      backLink: await kit.runBackLink(request, page.id, current),
      journey: current.journey,
      page,
      recoverableError: options.recoverableError ?? false
    }),
    copy,
    questionLabelClasses: QUESTION_LABEL_CLASSES,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    showPotatoFields: asksForPotatoDetails(current.scope),
    portItems: await portItems(),
    dateField: kit.dateField(ARRIVAL_DATE, {
      label: copy.dateLabels[dateState],
      labelClasses: QUESTION_LABEL_CLASSES,
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
  return render(request, h, current, values, { errors })
}

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
    payload,
    { allowMissing: kit.isHubExit(request) }
  )
  if (errors) {
    return (await render(request, h, current, values, { bounds, errors })).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const { value: committed, failure } = await kit.recoverableSave(
    request,
    () => state.commit(request, h, committedValues(value, current.scope)),
    async () =>
      (
        await render(request, h, current, values, {
          bounds,
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
