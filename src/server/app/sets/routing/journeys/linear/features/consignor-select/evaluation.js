import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import { consignor } from '../../../../obligations/index.js'

export const evaluationBindings = feature('consignor-select', [
  scalar({ field: 'consignor', obligation: consignor })
])
