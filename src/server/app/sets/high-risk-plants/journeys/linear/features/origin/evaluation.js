import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import { countryOfOrigin } from '../../../../obligations/index.js'

export const evaluationBindings = feature('origin', [
  scalar({ field: 'countryOfOrigin', obligation: countryOfOrigin })
])
