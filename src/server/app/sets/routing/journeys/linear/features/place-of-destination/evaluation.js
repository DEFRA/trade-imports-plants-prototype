import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import { placeOfDestination } from '../../../../obligations/index.js'

export const evaluationBindings = feature('place-of-destination', [
  scalar({ field: 'placeOfDestination', obligation: placeOfDestination })
])
