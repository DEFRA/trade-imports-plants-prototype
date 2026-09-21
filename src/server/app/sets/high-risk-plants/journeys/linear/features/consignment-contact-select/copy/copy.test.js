import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import { installHighRiskPlantsJourney } from '../../../test-support.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../../engine/test-support.js'
import * as contact from '../controller.js'
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

  it('Should carry the contact question and the copying sentence in both languages', () => {
    expect(copy.title).toBe('Contact address for consignment')
    expect(cy.title).toBe('Cyfeiriad cyswllt ar gyfer y llwyth')
    expect(copy.description).toBe(
      'Selecting a contact copies their name and address into this notification.'
    )
    expect(cy.description).toBe(
      "Mae dewis cyswllt yn copïo eu henw a'u cyfeiriad i'r hysbysiad hwn."
    )
  })

  it('Should carry the picker chrome the sibling party pickers use', () => {
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

  it('Should carry the Welsh picker chrome the sibling party pickers use', () => {
    // The English is byte-identical to the consignor picker's, so the Welsh has
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

  it('Should carry the error sentence for an address the book does not hold', () => {
    expect(copy.errors.contactAddress).toBe(
      'Select a contact address from the list'
    )
    expect(cy.errors.contactAddress).toBe(
      'Dewiswch gyfeiriad cyswllt o’r rhestr'
    )
  })
})

describe('GET contact — copy reaches the view', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })
  beforeEach(() => store.clear())

  it('Should supply the feature copy module and the shared chrome copy', async () => {
    const get = contact.routes.find((route) => route.method === 'GET').handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(copy.title)
    expect(result.view.context.heading).toBe(copy.title)
    expect(result.view.context.description).toBe(copy.description)
    expect(result.view.context.sharedCopy.saveActions.saveAndContinue).toBe(
      'Save and continue'
    )
  })
})
