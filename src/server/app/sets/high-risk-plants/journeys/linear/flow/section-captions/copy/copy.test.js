import { describe, expect, it } from 'vitest'

import { itHoldsCopyAtEveryLeaf } from '../../../../../../../engine/test-support.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('section-caption copy modules', () => {
  itHoldsCopyAtEveryLeaf(en, cy)

  it('Should name the sections the journey spec names', () => {
    expect(en.sections).toEqual({
      dashboard: 'Dashboard',
      aboutTheConsignment: 'About the consignment',
      arrival: 'Arrival',
      destination: 'Destination',
      addresses: 'Addresses'
    })
  })

  it('Should carry the spec Welsh for every section it names', () => {
    expect(cy.sections).toEqual({
      dashboard: 'Dangosfwrdd',
      aboutTheConsignment: 'Am y llwyth',
      arrival: 'Cyrraedd',
      destination: 'Cyrchfan',
      addresses: 'Cyfeiriadau'
    })
  })
})
