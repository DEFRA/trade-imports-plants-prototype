import { hubPath, pagePath } from '../../../../../../shared/paths.js'
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
import {
  POTATO_DAYS_BEFORE_ARRIVAL,
  PLANTS_WOOD_DAYS_AFTER_ARRIVAL
} from '../timing-windows.js'

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

/** Party errors are keyed `party:<id>` so their summary entries link to the
 * page that edits the copied address, returning here, rather than to the
 * picker a Change link opens. An unfinished card is somewhere on this page,
 * so its entry is an anchor to the card. */
const PARTY_KEY_PREFIX = 'party:'

const summaryHref = (current) => (key) => {
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

/** Every reason the notification cannot go on: answer and invalid-party errors
 * first, then one entry per card still to complete, in page order. A card
 * already named by an answer or party error is not named twice. */
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

/** A submitted notification names nothing in error. c-201: an amendment opens
 * with no errors; once its Continue is refused, it names them like a draft. */
const reviewedFor = (current, refused) => {
  const { status } = current.journey
  const named =
    status !== state.SUBMITTED && (status !== state.AMEND || refused)
  return named ? reviewErrors(current) : null
}

const render = async (
  request,
  h,
  current,
  disableAutoFocus = true,
  refused = false
) => {
  const readOnly = current.journey.status === state.SUBMITTED
  const partyDisplayValuesById = await partyDisplayValuesFor(current)
  const reviewed = await reviewedFor(current, refused)
  const errors = reviewed ? summaryErrors(current, reviewed) : {}
  return h.view(view, {
    ...kit.base(copy.title, {
      journey: current.journey,
      page,
      backLink: hubPath(current.journey.journeyId)
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
    lateRule:
      current.answers.commodityType === 'potatoes'
        ? copy.late.potatoes(POTATO_DAYS_BEFORE_ARRIVAL)
        : copy.late.plantsAndWood(PLANTS_WOOD_DAYS_AFTER_ARRIVAL),
    sections: withCardErrors(
      await buildSections(current, partyDisplayValuesById, readOnly, {
        partyFieldErrorsById: reviewed?.partyFieldErrorsById ?? {}
      }),
      reviewed ? cardErrorsOf(current, reviewed) : {}
    ),
    errorSummary: kit.errorSummary(errors, {
      href: summaryHref(current),
      disableAutoFocus
    }),
    deleteHref: readOnly ? pagePath(current.journey.journeyId, 'delete') : null,
    // Ruled c-030: the success banner shows once, after cancel-amend's own
    // redirect.
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
    return (await render(request, h, current, false, true)).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }
  return h.redirect(await kit.nextTarget(request, page, current.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
