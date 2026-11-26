import { describe, it } from 'vitest'

import { pickerViewModelSuites } from '../../address-book-picker/test-support.js'
import { PLACE_OF_DESTINATION } from '../fields.js'
import { pickerViewModel } from './index.js'

describe.each(
  pickerViewModelSuites({
    fieldName: PLACE_OF_DESTINATION,
    pickerViewModel
  })
)('$name', ({ cases }) => {
  it.each(cases)('$title', ({ check }) => check())
})
