import { describe, expect, it } from 'vitest'

import { fieldOf, listFieldOf, parseEntries } from './release-records.js'

const PATTERNS = `# Release patterns

Notes before the first entry are not an entry.

## Commodity search

- Kind: Custom
- Files: assets/styles.scss, assets/_commodity-search.scss
- Why not GOV.UK or MoJ:
  - GOV.UK: Select with autocomplete. No results list.
  - MoJ: Search. No results list.
- Asked by: "build it" (m-2026-10-27-1)
- Asked by: "keep it" (m-2026-11-02-1)

## Tabs

- Kind: Switch on
`

describe('parseEntries', () => {
  const [search, tabs] = parseEntries(PATTERNS)

  it('Should read one entry per section, with the line it starts on', () => {
    expect(
      parseEntries(PATTERNS).map(({ name, line }) => [name, line])
    ).toEqual([
      ['Commodity search', 5],
      ['Tabs', 15]
    ])
  })

  it('Should read each field, keeping a repeated one in order', () => {
    expect(fieldOf(search, 'Kind')).toBe('Custom')
    expect(search.fields['Asked by']).toEqual([
      '"build it" (m-2026-10-27-1)',
      '"keep it" (m-2026-11-02-1)'
    ])
    expect(fieldOf(tabs, 'Asked by')).toBe('')
  })

  it('Should read the indented lines under a field as its list', () => {
    expect(search.lists['Why not GOV.UK or MoJ']).toEqual([
      'GOV.UK: Select with autocomplete. No results list.',
      'MoJ: Search. No results list.'
    ])
  })

  it('Should split a comma-separated field into its values', () => {
    expect(listFieldOf(search, 'Files')).toEqual([
      'assets/styles.scss',
      'assets/_commodity-search.scss'
    ])
  })

  it("Should keep an entry's own lines, so two versions can be compared", () => {
    expect(tabs.text).toEqual(['- Kind: Switch on'])
  })
})
