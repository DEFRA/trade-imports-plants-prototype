import {
  dashboardPath,
  hubPath,
  pagePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../lib/http-status.js'
import { notificationViewPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { buildSections } from './view-model/index.js'
import { changeHref } from './view-model/rows/change-link.js'
import {
  cardAnchorHref,
  incompleteCardErrors,
  withCardErrors
} from './view-model/incomplete-cards.js'
import { reviewErrors } from './refusal.js'
import { completeOpeningRun } from '../../../../../../flow/run-state.js'
import { PARTIES, partyOf } from '../../parties/index.js'
import { toDisplayParty } from '../../parties/picked-party.js'
import { partyEditHref } from '../party-edit/edit-href.js'
import { lateness, requestClock } from '../review/lateness.js'
import { lateRuleText } from '../review/late-rule.js'

export const meta = { ...page, collects: [] }
const view = `${TEMPLATES}/features/check-answers/template`
const copy = copyFor({ en, cy })

const partyDisplayValuesFor = async ({ answers, scope }) => {
  const partyDisplayValuesById = {}
  for (const { id } of PARTIES) {
    const partyDisplayValues = scope.has(id)
      ? await toDisplayParty(answers[id])
      : undefined
    if (partyDisplayValues) {
      partyDisplayValuesById[id] = partyDisplayValues
    }
  }
  return partyDisplayValuesById
}

const PARTY_KEY_PREFIX = 'party:'

const summaryHrefFor = (current) => (key) => {
  const { journeyId } = current.journey
  if (key.startsWith(PARTY_KEY_PREFIX)) {
    return partyEditHref(
      journeyId,
      partyOf(key.slice(PARTY_KEY_PREFIX.length)),
      kit.CYA_SLUG
    )
  }
  return cardAnchorHref(key) ?? changeHref(journeyId, key)
}

const cardErrorsOf = (current, { answerErrors, partyErrors }) =>
  incompleteCardErrors(current, [
    ...Object.keys(answerErrors),
    ...Object.keys(partyErrors)
  ])

const summaryErrors = (current, reviewed) => ({
  ...reviewed.answerErrors,
  ...Object.fromEntries(
    Object.entries(reviewed.partyErrors).map(([id, text]) => [
      `${PARTY_KEY_PREFIX}${id}`,
      text
    ])
  ),
  ...cardErrorsOf(current, reviewed)
})

const hidesAnswerErrors = (status, continueRefused) =>
  status === state.SUBMITTED || (status === state.AMEND && !continueRefused)

const shownReviewErrors = (current, continueRefused) =>
  hidesAnswerErrors(current.journey.status, continueRefused)
    ? null
    : reviewErrors(current)

const backLinkFor = (journey) =>
  journey.status === state.SUBMITTED
    ? dashboardPath()
    : hubPath(journey.journeyId)

const render = async (
  request,
  h,
  current,
  { continueRefused = false } = {}
) => {
  const readOnly = current.journey.status === state.SUBMITTED
  const partyDisplayValuesById = await partyDisplayValuesFor(current)
  const reviewed = await shownReviewErrors(current, continueRefused)
  const errors = reviewed ? summaryErrors(current, reviewed) : {}
  return h.view(view, {
    ...kit.base(copy.title, {
      journey: current.journey,
      page,
      backLink: backLinkFor(current.journey)
    }),
    contentColumnClass: kit.surfaceClass('display'),
    copy,
    readOnly,
    lateWarning:
      current.journey.status === state.DRAFT &&
      lateness(
        requestClock(request),
        current.answers.commodityType,
        current.answers.arrivalDate
      ) === 'late',
    lateNotification:
      readOnly && current.answers.lateNotificationIndicator === 'late',
    lateRule: lateRuleText(current.answers.commodityType, copy.late),
    sections: withCardErrors(
      await buildSections(current, partyDisplayValuesById, readOnly, {
        partyFieldErrorsById: reviewed?.partyFieldErrorsById ?? {}
      }),
      reviewed ? cardErrorsOf(current, reviewed) : {}
    ),
    errorSummary: kit.errorSummary(errors, {
      href: summaryHrefFor(current),
      disableAutoFocus: !continueRefused
    }),
    deleteHref: readOnly ? pagePath(current.journey.journeyId, 'delete') : null,
    amendmentCancelled: readOnly && request.query.cancelled === '1'
  })
}

const get = async (request, h) => {
  await completeOpeningRun(request, h, request.params.journeyId)
  return render(request, h, await state.get(request, h))
}

const post = async (request, h) => {
  const current = await state.get(request, h)
  if (current.journey.status === state.SUBMITTED) {
    return h.redirect(pagePath(current.journey.journeyId, page.slug))
  }
  const errors = summaryErrors(current, await reviewErrors(current))
  if (
    Object.keys(errors).length > 0 ||
    !current.scope.readyForCheckYourAnswers
  ) {
    kit.logRefusal(request, {
      fieldErrors: errors,
      ...(Object.keys(errors).length === 0 && { reason: 'journey-not-ready' })
    })
    return (await render(request, h, current, { continueRefused: true })).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }
  return h.redirect(await kit.nextTarget(request, page, current.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
