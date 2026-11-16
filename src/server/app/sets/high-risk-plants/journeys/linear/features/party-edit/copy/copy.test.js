import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const MAX = 12

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

  it('Should carry the INS address book field labels', () => {
    expect(copy.fields).toEqual({
      name: 'Name or organisation name',
      addressLine1: 'Address line 1',
      addressLine2: 'Address line 2 (optional)',
      townOrCity: 'Town or city',
      county: 'County (optional)',
      postcode: 'Postcode or Zip code',
      countryCode: 'Country',
      phone: 'Phone number',
      email: 'Email address'
    })
  })

  it('Should say the change reaches this notification only', () => {
    expect(copy.hint).toBe(
      'Changes apply to this notification only. Your address book is not changed.'
    )
  })

  it('Should carry the INS address book error messages', () => {
    expect(copy.errors.postcode.maxLength(MAX)).toBe(
      'Postcode must be 12 characters or fewer'
    )
    expect(copy.errors.email.format).toBe(
      'Enter an email address in the correct format'
    )
    expect(copy.errors.countryCode.required).toBe('Enter a country')
  })
})
