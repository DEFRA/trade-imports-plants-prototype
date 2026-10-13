import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as addressBook from '../../../../../../services/address-book/index.js'
import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../lib/http-status.js'
import { notificationViewPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { buildSections } from './view-model/index.js'
import { changeHref } from './view-model/rows/change-link.js'
import { outstandingPartyErrors } from './view-model/outstanding-parties.js'
import { originErrors } from '../origin/controller.js'

import { lateness, requestClock } from '../review/lateness.js'
import {
  POTATO_DAYS_BEFORE_ARRIVAL,
  PLANTS_WOOD_DAYS_AFTER_ARRIVAL
} from '../timing-windows.js'

export const meta = { ...page, collects: [] }
const view = `${TEMPLATES}/features/check-answers/template`
const copy = copyFor({ en, cy })

const partiesFor = async (request, source, scope) => {
  const parties = {}
  for (const field of ['placeOfDestination', 'consignor', 'contactAddress']) {
    const saved = source[field]
    if (!scope.has(field) || !saved) {
      continue
    }
    const party = saved.addressId
      ? await addressBook.party(organisationIdOf(request), saved.addressId)
      : saved
    if (party && !party.deleted) {
      parties[field] = party
    }
  }
  return parties
}

const render = async (request, h, current, disableAutoFocus = true) => {
  const readOnly = current.journey.status === state.SUBMITTED
  // The sanitiser drops unresolved references that this page must name in errors.
  // Use stored answers for those errors; the rest of the page uses sanitised answers.
  const source = current.storedAnswers ?? current.answers
  const parties = await partiesFor(request, source, current.scope)
  const errors = readOnly
    ? {}
    : {
        ...(await originErrors(current)),
        ...outstandingPartyErrors(source, parties)
      }
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
    sections: await buildSections(current, parties, readOnly),
    errorSummary: kit.errorSummary(errors, {
      href: (field) => changeHref(current.journey.journeyId, field),
      disableAutoFocus
    }),
    deleteHref: readOnly ? pagePath(current.journey.journeyId, 'delete') : null,
    // Ruled c-030: AMEND offers Cancel amendment instead of Delete; the
    // success banner shows once, after cancel-amend's own redirect.
    cancelAmendHref:
      current.journey.status === state.AMEND
        ? pagePath(current.journey.journeyId, 'cancel-amend')
        : null,
    amendmentCancelled: readOnly && request.query.cancelled === '1'
  })
}

const get = async (request, h) =>
  render(request, h, await state.get(request, h))

const post = async (request, h) => {
  const current = await state.get(request, h)
  if (current.journey.status === state.SUBMITTED) {
    return h.redirect(pagePath(current.journey.journeyId, page.slug))
  }
  const source = current.storedAnswers ?? current.answers
  const parties = await partiesFor(request, source, current.scope)
  const errors = {
    ...(await originErrors(current)),
    ...outstandingPartyErrors(source, parties)
  }
  if (Object.keys(errors).length > 0) {
    return (await render(request, h, current, false)).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }
  if (!current.scope.readyForCheckYourAnswers) {
    return h.redirect(hubPath(current.journey.journeyId))
  }
  return h.redirect(await kit.nextTarget(request, page, current.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
