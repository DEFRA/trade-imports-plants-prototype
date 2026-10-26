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

export const meta = { ...page, collects: [ARRIVAL_STATUS] }

const view = `${TEMPLATES}/features/arrival-status/template`

const copy = copyFor({ en, cy })

const fields = () =>
  compose(
    requiredOneOf(ARRIVAL_STATUS, ARRIVAL_STATUSES, copy.errors.arrivalStatus)
  )

const statusHintOf = (value) =>
  value === ALREADY_ARRIVED
    ? copy.statusHints[value](PLANTS_WOOD_DAYS_AFTER_ARRIVAL)
    : copy.statusHints[value]

const statusOptions = (selected) =>
  ARRIVAL_STATUSES.map((value) => ({
    value,
    text: copy.statusLabels[value],
    hint: { text: statusHintOf(value) },
    checked: value === selected
  }))

const render = async (request, h, current, values, options = {}) => {
  const errors = options.errors ?? {}
  return h.view(view, {
    ...kit.base(copy.title, {
      request,
      backLink: await kit.runBackLink(request, page.id, current),
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
  return render(request, h, current, {
    [ARRIVAL_STATUS]: current.answers[ARRIVAL_STATUS] ?? ''
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = { [ARRIVAL_STATUS]: payload[ARRIVAL_STATUS] ?? '' }
  const { errors, value } = validate(fields(), payload, {
    allowMissing: kit.isHubExit(request)
  })
  const current = await state.get(request, h)
  if (errors) {
    return (await render(request, h, current, values, { errors })).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  let committed
  const { failure } = await kit.recoverableSave(
    request,
    async () => {
      committed = await state.commit(request, h, {
        [ARRIVAL_STATUS]: value[ARRIVAL_STATUS]
      })
    },
    async () =>
      (
        await render(request, h, current, values, { recoverableError: true })
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) {
    return failure
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
