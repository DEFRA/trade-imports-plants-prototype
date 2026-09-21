import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import { DATE_STATES } from '../fields.js'
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

  it.each([
    ['en', copy],
    ['cy', cy]
  ])(
    'Should label and hint every date state the %s page can ask in, and no other',
    (locale, bundle) => {
      const states = [...DATE_STATES].toSorted()
      expect(
        Object.keys(bundle.dateLabels).toSorted(),
        `${locale}: every date state needs a label`
      ).toEqual(states)
      expect(
        Object.keys(bundle.dateHints).toSorted(),
        `${locale}: every date state needs a hint`
      ).toEqual(states)
    }
  )

  it('Should give each date state its own English label', () => {
    expect(copy.dateLabels).toEqual({
      potatoes: 'Expected date of arrival',
      'not-yet-arrived': 'Expected date of landing in Great Britain',
      'already-arrived': 'Date the consignment first arrived in Great Britain'
    })
  })

  it('Should say Great Britain in the plants labels, never England', () => {
    expect(copy.dateLabels['not-yet-arrived']).toContain('Great Britain')
    expect(copy.dateLabels['not-yet-arrived']).not.toContain('England')
    expect(copy.dateLabels['already-arrived']).toContain('Great Britain')
    expect(copy.dateLabels['already-arrived']).not.toContain('England')
  })

  it('Should translate Great Britain in the Welsh labels', () => {
    // Welsh mutates the proper noun after a preposition — "ym Mhrydain Fawr" —
    // so the pair is matched on the stem the two forms share.
    expect(cy.dateLabels['not-yet-arrived']).toContain('rydain Fawr')
    expect(cy.dateLabels['already-arrived']).toContain('rydain Fawr')
  })

  it('Should keep the potato label future-facing and cover a past date in the hint', () => {
    // Potatoes have no arrived state, so the label cannot switch. The hint is
    // what tells somebody whose potatoes are already here what to enter.
    expect(copy.dateLabels.potatoes).toBe('Expected date of arrival')
    expect(copy.dateHints).toEqual({
      potatoes:
        'For example, 27/3/2026. If the potatoes have already arrived, enter the date they arrived.',
      'not-yet-arrived': 'For example, 27/3/2026',
      'already-arrived': 'For example, 27/3/2026'
    })
  })

  it('Should carry the place-of-landing group the spec authored', () => {
    expect(copy.placeOfLanding).toEqual({
      label: 'Proposed place of landing',
      hint: 'Where the potatoes will enter Great Britain. Start typing to search by port name or code.',
      placeholder: 'Select a place of landing',
      noResults: 'No ports found'
    })
  })

  it('Should carry the title the animals service already uses', () => {
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
