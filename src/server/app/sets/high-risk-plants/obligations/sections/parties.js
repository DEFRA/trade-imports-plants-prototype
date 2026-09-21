import {
  equalsGate,
  includesGate
} from '../../../../model/obligations/helpers/index.js'
import { commodityType } from './commodity.js'

export const consignor = {
  id: '478148de-8e15-4c44-a435-15f24a1c177b',
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
  id: '26c11d80-6b9c-4211-9fad-1e47046658cb',
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
  id: '3c59568c-1954-4cae-9c96-65274ea68b1c',
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
  id: '33d7105c-776d-475d-8653-414f326182cd',
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
  id: '1d3e1a55-6e0e-4322-ae2c-48a43b6c7b71',
  name: 'consignmentNumber',
  status: 'optional'
}
