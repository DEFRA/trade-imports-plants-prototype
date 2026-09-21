import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import { PLANTS_WOOD_DAYS_AFTER_ARRIVAL } from '../../timing-windows.js'
import { ARRIVAL_STATUSES } from '../statuses.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const SENTINEL_DAYS = 9

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

  it('Should label every arrival status the page offers, and no other', () => {
    expect(Object.keys(copy.statusLabels)).toEqual([...ARRIVAL_STATUSES])
    expect(Object.keys(cy.statusLabels)).toEqual([...ARRIVAL_STATUSES])
  })

  it('Should hint every arrival status the page offers, and no other', () => {
    expect(Object.keys(copy.statusHints)).toEqual([...ARRIVAL_STATUSES])
    expect(Object.keys(cy.statusHints)).toEqual([...ARRIVAL_STATUSES])
  })

  it('Should say Great Britain in the heading, never England', () => {
    expect(copy.title).toBe('Has the consignment arrived in Great Britain?')
    expect(copy.legend).toBe(copy.title)
    expect(copy.title).not.toContain('England')
  })

  it('Should translate Great Britain in the Welsh heading', () => {
    expect(cy.title).toBe('Ydy’r llwyth wedi cyrraedd Prydain Fawr?')
    expect(cy.legend).toBe(cy.title)
  })

  it('Should carry the spec labels and error sentence', () => {
    expect(Object.values(copy.statusLabels)).toEqual([
      'Yes, it has already arrived',
      'No, it has not arrived yet'
    ])
    expect(copy.errors.arrivalStatus).toBe(
      'Select whether the consignment has arrived'
    )
  })

  it('Should carry the machine-draft Welsh for both labels and the error', () => {
    expect(Object.values(cy.statusLabels)).toEqual([
      'Ydy, mae wedi cyrraedd yn barod',
      'Nac ydy, nid yw wedi cyrraedd eto'
    ])
    expect(cy.errors.arrivalStatus).toBe('Dewiswch a yw’r llwyth wedi cyrraedd')
  })

  it('Should name the plants and wood window in the post-arrival hint', () => {
    expect(
      copy.statusHints['already-arrived'](PLANTS_WOOD_DAYS_AFTER_ARRIVAL)
    ).toBe(
      'You are making a post-arrival notification. It must be made no later than 4 days after the date of arrival. You will give the date it arrived and where it is now.'
    )
  })

  it.each([
    ['en', copy, `${SENTINEL_DAYS} days`],
    ['cy', cy, `${SENTINEL_DAYS} diwrnod`]
  ])(
    'Should quote whatever day count the %s post-arrival hint is handed rather than a literal',
    (locale, bundle, expected) => {
      expect(
        bundle.statusHints['already-arrived'](SENTINEL_DAYS),
        locale
      ).toContain(expected)
    }
  )

  it('Should quote no window in the pre-arrival hint', () => {
    expect(copy.statusHints['not-yet-arrived']).toBe(
      'You are making a pre-arrival notification. You will give the expected date of landing and the intended destination.'
    )
    expect(cy.statusHints['not-yet-arrived']).toBe(
      'Rydych yn gwneud hysbysiad cyn cyrraedd. Byddwch yn rhoi’r dyddiad glanio disgwyliedig a’r cyrchfan arfaethedig.'
    )
  })
})
