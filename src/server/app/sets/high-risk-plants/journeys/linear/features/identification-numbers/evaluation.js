import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import {
  supplierIdentificationNumber,
  producerIdentificationNumber,
  cropIdentificationNumber,
  consignmentNumber
} from '../../../../obligations/index.js'
export const evaluationBindings = feature('identification-numbers', [
  scalar({
    field: 'supplierIdentificationNumber',
    obligation: supplierIdentificationNumber
  }),
  scalar({
    field: 'producerIdentificationNumber',
    obligation: producerIdentificationNumber
  }),
  scalar({
    field: 'cropIdentificationNumber',
    obligation: cropIdentificationNumber
  }),
  scalar({ field: 'consignmentNumber', obligation: consignmentNumber })
])
