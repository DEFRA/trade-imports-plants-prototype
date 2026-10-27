import { describe, expect, it } from 'vitest'

import { parseEntries } from '../lib/release-records.js'
import {
  releaseClassesIn,
  releaseCodeAddedBy,
  unsettledPatterns,
  withSharedLayout
} from './release-code.js'

const IDS = ['plants-working', 'high-risk-plants']

describe('#withSharedLayout', () => {
  it('Should turn a release layout back into the shared one, keeping the quotes', () => {
    expect(
      withSharedLayout(
        "{%- extends 'plants-working/layout.njk' %}\n<p>Hi</p>\n",
        IDS
      )
    ).toBe("{%- extends 'shared/layout.njk' %}\n<p>Hi</p>\n")
  })

  it("Should leave another set's layout as it is", () => {
    const text = '{% extends "plants-dr2/layout.njk" %}\n'

    expect(withSharedLayout(text, IDS)).toBe(text)
  })
})

describe('#releaseClassesIn', () => {
  it('Should list each release class once, and no real-service class', () => {
    expect(
      releaseClassesIn(
        '<div class="app-task-list app-plants-working-card app-plants-working-card__title" data-module="app-plants-working-card">',
        IDS
      )
    ).toEqual(['app-plants-working-card', 'app-plants-working-card__title'])
  })
})

describe('#releaseCodeAddedBy', () => {
  it('Should list the added lines that carry a release class or layout, and no context or removed line', () => {
    const patch = [
      '--- a/template.njk',
      '+++ b/template.njk',
      '-<div class="app-high-risk-plants-old">',
      ' <div class="app-high-risk-plants-kept">',
      '+{% extends "high-risk-plants/layout.njk" %}',
      '+<div class="app-high-risk-plants-card">',
      '+<p class="govuk-body">Hi</p>'
    ].join('\n')

    expect(releaseCodeAddedBy(patch, IDS)).toEqual([
      '{% extends "high-risk-plants/layout.njk" %}',
      '<div class="app-high-risk-plants-card">'
    ])
  })
})

describe('#unsettledPatterns', () => {
  const mandates = parseEntries(
    '## m-1\n\n- Copied from: plants-dr2 on 27 October 2026\n- Words: a\n\n## m-2\n\n- Words: b\n'
  )

  it('Should name an Option and a copied pattern with no fresh mandate, and skip a closed one', () => {
    const patterns = parseEntries(
      [
        '## Card',
        '',
        '- Asked by: "b" (m-2)',
        '- Status: Option',
        '',
        '## Callout',
        '',
        '- Copied from: plants-dr2 on 27 October 2026',
        '- Asked by: "a" (m-1)',
        '- Status: Open',
        '',
        '## Banner',
        '',
        '- Copied from: plants-dr2 on 27 October 2026',
        '- Asked by: "a" (m-1)',
        '- Status: Closed: built for real',
        ''
      ].join('\n')
    )

    expect(unsettledPatterns(patterns, mandates)).toEqual([
      '"Card" is still an Option. Choose it (make it Open) or drop it (close it) first.',
      '"Callout" was copied from plants-dr2 on 27 October 2026. Confirm you still want it: record a mandate in this release and add it as a second "Asked by" line.'
    ])
  })

  it('Should settle a copied pattern that cites a mandate recorded here', () => {
    const patterns = parseEntries(
      '## Callout\n\n- Copied from: plants-dr2 on 27 October 2026\n- Asked by: "a" (m-1)\n- Asked by: "b" (m-2)\n- Status: Open\n'
    )

    expect(unsettledPatterns(patterns, mandates)).toEqual([])
  })
})
