import {
  equalsGate,
  includesGate
} from '../../../../model/obligations/helpers/index.js'
import { commodityType } from './commodity.js'

export const consignor = {
  id: '2e0726a6-524f-45c8-a552-c126a757ad71',
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
  id: 'a2fa0d93-3a4b-49c0-bdd7-15b4a3f07e0e',
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
  id: '1165f12e-7693-4571-8a5d-ce9e6f4db136',
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
  id: '8a5b58ef-1bd6-40d5-bbca-6dde79c83837',
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
  id: '1a0ea063-6f7d-4ec7-8bdf-8454912b323a',
  name: 'consignmentNumber',
  status: 'optional'
}
