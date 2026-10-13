import { evaluationBindings as contact } from './consignment-contact-select/evaluation.js'
import { evaluationBindings as identificationNumbers } from './identification-numbers/evaluation.js'
import { evaluationBindings as consignor } from './consignor-select/evaluation.js'
import { evaluationBindings as commodityType } from './commodity-type/evaluation.js'
import { evaluationBindings as commodities } from './commodities/evaluation.js'
import { evaluationBindings as origin } from './origin/evaluation.js'
import { evaluationBindings as arrivalStatus } from './arrival-status/evaluation.js'
import { evaluationBindings as arrivalDetails } from './arrival-details/evaluation.js'
import { evaluationBindings as placeOfDestination } from './place-of-destination/evaluation.js'

import { evaluationBindings as review } from './review/evaluation.js'

export const featureEvaluationBindings = Object.freeze([
  review,
  contact,
  identificationNumbers,
  commodityType,
  commodities,
  origin,
  arrivalStatus,
  arrivalDetails,
  placeOfDestination,
  consignor
])
