import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const SENTINEL_ROWS_SHOWN = 5
const SENTINEL_ROWS_FOUND = 13

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

  it('Should carry the consignor question and hint in both languages', () => {
    expect(copy.title).toBe('Consignor or exporter')
    expect(cy.title).toBe('Anfonwr neu allforiwr')
    expect(copy.description).toBe('This is the sender of the consignment.')
    expect(cy.description).toBe('Dyma anfonwr y llwyth.')
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
    expect(copy.errors.consignor).toBe('Select a consignor from the list')
    expect(cy.errors.consignor).toBe('Dewiswch anfonwr o’r rhestr')
  })
})
