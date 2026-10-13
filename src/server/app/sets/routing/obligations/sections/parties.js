import {
  equalsGate,
  includesGate
} from '../../../../model/obligations/helpers/index.js'
import { commodityType } from './commodity.js'

export const consignor = {
  id: '38a71050-ad5e-4df9-bcc7-734067c6561f',
  name: 'consignor',
  status: 'mandatory',
  applyTo: includesGate(
    commodityType,
    ['plants-for-planting', 'wood-and-cut-trees'],
    {
      inScope: true,
      status: 'mandatory',
      reasons: [
        {
          code: 'obligation.consignor.applicable.becauseCommodityType',
          explanation:
            'consignor applies to plants for planting and wood and cut trees'
        }
      ]
    },
    { inScope: false }
  )
}

export const supplierIdentificationNumber = {
  id: 'a8ac7a84-2c05-42cd-b16c-ec509e18479b',
  name: 'supplierIdentificationNumber',
  status: 'mandatory',
  applyTo: equalsGate(
    commodityType,
    'plants-for-planting',
    { inScope: true, status: 'mandatory' },
    { inScope: false }
  )
}

export const producerIdentificationNumber = {
  id: '82cb932e-4cde-4bb9-8ec1-1080a018c217',
  name: 'producerIdentificationNumber',
  status: 'mandatory',
  applyTo: equalsGate(
    commodityType,
    'potatoes',
    { inScope: true, status: 'mandatory' },
    { inScope: false }
  )
}

export const cropIdentificationNumber = {
  id: '3620d061-3f6d-4b9c-8b68-e78f11afed6b',
  name: 'cropIdentificationNumber',
  status: 'mandatory',
  applyTo: equalsGate(
    commodityType,
    'potatoes',
    { inScope: true, status: 'mandatory' },
    { inScope: false }
  )
}

export const consignmentNumber = {
  id: 'c0c5cb96-f878-4eb1-b0a4-98223fb38d60',
  name: 'consignmentNumber',
  status: 'optional'
}
