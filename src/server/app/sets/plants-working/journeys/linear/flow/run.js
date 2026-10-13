import { consignmentContactSelectPage } from '../features/consignment-contact-select/page.js'
import { identificationNumbersPage } from '../features/identification-numbers/page.js'
import { consignorPage } from '../features/consignor-select/page.js'
import { hubPath, pagePath } from '../../../../../shared/paths.js'
import { pageGatePasses } from '../../../../../flow/gates.js'
import { commodityTypePage } from '../features/commodity-type/page.js'
import { commoditiesPage } from '../features/commodities/page.js'
import { originPage } from '../features/origin/page.js'
import { arrivalStatusPage } from '../features/arrival-status/page.js'
import { arrivalDetailsPage } from '../features/arrival-details/page.js'
import { placeOfDestinationPage } from '../features/place-of-destination/page.js'

const flowPageTarget = (page) => (scope, journeyId) =>
  pageGatePasses(page, scope) ? pagePath(journeyId, page.slug) : null

/** The opening run's ordered steps — a null target skips the step (see
 * docs/journey-flow-and-gates.md, "Opening run and entry guard"). The run
 * opens on commodity-type, the notification's entry question, asks for the
 * consignment's commodities, then for where they come from, then whether they
 * have arrived, then when. The entry sub-page is not a step: the list page
 * sends a trader with no lines there and takes them back. The arrival-status
 * step is skipped for potatoes, whose notification is never asked the
 * question. Arrival details and destination are asked of every commodity type;
 * the consignor step is skipped for potatoes, then every type reaches
 * identification numbers. */
export const RUN_STEPS = [
  { id: commodityTypePage.id, target: flowPageTarget(commodityTypePage) },
  { id: commoditiesPage.id, target: flowPageTarget(commoditiesPage) },
  { id: originPage.id, target: flowPageTarget(originPage) },
  { id: arrivalStatusPage.id, target: flowPageTarget(arrivalStatusPage) },
  { id: arrivalDetailsPage.id, target: flowPageTarget(arrivalDetailsPage) },
  {
    id: placeOfDestinationPage.id,
    target: flowPageTarget(placeOfDestinationPage)
  },
  { id: consignorPage.id, target: flowPageTarget(consignorPage) },
  {
    id: identificationNumbersPage.id,
    target: flowPageTarget(identificationNumbersPage)
  },
  {
    id: consignmentContactSelectPage.id,
    target: flowPageTarget(consignmentContactSelectPage)
  }
]

export const nextRunTarget = (stepId, scope, journeyId) => {
  const index = RUN_STEPS.findIndex((step) => step.id === stepId)
  if (index === -1) {
    return null
  }
  for (const step of RUN_STEPS.slice(index + 1)) {
    const target = step.target(scope, journeyId)
    if (target) {
      return target
    }
  }
  return hubPath(journeyId)
}
