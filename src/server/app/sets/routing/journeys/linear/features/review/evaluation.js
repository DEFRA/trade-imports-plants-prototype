import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import { lateNotificationIndicator } from '../../../../obligations/index.js'

export const evaluationBindings = feature('review', [
  scalar({
    field: 'lateNotificationIndicator',
    obligation: lateNotificationIndicator
  })
])
