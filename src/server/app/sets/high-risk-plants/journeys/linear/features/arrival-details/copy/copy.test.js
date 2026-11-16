import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import { DATE_STATES } from '../fields.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const LOCALES = { en: copy, cy }

describe('#copy', () => {
  it('Should hold a non-empty string or copy function at every leaf of both locales', () => {
    const offenders = Object.entries(LOCALES).flatMap(([locale, bundle]) =>
      leaves(bundle)
        .filter(({ value }) => !isCopyLeaf(value))
        .map(({ path }) => `${locale}: ${path}`)
    )

    expect(offenders).toEqual([])
  })

  it('Should label and hint exactly the date states the page can ask in, in both locales', () => {
    const states = [...DATE_STATES].toSorted()
    const keysOf = (field) =>
      Object.fromEntries(
        Object.entries(LOCALES).map(([locale, bundle]) => [
          locale,
          Object.keys(bundle[field]).toSorted()
        ])
      )

    expect(keysOf('dateLabels')).toEqual({ en: states, cy: states })
    expect(keysOf('dateHints')).toEqual({ en: states, cy: states })
  })

  it('Should give each date state its own English label', () => {
    expect(copy.dateLabels).toEqual({
      potatoes: 'Expected date of arrival',
      'not-yet-arrived': 'Expected date of landing in Great Britain',
      'already-arrived': 'Date the consignment first arrived in Great Britain'
    })
  })

  it('Should name Great Britain in both Welsh date labels by the stem of its Welsh name', () => {
    expect(cy.dateLabels['not-yet-arrived']).toContain('rydain Fawr')
    expect(cy.dateLabels['already-arrived']).toContain('rydain Fawr')
  })

  it('Should pin the exact date hint for each state', () => {
    expect(copy.dateHints).toEqual({
      potatoes:
        'For example, 27/3/2026. If the potatoes have already arrived, enter the date they arrived.',
      'not-yet-arrived': 'For example, 27/3/2026',
      'already-arrived': 'For example, 27/3/2026'
    })
  })

  it('Should pin the exact English place-of-landing label, hint, select text, search placeholder and no-results text', () => {
    expect(copy.placeOfLanding).toEqual({
      label: 'Proposed place of landing',
      hint: 'Select where the potatoes will enter Great Britain. Start typing to search by port or airport name or code.',
      selectText: 'Select a place of landing',
      searchPlaceholder: 'Select a place of landing',
      noResults: 'No ports found'
    })
  })

  it('Should pin the exact Welsh place-of-landing hint', () => {
    expect(cy.placeOfLanding.hint).toBe(
      'Dewiswch ble bydd y tatws yn dod i mewn i Brydain Fawr. Dechreuwch deipio i chwilio yn ôl enw neu god y porthladd neu’r maes awyr.'
    )
  })

  it('Should pin the exact English and Welsh page title', () => {
    expect(copy.title).toBe('Arrival details')
    expect(cy.title).toBe('Manylion cyrraedd')
  })

  it('Should ask the time on the 24-hour clock', () => {
    expect(copy.time.label).toBe('Expected time of arrival')
    expect(copy.time.hint).toBe('Use the 24-hour clock. For example, 14:30.')
  })

  it('Should carry the three arrival-date error sentences', () => {
    expect(copy.errors.arrivalDate).toEqual({
      required: 'Enter the arrival date',
      invalid: 'Enter a real arrival date',
      inFuture: 'The date the consignment arrived cannot be in the future'
    })
  })

  it('Should carry the time and place-of-landing error sentences', () => {
    expect(copy.errors.arrivalTime).toBe('Enter the expected time of arrival')
    expect(copy.errors.proposedPlaceOfLanding).toBe(
      'Select the proposed place of landing'
    )
  })
})
