import { pickerViewModelFor } from '../../address-book-picker/view-model.js'
import { PLACE_OF_DESTINATION } from '../fields.js'
import { pagination } from './pagination.js'

export const pickerViewModel = pickerViewModelFor({
  fieldName: PLACE_OF_DESTINATION,
  pagination
})
