import { describe, expect, it } from 'vitest'

import { leaves, isCopyLeaf } from '../../../../../../../shared/copy-leaves.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('section-caption copy modules', () => {
  it.each([
    ['en', en],
    ['cy', cy]
  ])('Should keep every %s leaf valid copy', (locale, copy) => {
    for (const { path, value } of leaves(copy)) {
      expect(isCopyLeaf(value), `${locale}: ${path} must be copy`).toBe(true)
    }
  })

  it('Should name the sections the journey spec names', () => {
    expect(en.sections).toEqual({
      dashboard: 'Dashboard',
      aboutTheConsignment: 'About the consignment',
      arrival: 'Arrival',
      destination: 'Destination',
      consignmentParties: 'Consignment parties'
    })
  })

  it('Should carry the spec Welsh for every section it names', () => {
    expect(cy.sections).toEqual({
      dashboard: 'Dangosfwrdd',
      aboutTheConsignment: 'Am y llwyth',
      arrival: 'Cyrraedd',
      destination: 'Cyrchfan',
      consignmentParties: 'Partïon y llwyth'
    })
  })
})
