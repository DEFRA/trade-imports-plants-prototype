import { lateNotificationIndicator } from './sections/review.js'
import { contactAddress } from './sections/contact.js'
import {
  supplierIdentificationNumber,
  producerIdentificationNumber,
  cropIdentificationNumber,
  consignmentNumber,
  consignor
} from './sections/parties.js'
import {
  arrivalDate,
  arrivalStatus,
  arrivalTime,
  proposedPlaceOfLanding
} from './sections/arrival.js'
import {
  category,
  commodityCode,
  commodityLine,
  commodityType,
  eppoCode,
  genus,
  phytosanitaryTreatments,
  potatoIntendedUse,
  potatoVariety,
  quantity,
  sizeOfTree,
  species
} from './sections/commodity.js'
import { placeOfDestination } from './sections/destination.js'
import { countryOfOrigin } from './sections/origin.js'

export {
  lateNotificationIndicator,
  contactAddress,
  supplierIdentificationNumber,
  producerIdentificationNumber,
  cropIdentificationNumber,
  consignmentNumber,
  consignor,
  arrivalDate,
  arrivalStatus,
  arrivalTime,
  category,
  commodityCode,
  commodityLine,
  commodityType,
  countryOfOrigin,
  eppoCode,
  genus,
  phytosanitaryTreatments,
  placeOfDestination,
  potatoIntendedUse,
  potatoVariety,
  proposedPlaceOfLanding,
  quantity,
  sizeOfTree,
  species
}

export const obligations = [
  lateNotificationIndicator,
  contactAddress,
  supplierIdentificationNumber,
  producerIdentificationNumber,
  cropIdentificationNumber,
  consignmentNumber,
  consignor,
  commodityType,
  commodityLine,
  category,
  genus,
  species,
  commodityCode,
  quantity,
  potatoVariety,
  potatoIntendedUse,
  eppoCode,
  sizeOfTree,
  phytosanitaryTreatments,
  countryOfOrigin,
  arrivalStatus,
  arrivalDate,
  arrivalTime,
  proposedPlaceOfLanding,
  placeOfDestination
]

export const groups = obligations.filter((obligation) =>
  obligations.some((other) => other.within === obligation)
)
