import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('#copy', () => {
  it.each([
    ['en', copy],
    ['cy', cy]
  ])(
    'Should hold a non-empty string or copy function at every %s leaf',
    (locale, bundle) => {
      for (const { path, value } of leaves(bundle)) {
        expect(isCopyLeaf(value), `${locale}: ${path} must be copy`).toBe(true)
      }
    }
  )

  it('Should carry the Edit details action the animals journey uses', () => {
    expect(copy.editDetails).toBe('Edit details')
    expect(cy.editDetails).toBe('Golygu manylion')
  })

  it('Should name every party in both languages', () => {
    expect(Object.keys(copy.parties)).toEqual([
      'consignor',
      'placeOfDestination',
      'contactAddress'
    ])
    expect(Object.keys(cy.parties)).toEqual(Object.keys(copy.parties))
    expect(copy.parties.contactAddress.current).toBe('Current contact address')
  })
})
