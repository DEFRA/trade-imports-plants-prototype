import { describe, expect, it } from 'vitest'

import { sections } from './flow.js'

// SCN-PLANTS-FLOW-001-A product-facing names, in Then order, mapped onto the
// section id and page ids flow.js actually exports.
const PRODUCT_SECTION_ORDER = [
  { id: 'start', then: 'the dashboard', pageIds: ['dashboard'] },
  {
    id: 'commodity',
    then: 'commodity type and the commodities list',
    pageIds: ['commodity-type', 'commodities']
  },
  {
    id: 'commodityDetails',
    then: 'the commodity-details entry sub-page',
    pageIds: ['commodity-details']
  },
  { id: 'origin', then: 'origin', pageIds: ['origin'] },
  {
    id: 'arrival',
    then: 'arrival status and arrival details',
    pageIds: ['arrival-status', 'arrival-details']
  },
  {
    id: 'destination',
    then: 'place of destination',
    pageIds: ['place-of-destination']
  },
  {
    id: 'parties',
    then: 'consignor and identification numbers',
    pageIds: ['consignor-select', 'identification-numbers']
  },
  {
    id: 'contact',
    then: 'contact address',
    pageIds: ['consignment-contact-select']
  },
  {
    id: 'review',
    then: 'check your answers, declaration and confirmation',
    pageIds: ['notification-view', 'declaration', 'confirmation']
  }
]

describe('#sections — the journey is ordered as nine sections', () => {
  it('Should run the nine product-facing sections in the specified order', () => {
    expect(
      sections.map((section) => ({
        id: section.id,
        pageIds: section.pages.map((page) => page.id)
      }))
    ).toEqual(PRODUCT_SECTION_ORDER.map(({ id, pageIds }) => ({ id, pageIds })))
  })
})
