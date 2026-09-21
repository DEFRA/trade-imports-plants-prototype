import { describe, expect, it } from 'vitest'
import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import { IDENTIFICATION_FIELDS } from '../fields.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'
describe('identification numbers copy', () => {
  it.each([copy, cy])('Should label and explain every field', (bundle) => {
    expect(Object.keys(bundle.fields)).toEqual(IDENTIFICATION_FIELDS)
    expect(Object.keys(bundle.errors)).toEqual(IDENTIFICATION_FIELDS)
    for (const { value } of leaves(bundle)) {
      expect(isCopyLeaf(value)).toBe(true)
    }
  })
  it('Should carry the specified title and optional reference label', () => {
    expect(copy.title).toBe('Identification numbers')
    expect(copy.fields.consignmentNumber.label).toBe(
      'Consignment number (optional)'
    )
  })
})
