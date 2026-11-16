import { describe, it } from 'vitest'

import { pickerViewModelSuites } from '../../address-book-picker/test-support.js'
import { CONTACT_ADDRESS } from '../fields.js'
import { pagination, resultsHref } from './pagination.js'
import { pickerViewModel } from './index.js'

describe.each(
  pickerViewModelSuites({
    fieldName: CONTACT_ADDRESS,
    slug: 'consignment/contact/select',
    pickerViewModel,
    pagination,
    resultsHref
  })
)('$name', ({ cases }) => {
  it.each(cases)('$title', ({ check }) => check())
})
