import { hubPath } from '../../../../../../shared/paths.js'
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
import { PLANTS_WOOD_DAYS_AFTER_ARRIVAL } from '../timing-windows.js'
import { arrivalStatusPage as page } from './page.js'
import {
  ALREADY_ARRIVED,
  ARRIVAL_STATUS,
  ARRIVAL_STATUSES
} from './statuses.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

/**
 * Whether the consignment has already arrived in Great Britain.
 *
 * The answer decides what the rest of the arrival section asks for, so it is
 * put before the dates and the destination. A potato notification never
 * reaches the page: `arrivalStatus` is out of scope for potatoes, which makes
 * the derived page gate fail and the opening run skip the step.
 */
export const meta = { ...page, collects: [ARRIVAL_STATUS] }

const view = `${TEMPLATES}/features/arrival-status/template`

const copy = copyFor({ en, cy })

const fields = () =>
  compose(
    requiredOneOf(ARRIVAL_STATUS, ARRIVAL_STATUSES, copy.errors.arrivalStatus)
  )

// Only the post-arrival hint quotes the notification window. The day count is
// the timing-windows constant, so the sentence lives in the copy bundle and
// the number is named once here.
const hintTextFor = (value) =>
  value === ALREADY_ARRIVED
    ? copy.statusHints[value](PLANTS_WOOD_DAYS_AFTER_ARRIVAL)
    : copy.statusHints[value]

const statusOptions = (selected) =>
  ARRIVAL_STATUSES.map((value) => ({
    value,
    text: copy.statusLabels[value],
    hint: { text: hintTextFor(value) },
    checked: value === selected
  }))

const render = (h, current, values, options = {}) => {
  const errors = options.errors ?? {}
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
    statusOptions: statusOptions(values[ARRIVAL_STATUS])
  })
}

const get = async (request, h) => {
  const current = await state.get(request, h)
  return render(h, current, {
    [ARRIVAL_STATUS]: current.answers[ARRIVAL_STATUS] ?? ''
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = { [ARRIVAL_STATUS]: payload[ARRIVAL_STATUS] ?? '' }
  const { errors, value } = validate(fields(), payload)
  const current = await state.get(request, h)
  if (errors) {
    return render(h, current, values, { errors }).code(HTTP_STATUS_BAD_REQUEST)
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, {
        [ARRIVAL_STATUS]: value[ARRIVAL_STATUS]
      })
    },
    async () =>
      render(h, current, values, { recoverableError: true }).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
  )
  if (failure) {
    return failure
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
