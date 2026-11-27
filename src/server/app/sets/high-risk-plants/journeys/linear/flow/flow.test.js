import { describe, expect, it } from 'vitest'

import { sections } from './flow.js'

const SECTION_ORDER = [
  { id: 'start', pageIds: ['dashboard'] },
  {
    id: 'about-the-consignment',
    pageIds: ['commodity-type', 'commodities', 'commodity-details', 'origin']
  },
  {
    id: 'arrival-and-destination',
    pageIds: ['arrival-status', 'arrival-details', 'place-of-destination']
  },
  {
    id: 'consignment-parties',
    pageIds: [
      'consignor-select',
      'identification-numbers',
      'consignment-contact-select'
    ]
  },
  {
    id: 'review',
    pageIds: ['notification-view', 'declaration', 'confirmation']
  }
]

describe('#sections — the journey is ordered as five sections', () => {
  it('Should run the five sections in the order Overview lists them', () => {
    expect(
      sections.map((section) => ({
        id: section.id,
        pageIds: section.pages.map((page) => page.id)
      }))
    ).toEqual(SECTION_ORDER)
  })
})
