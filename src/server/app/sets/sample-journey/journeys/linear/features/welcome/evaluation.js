import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import { consignmentReference } from '../../../../obligations/index.js'

export const evaluationBindings = feature('welcome', [
  scalar({ field: 'consignmentReference', obligation: consignmentReference })
])
