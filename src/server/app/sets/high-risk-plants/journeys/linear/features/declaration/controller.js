import { pagePath } from '../../../../../../shared/paths.js'
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
import { lateness, requestClock } from '../review/lateness.js'
import { notificationDateText } from '../review/notification-date.js'
import { isReviewRefused } from '../check-answers/refusal.js'
import { declarationPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
export const meta = { ...page, collects: ['declaration'] }
const view = `${TEMPLATES}/features/declaration/template`

const copy = copyFor({ en, cy })

const fields = compose(
  requiredOneOf('declaration', ['confirmed'], copy.errors.declarationRequired)
)

const render = (
  request,
  h,
  journey,
  values,
  { errors = {}, recoverableError = false } = {}
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: pagePath(journey.journeyId, kit.CYA_SLUG),
      journey,
      showJourneyStrip: false,
      page,
      recoverableError
    }),
    copy,
    submissionDate: notificationDateText(requestClock(request)),
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

export const DECLARATION_REFUSAL = Object.freeze({
  review: 'review-outstanding',
  submission: 'submission-rejected'
})

const refuseDeclaration = (request, h, journey, refusal) => {
  request.logger.info(
    {
      journeyId: journey.journeyId,
      refusal,
      concurrencyToken: journey.concurrencyToken
    },
    'Declaration refused'
  )
  return h.redirect(pagePath(journey.journeyId, kit.CYA_SLUG))
}

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  if (journey.status === state.SUBMITTED) {
    return h.redirect(pagePath(journey.journeyId, 'confirmation'))
  }
  return render(request, h, journey, { declaration: answers.declaration ?? '' })
}

const post = async (request, h) => {
  const current = await state.get(request, h)
  const { journey, answers } = current
  if (journey.status === state.SUBMITTED) {
    return h.redirect(pagePath(journey.journeyId, 'confirmation'))
  }
  if (await isReviewRefused(current)) {
    return refuseDeclaration(request, h, journey, DECLARATION_REFUSAL.review)
  }

  const payload = request.payload ?? {}
  const values = { declaration: payload.declaration ?? '' }
  const { errors, value } = validate(fields, payload)
  if (errors) {
    return render(request, h, journey, values, { errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  let result
  const { failure } = await kit.recoverableSave(
    request,
    async () => {
      await state.commit(request, h, {
        declaration: value.declaration,
        ...(journey.status === state.DRAFT && {
          lateNotificationIndicator: lateness(
            requestClock(request),
            answers.commodityType,
            answers.arrivalDate
          )
        })
      })
      result = await state.submitJourney(request, h)
    },
    () =>
      render(request, h, journey, values, { recoverableError: true }).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
  )
  if (failure) {
    return failure
  }

  if (!result.ok) {
    return refuseDeclaration(
      request,
      h,
      journey,
      DECLARATION_REFUSAL.submission
    )
  }
  return h.redirect(pagePath(journey.journeyId, 'confirmation'))
}

export const routes = kit.pageRoutes(page, { get, post })
