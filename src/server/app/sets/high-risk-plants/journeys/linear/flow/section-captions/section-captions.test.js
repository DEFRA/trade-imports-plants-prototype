import { describe, expect, it } from 'vitest'

import { sections } from '../flow.js'
import { captionSections, sectionCaptionOf } from './index.js'
import { copy as en } from './copy/copy.en.js'

// The page a reader lands on, and the section it should name. One case per
// page so a mis-filed page names itself in the failure.
const ABOUT_THE_CONSIGNMENT = 'About the consignment'
const ARRIVAL = 'Arrival'

const CAPTIONED = [
  ['dashboard', 'Dashboard'],
  ['commodity-type', ABOUT_THE_CONSIGNMENT],
  ['commodities', ABOUT_THE_CONSIGNMENT],
  ['commodity-details', ABOUT_THE_CONSIGNMENT],
  ['origin', ABOUT_THE_CONSIGNMENT],
  ['arrival-status', ARRIVAL],
  ['arrival-details', ARRIVAL],
  ['place-of-destination', 'Destination']
]

// Pages that open straight into their heading. Still empty: the spec rules the
// overview hub, the contact page, check your answers, declaration and
// confirmation bare, and each of those page increments adds itself here as it
// lands.
const BARE = [
  'confirmation',
  'declaration',
  'consignment-contact-select',
  'notification-view'
]

// `flow.js` exports no flat page list — the engine computes one privately in
// `flow/prerequisites.js` — so the journey's pages come from its sections.
const flowPageIds = sections.flatMap((section) =>
  section.pages.map((page) => page.id)
)

describe('#sectionCaptionOf — the section a page names above its heading', () => {
  it.each(CAPTIONED)('Should caption %s "%s"', (pageId, expected) => {
    expect(sectionCaptionOf(pageId)).toBe(expected)
  })

  it('Should leave every page the journey rules bare uncaptioned', () => {
    for (const pageId of BARE) {
      expect(
        sectionCaptionOf(pageId),
        `${pageId} is listed as bare and must carry no caption`
      ).toBeUndefined()
    }
  })

  it('Should leave a page it has never heard of uncaptioned', () => {
    expect(sectionCaptionOf('not-a-page')).toBeUndefined()
    expect(sectionCaptionOf(undefined)).toBeUndefined()
  })
})

describe('the caption map covers the journey', () => {
  it('Should see the journey pages the flow places in sections', () => {
    expect(flowPageIds.length).toBeGreaterThan(0)
  })

  it('Should decide every flow page, either captioning it or listing it as bare', () => {
    const undecided = flowPageIds.filter(
      (pageId) =>
        sectionCaptionOf(pageId) === undefined && !BARE.includes(pageId)
    )
    expect(
      undecided,
      'a new journey page must be given a caption or added to the bare list'
    ).toEqual([])
  })

  it('Should file each page under exactly one section', () => {
    const pageIds = captionSections.flatMap((section) =>
      section.pages.map((page) => page.id)
    )
    expect(pageIds).toHaveLength(new Set(pageIds).size)
  })

  it('Should back every section with a caption string', () => {
    for (const { id } of captionSections) {
      expect(en.sections[id], `${id} must have a caption`).toBeTruthy()
    }
  })

  it('Should leave no caption string unused by any section', () => {
    const sectionIds = captionSections.map((section) => section.id)
    expect(Object.keys(en.sections).toSorted()).toEqual(sectionIds.toSorted())
  })
})
