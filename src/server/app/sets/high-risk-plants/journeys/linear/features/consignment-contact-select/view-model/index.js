import { pickerViewModelFor } from '../../address-book-picker/view-model.js'
import { CONTACT_ADDRESS } from '../fields.js'
import { pagination } from './pagination.js'

export const pickerViewModel = pickerViewModelFor({
  fieldName: CONTACT_ADDRESS,
  pagination
})
