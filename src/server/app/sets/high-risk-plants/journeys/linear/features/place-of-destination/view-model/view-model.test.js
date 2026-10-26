import { describe, it } from 'vitest'

import { pickerViewModelSuites } from '../../address-book-picker/test-support.js'
import { PLACE_OF_DESTINATION } from '../fields.js'
import { pagination, resultsHref } from './pagination.js'
import { pickerViewModel } from './index.js'

describe.each(
  pickerViewModelSuites({
    fieldName: PLACE_OF_DESTINATION,
    slug: 'destinations/select',
    pickerViewModel,
    pagination,
    resultsHref
  })
)('$name', ({ cases }) => {
  it.each(cases)('$title', ({ check }) => check())
})
