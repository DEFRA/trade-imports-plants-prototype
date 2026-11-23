import { describe, it } from 'vitest'

import { pickerViewModelSuites } from '../../address-book-picker/test-support.js'
import { CONSIGNOR } from '../fields.js'
import { pickerViewModel } from './index.js'

describe.each(
  pickerViewModelSuites({
    fieldName: CONSIGNOR,
    pickerViewModel
  })
)('$name', ({ cases }) => {
  it.each(cases)('$title', ({ check }) => check())
})
