import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import {
  arrivalDate,
  arrivalTime,
  proposedPlaceOfLanding
} from '../../../../obligations/index.js'

export const evaluationBindings = feature('arrival-details', [
  scalar({ field: 'arrivalDate', obligation: arrivalDate }),
  scalar({ field: 'arrivalTime', obligation: arrivalTime }),
  scalar({
    field: 'proposedPlaceOfLanding',
    obligation: proposedPlaceOfLanding
  })
])
