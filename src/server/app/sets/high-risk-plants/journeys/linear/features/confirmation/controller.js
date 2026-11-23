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
import { declarationPage } from '../declaration/page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { lateRuleText } from '../review/late-rule.js'
import { notificationDayText } from '../review/notification-day-text.js'
import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'

export const meta = { ...page, collects: [] }
const copy = copyFor({ en, cy })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  if (journey.status !== state.SUBMITTED) {
    request.logger.info(
      {
        journeyId: journey.journeyId,
        status: journey.status,
        organisationId: organisationIdOf(request),
        refusal: 'not-submitted'
      },
      'Confirmation refused'
    )
    return h.redirect(pagePath(journey.journeyId, declarationPage.slug))
  }
  return h.view(`${TEMPLATES}/features/confirmation/template`, {
    ...kit.base(copy.title, { journey, page }),
    copy,
    reference: journey.journeyId,
    notificationDate: notificationDayText(journey.submittedAt),
    late: answers.lateNotificationIndicator === 'late',
    lateRule: lateRuleText(answers.commodityType, copy.late),
    notificationHref: pagePath(journey.journeyId, kit.CYA_SLUG),
    dashboardHref: dashboardPath()
  })
}

export const routes = [
  {
    method: 'GET',
    path: pageRoutePath(page.slug),
    options: kit.pageRouteOptions(page),
    handler: get
  }
]
