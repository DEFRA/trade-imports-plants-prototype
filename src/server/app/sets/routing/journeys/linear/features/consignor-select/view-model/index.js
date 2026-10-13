import { pickerViewModelFor } from '../../address-book-picker/view-model.js'
import { CONSIGNOR } from '../fields.js'
import { pagination } from './pagination.js'

export const pickerViewModel = pickerViewModelFor({
  fieldName: CONSIGNOR,
  pagination
})
