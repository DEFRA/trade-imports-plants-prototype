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
import { notificationViewPage } from '../features/check-answers/page.js'

const flowPageTarget = (page) => (scope, journeyId) =>
  pageGatePasses(page, scope) ? pagePath(journeyId, page.slug) : null

/** The opening run's ordered steps. A null target skips the step.
 * `backCandidates` lists the earlier steps a step's Back link may open, nearest
 * first. */
export const RUN_STEPS = [
  { id: commodityTypePage.id, target: flowPageTarget(commodityTypePage) },
  {
    id: commoditiesPage.id,
    target: flowPageTarget(commoditiesPage),
    backCandidates: [commodityTypePage.id]
  },
  {
    id: originPage.id,
    target: flowPageTarget(originPage),
    backCandidates: [commoditiesPage.id]
  },
  {
    id: arrivalStatusPage.id,
    target: flowPageTarget(arrivalStatusPage),
    backCandidates: [originPage.id]
  },
  {
    id: arrivalDetailsPage.id,
    target: flowPageTarget(arrivalDetailsPage),
    backCandidates: [arrivalStatusPage.id, originPage.id]
  },
  {
    id: placeOfDestinationPage.id,
    target: flowPageTarget(placeOfDestinationPage),
    backCandidates: [arrivalDetailsPage.id]
  },
  {
    id: consignorPage.id,
    target: flowPageTarget(consignorPage),
    backCandidates: [placeOfDestinationPage.id]
  },
  {
    id: identificationNumbersPage.id,
    target: flowPageTarget(identificationNumbersPage),
    backCandidates: [consignorPage.id, placeOfDestinationPage.id]
  },
  {
    id: consignmentContactSelectPage.id,
    target: flowPageTarget(consignmentContactSelectPage),
    backCandidates: [identificationNumbersPage.id]
  },
  { id: notificationViewPage.id, target: flowPageTarget(notificationViewPage) }
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

export const previousRunTarget = (stepId, scope, journeyId) => {
  const candidateIds =
    RUN_STEPS.find((step) => step.id === stepId)?.backCandidates ?? []
  for (const candidateId of candidateIds) {
    const candidate = RUN_STEPS.find((step) => step.id === candidateId)
    const target = candidate.target(scope, journeyId)
    if (target) {
      return target
    }
  }
  return null
}
