import { describe, expect, it } from 'vitest'
import { itHoldsCopyAtEveryLeaf } from '../../../../../../../engine/test-support.js'
import { IDENTIFICATION_FIELDS } from '../fields.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'
describe('identification numbers copy', () => {
  itHoldsCopyAtEveryLeaf(copy, cy)

  it.each([copy, cy])('Should label and explain every field', (bundle) => {
    expect(Object.keys(bundle.fields)).toEqual(IDENTIFICATION_FIELDS)
    expect(Object.keys(bundle.errors)).toEqual(IDENTIFICATION_FIELDS)
  })
  it('Should carry the specified title and optional reference label', () => {
    expect(copy.title).toBe('Identification numbers')
    expect(copy.fields.consignmentNumber.label).toBe(
      'Consignment number (optional)'
    )
  })
})
