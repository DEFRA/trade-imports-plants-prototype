import { describe, expect, it } from 'vitest'

import { itHoldsCopyAtEveryLeaf } from '../../../../../../../engine/test-support.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('#copy', () => {
  itHoldsCopyAtEveryLeaf(copy, cy)

  it('Should carry the consignor title and description in both languages', () => {
    expect(copy.title).toBe('Consignor')
    expect(cy.title).toBe('Anfonwr')
    expect(copy.description).toBe('This is the sender of the consignment.')
    expect(cy.description).toBe('Dyma anfonwr y llwyth.')
  })

  it('Should carry the not-in-address-book error in both languages', () => {
    expect(copy.errors.consignor).toBe('Select a consignor from the list')
    expect(cy.errors.consignor).toBe('Dewiswch anfonwr o’r rhestr')
  })
})
