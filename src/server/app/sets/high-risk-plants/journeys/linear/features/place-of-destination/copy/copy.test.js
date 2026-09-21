import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import { copy as hubEn } from '../../hub/copy/copy.en.js'
import { copy as hubCy } from '../../hub/copy/copy.cy.js'
import { DESTINATION_STATES } from '../fields.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const SENTINEL_ROWS_SHOWN = 5
const SENTINEL_ROWS_FOUND = 13

const PAGE_NAME_EN = 'Place of destination'
const PAGE_NAME_CY = 'Man cyrchfan'

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

  it('Should carry the title the animals service already uses', () => {
    expect(copy.title).toBe(PAGE_NAME_EN)
    expect(cy.title).toBe(PAGE_NAME_CY)
  })

  it('Should call the page Place of destination until the consignment is here', () => {
    // Potatoes are never asked whether the consignment has arrived, so they
    // are asked the same question as a consignment still on its way.
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
    // Reg 26(2)(b) asks a post-arrival notification for the current location,
    // and a consignment that has landed but not reached its destination has
    // to give the destination rather than the port.
    expect(copy.descriptions['already-arrived']).toContain(
      'still on its way to its intended destination'
    )
  })

  it('Should carry the picker chrome the animals party picker uses', () => {
    expect(copy.search).toEqual({
      label: 'Search',
      hint: 'Name, address or country',
      button: 'Search'
    })
    expect(copy.table).toEqual({
      selectHidden: 'Select',
      name: 'Name',
      address: 'Address',
      country: 'Country',
      actionsHidden: 'Actions'
    })
    expect(copy.selectedAddressPrefix).toBe('Selected address:')
    expect(copy.noMatches).toBe('No addresses match your search.')
  })

  it('Should carry the Welsh picker chrome the animals party picker uses', () => {
    // The English is byte-identical to the animals picker's, so the Welsh has
    // to be its Welsh — copy-parity.test.js only proves cy differs from en.
    expect(cy.search.button).toBe('Chwilio')
    expect(cy.noMatches).toBe(
      'Nid oes unrhyw gyfeiriadau’n cyfateb i’ch chwiliad.'
    )
    expect(cy.table.actionsHidden).toBe('Camau gweithredu')
    expect(cy.selectRowPrefix).toBe('Dewis')
    expect(cy.table.selectHidden).toBe('Dewis')
  })

  it('Should name the paging links rather than leave them in English', () => {
    expect(copy.pagination).toEqual({ previous: 'Previous', next: 'Next' })
    expect(cy.pagination).toEqual({ previous: 'Blaenorol', next: 'Nesaf' })
  })

  it('Should count the rows shown against the rows found', () => {
    expect(copy.resultsCaption(SENTINEL_ROWS_SHOWN, SENTINEL_ROWS_FOUND)).toBe(
      'Showing 5 of 13 addresses'
    )
    expect(cy.resultsCaption(SENTINEL_ROWS_SHOWN, SENTINEL_ROWS_FOUND)).toBe(
      'Yn dangos 5 o 13 cyfeiriad'
    )
  })

  it('Should carry the error sentence the animals picker already uses', () => {
    expect(copy.errors.placeOfDestination).toBe(
      'Select a place of destination from the list'
    )
    expect(cy.errors.placeOfDestination).toBe(
      'Dewiswch fan cyrchfan o’r rhestr'
    )
  })
})
