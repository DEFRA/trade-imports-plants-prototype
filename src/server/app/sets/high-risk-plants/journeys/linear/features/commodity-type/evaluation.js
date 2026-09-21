import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import { commodityType } from '../../../../obligations/index.js'

export const evaluationBindings = feature('commodity-type', [
  scalar({ field: 'commodityType', obligation: commodityType })
])
