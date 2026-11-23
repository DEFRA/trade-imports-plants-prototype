import { describe, expect, it } from 'vitest'

import { itHoldsCopyAtEveryLeaf } from '../../../../../../../engine/test-support.js'
import { copy as hubEn } from '../../hub/copy/copy.en.js'
import { copy as hubCy } from '../../hub/copy/copy.cy.js'
import { DESTINATION_STATES } from '../fields.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const PAGE_NAME_EN = 'Place of destination'
const PAGE_NAME_CY = 'Man cyrchfan'

describe('#copy', () => {
  itHoldsCopyAtEveryLeaf(copy, cy)

  it.each([
    ['en', copy],
    ['cy', cy]
  ])(
    'Should head and describe every state the %s page can ask in, and no other',
    (locale, bundle) => {
      const states = [...DESTINATION_STATES].toSorted()
      expect(
        Object.keys(bundle.headings).toSorted(),
        `${locale}: every state needs a heading`
      ).toEqual(states)
      expect(
        Object.keys(bundle.descriptions).toSorted(),
        `${locale}: every state needs a description`
      ).toEqual(states)
    }
  )

  it('Should title the page Place of destination in English and Welsh', () => {
    expect(copy.title).toBe(PAGE_NAME_EN)
    expect(cy.title).toBe(PAGE_NAME_CY)
  })

  it('Should call the page Place of destination until the consignment is here', () => {
    expect(copy.headings.potatoes).toBe(PAGE_NAME_EN)
    expect(copy.headings['not-yet-arrived']).toBe(PAGE_NAME_EN)
    expect(copy.descriptions.potatoes).toBe(
      copy.descriptions['not-yet-arrived']
    )
    expect(cy.headings.potatoes).toBe(PAGE_NAME_CY)
    expect(cy.headings['not-yet-arrived']).toBe(PAGE_NAME_CY)
    expect(cy.descriptions.potatoes).toBe(cy.descriptions['not-yet-arrived'])
  })

  it.each([
    ['en', copy, hubEn],
    ['cy', cy, hubCy]
  ])(
    'Should head the %s page before arrival with the name the hub task row uses',
    (locale, bundle, hub) => {
      expect(bundle.title, `${locale}: hub row`).toBe(
        hub.rows.destination.title
      )
      expect(bundle.headings.potatoes, `${locale}: potatoes`).toBe(bundle.title)
      expect(
        bundle.headings['not-yet-arrived'],
        `${locale}: not-yet-arrived`
      ).toBe(bundle.title)
    }
  )

  it('Should ask where the consignment is once it has arrived', () => {
    expect(copy.headings['already-arrived']).toBe(
      'Where is the consignment now?'
    )
    expect(cy.headings['already-arrived']).toBe('Ble mae’r llwyth nawr?')
  })

  it('Should promise a spot check in every description', () => {
    for (const description of Object.values(copy.descriptions)) {
      expect(description).toContain('spot check')
    }
    for (const description of Object.values(cy.descriptions)) {
      expect(description).toContain('archwiliad ar hap')
    }
  })

  it('Should tell a consignment still in transit to give its destination', () => {
    expect(copy.descriptions['already-arrived']).toContain(
      'still on its way to its intended destination'
    )
  })

  it('Should carry the place-of-destination error sentence in English and Welsh', () => {
    expect(copy.errors.placeOfDestination).toBe(
      'Select a place of destination from the list'
    )
    expect(cy.errors.placeOfDestination).toBe(
      'Dewiswch fan cyrchfan o’r rhestr'
    )
  })
})
