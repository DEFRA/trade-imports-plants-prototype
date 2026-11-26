import { describe, it } from 'vitest'

import { pickerViewModelSuites } from '../../address-book-picker/test-support.js'
import { CONTACT_ADDRESS } from '../fields.js'
import { pickerViewModel } from './index.js'

describe.each(
  pickerViewModelSuites({
    fieldName: CONTACT_ADDRESS,
    pickerViewModel
  })
)('$name', ({ cases }) => {
  it.each(cases)('$title', ({ check }) => check())
})
