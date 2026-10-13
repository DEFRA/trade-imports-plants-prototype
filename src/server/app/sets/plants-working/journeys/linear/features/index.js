import * as cancelAmend from './cancel-amend/controller.js'
import * as confirmation from './confirmation/controller.js'
import * as declaration from './declaration/controller.js'
import * as checkAnswers from './check-answers/controller.js'
import * as contact from './consignment-contact-select/controller.js'
import * as identificationNumbers from './identification-numbers/controller.js'
import * as consignor from './consignor-select/controller.js'
import * as dashboard from './dashboard/controller.js'
import * as hub from './hub/controller.js'
import * as deleteNotification from './delete-notification/controller.js'
import * as commodityType from './commodity-type/controller.js'
import * as commoditiesList from './commodities/list/list.controller.js'
import * as commodityDetails from './commodities/details/details.controller.js'
import * as origin from './origin/controller.js'
import * as arrivalStatus from './arrival-status/controller.js'
import * as arrivalDetails from './arrival-details/controller.js'
import * as placeOfDestination from './place-of-destination/controller.js'

// Neither the dashboard nor the hub exports meta: they collect nothing, are
// never gated and are never a task row, so they stay out of the dispatch index.
// Delete-notification and cancel-amend are action slugs, not journey pages.
export const dispatchPages = [
  confirmation.meta,
  declaration.meta,
  checkAnswers.meta,
  contact.meta,
  identificationNumbers.meta,
  commodityType.meta,
  commoditiesList.meta,
  commodityDetails.meta,
  origin.meta,
  arrivalStatus.meta,
  arrivalDetails.meta,
  consignor.meta,
  placeOfDestination.meta
]

export const allRoutes = [
  ...cancelAmend.routes,
  ...confirmation.routes,
  ...declaration.routes,
  ...checkAnswers.routes,
  ...contact.routes,
  ...identificationNumbers.routes,
  ...dashboard.routes,
  ...hub.routes,
  ...deleteNotification.routes,
  ...commodityType.routes,
  ...commoditiesList.routes,
  ...commodityDetails.routes,
  ...origin.routes,
  ...arrivalStatus.routes,
  ...arrivalDetails.routes,
  ...consignor.routes,
  ...placeOfDestination.routes
]
