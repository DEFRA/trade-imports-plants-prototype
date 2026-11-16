import { describe, expect, it } from 'vitest'

import { itHoldsCopyAtEveryLeaf } from '../../../../../../../engine/test-support.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('#copy', () => {
  itHoldsCopyAtEveryLeaf(copy, cy)

  it('Should carry the Edit details action in both languages', () => {
    expect(copy.editDetails).toBe('Edit details')
    expect(cy.editDetails).toBe('Golygu manylion')
  })

  it('Should carry the search box and the selected address prefix in both languages', () => {
    expect(copy.search).toEqual({
      label: 'Search',
      hint: 'Name, address or country',
      button: 'Search'
    })
    expect(copy.selectedAddressPrefix).toBe('Selected address:')
    expect(cy.search).toEqual({
      label: 'Chwilio',
      hint: 'Enw, cyfeiriad neu wlad',
      button: 'Chwilio'
    })
    expect(cy.selectedAddressPrefix).toBe('Cyfeiriad a ddewiswyd:')
  })

  it('Should word the results heading and count the rows shown against the rows found', () => {
    expect(copy.resultsHeading).toBe('Select an address')
    expect(cy.resultsHeading).toBe('Dewiswch gyfeiriad')
    expect(copy.resultsCount(5, 13)).toBe('Showing 5 out of 13 results')
    expect(cy.resultsCount(5, 13)).toBe('Yn dangos 5 allan o 13 canlyniad')
  })

  it('Should carry the table, row and no-matches strings in both languages', () => {
    expect(copy.table).toEqual({
      selectHidden: 'Select',
      name: 'Name',
      address: 'Address',
      country: 'Country',
      actionsHidden: 'Actions'
    })
    expect(copy.noMatches).toBe('No addresses match your search.')
    expect(cy.noMatches).toBe(
      'Nid oes unrhyw gyfeiriadau’n cyfateb i’ch chwiliad.'
    )
    expect(cy.table.actionsHidden).toBe('Camau gweithredu')
    expect(copy.selectRowPrefix).toBe('Select')
    expect(cy.selectRowPrefix).toBe('Dewis')
    expect(cy.table.selectHidden).toBe('Dewis')
  })

  it('Should name the paging links rather than leave them in English', () => {
    expect(copy.pagination).toEqual({ previous: 'Previous', next: 'Next' })
    expect(cy.pagination).toEqual({ previous: 'Blaenorol', next: 'Nesaf' })
  })

  it('Should name every party in both languages', () => {
    expect(Object.keys(copy.parties)).toEqual([
      'consignor',
      'placeOfDestination',
      'contactAddress'
    ])
    expect(Object.keys(cy.parties)).toEqual(Object.keys(copy.parties))
    expect(copy.parties.contactAddress.current).toBe('Current contact address')
  })
})
