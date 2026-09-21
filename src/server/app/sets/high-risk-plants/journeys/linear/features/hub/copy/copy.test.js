import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import { GROUPS } from '../controller.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('#copy', () => {
  it('Should hold a non-empty string or copy function at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      expect(isCopyLeaf(value), `${path} must be copy`).toBe(true)
    }
  })

  it('Should name the four numbered groups in the design order', () => {
    expect(Object.values(copy.groups)).toEqual([
      '1. About the consignment',
      '2. Arrival and destination',
      '3. Consignment parties',
      '4. Check and submit'
    ])
  })

  it('Should carry the spec Welsh for every group it names', () => {
    expect(Object.values(cy.groups)).toEqual([
      '1. Am y llwyth',
      '2. Cyrraedd a chyrchfan',
      '3. Partïon y llwyth',
      '4. Gwirio a chyflwyno'
    ])
  })

  it('Should caption every group the controller renders, and no other', () => {
    expect(Object.keys(copy.groups)).toEqual(GROUPS.map((group) => group.id))
  })

  it('Should title the commodities row in both locales', () => {
    expect(copy.rows.commodities).toEqual({ title: 'What are you importing?' })
    expect(cy.rows.commodities).toEqual({
      title: 'Beth ydych chi’n ei fewnforio?'
    })
  })

  it('Should title the origin row in both locales', () => {
    expect(copy.rows.origin).toEqual({
      title: 'Where is this consignment coming from?'
    })
    expect(cy.rows.origin).toEqual({ title: 'O ble mae’r llwyth hwn yn dod?' })
  })

  it('Should title the arrival row in both locales', () => {
    // The animals string for the same task, and the Welsh the spec gives the
    // arrival-details page (journey-spec.json pages[arrival-details].titleCy).
    expect(copy.rows.arrival).toEqual({ title: 'Arrival details' })
    expect(cy.rows.arrival).toEqual({ title: 'Manylion cyrraedd' })
  })

  it('Should title the destination row in both locales', () => {
    // The animals string for the same party, and the Welsh the spec gives the
    // page (journey-spec.json pages[place-of-destination].titleCy).
    expect(copy.rows.destination).toEqual({ title: 'Place of destination' })
    expect(cy.rows.destination).toEqual({ title: 'Man cyrchfan' })
  })

  it('Should hold only the rows the journey has landed', () => {
    expect(Object.keys(copy.rows)).toEqual([
      'review',
      'contact',
      'identificationNumbers',
      'consignor',
      'commodities',
      'origin',
      'arrival',
      'destination'
    ])
  })
})

it('Should title the consignor row in both locales', () => {
  expect(copy.rows.consignor).toEqual({ title: 'Consignor or exporter' })
  expect(cy.rows.consignor).toEqual({ title: 'Anfonwr neu allforiwr' })
})

it('Should title the contact row in both locales', () => {
  expect(copy.rows.contact.title).toBe('Contact address for consignment')
  expect(cy.rows.contact.title).toBe('Cyfeiriad cyswllt ar gyfer y llwyth')
})

it('Should title the review row in both locales', () => {
  expect(copy.rows.review.title).toBe('Check and submit')
  expect(cy.rows.review.title).toBe('Gwirio a chyflwyno')
})
