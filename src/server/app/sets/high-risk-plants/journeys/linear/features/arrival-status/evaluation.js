import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import { arrivalStatus } from '../../../../obligations/index.js'

export const evaluationBindings = feature('arrival-status', [
  scalar({ field: 'arrivalStatus', obligation: arrivalStatus })
])
