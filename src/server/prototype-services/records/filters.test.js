import { describe, expect, it } from 'vitest'

import { openTabFor } from './filters.js'

const COUNTS = { byStatus: { draft: 2, submitted: 1, amend: 0 } }
const OWN_TABS = { drafts: ['draft'], submitted: ['submitted'] }

describe('#openTabFor', () => {
  it('Should open the tab in the address', () => {
    expect(openTabFor({ tab: 'drafts', status: [] }, COUNTS)).toBe('drafts')
  })

  it('Should open All when no tab is named, with the default tabs', () => {
    expect(openTabFor({ status: ['submitted'] }, COUNTS)).toBe('all')
  })

  it('Should open the first of the release’s own tabs with a row that passes the status filter', () => {
    expect(openTabFor({ status: ['submitted'] }, COUNTS, OWN_TABS)).toBe(
      'submitted'
    )
    expect(openTabFor({ status: [] }, COUNTS, OWN_TABS)).toBe('drafts')
  })

  it('Should fall back to the first tab when nothing matches', () => {
    expect(openTabFor({ status: ['amend'] }, COUNTS, OWN_TABS)).toBe('drafts')
  })
})
