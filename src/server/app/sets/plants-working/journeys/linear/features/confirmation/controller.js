import {
  dashboardPath,
  pagePath,
  pageRoutePath
} from '../../../../../../shared/paths.js'
import * as state from '../../../../../../engine/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { TEMPLATES } from '../../config.js'
import { confirmationPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import {
  POTATO_DAYS_BEFORE_ARRIVAL,
  PLANTS_WOOD_DAYS_AFTER_ARRIVAL
} from '../timing-windows.js'

export const meta = { ...page, collects: [] }
const copy = copyFor({ en, cy })

// Matches the declaration page's own dateText: submittedAt is a UTC instant,
// shown in the Europe/London civil date the service reports against.
const dateText = (value) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London'
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  if (journey.status !== state.SUBMITTED) {
    return h.redirect(pagePath(journey.journeyId, kit.CYA_SLUG))
  }
  return h.view(`${TEMPLATES}/features/confirmation/template`, {
    ...kit.base(copy.title, { journey, page }),
    copy,
    reference: journey.journeyId,
    notificationDate: dateText(journey.submittedAt),
    // The stored value committed at first finalise, never recomputed here
    // from submittedAt (c-030).
    late: answers.lateNotificationIndicator === 'late',
    lateRule:
      answers.commodityType === 'potatoes'
        ? copy.late.potatoes(POTATO_DAYS_BEFORE_ARRIVAL)
        : copy.late.plantsAndWood(PLANTS_WOOD_DAYS_AFTER_ARRIVAL),
    notificationHref: pagePath(journey.journeyId, kit.CYA_SLUG),
    dashboardHref: dashboardPath()
  })
}

// Confirmation is a read-only receipt; there is no form or POST action.
export const routes = [
  {
    method: 'GET',
    path: pageRoutePath(page.slug),
    options: kit.routeOptions,
    handler: get
  }
]
