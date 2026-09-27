import { describe, expect, it } from 'vitest'

import { copy as captions } from '../../../src/server/app/sets/high-risk-plants/journeys/linear/flow/section-captions/copy/copy.en.js'
import { captionSections } from '../../../src/server/app/sets/high-risk-plants/journeys/linear/flow/section-captions/index.js'
import { findWords } from './find.js'
import { REPO_ROOT } from './repo.js'
import { buildReport } from './report.js'

// Expectations come from the real journey's own data, so a wording change
// upstream never breaks this test: only a change in how copy is laid out does.
const [firstSection] = captionSections
const captionText = captions.sections[firstSection.id]
const captionPages = firstSection.pages.map((page) => page.id)

describe('designer:words on the real journey', () => {
  it('Should find a section caption and every page that shows it', async () => {
    const result = await findWords({
      root: REPO_ROOT,
      text: captionText,
      setId: 'high-risk-plants'
    })
    const caption = result.copy.find(
      (entry) => entry.feature === 'section-captions'
    )
    expect(caption.keyPath).toBe(`sections.${firstSection.id}`)
    expect(caption.pages).toEqual(captionPages)
    expect(caption.welsh).toBe('translated')
    expect(result.sets[0].owner).toBe('real-service')
  })

  it('Should list the test that pins the caption', async () => {
    const result = await findWords({
      root: REPO_ROOT,
      text: captionText,
      setId: 'high-risk-plants'
    })
    const files = result.pinned.map((entry) => entry.file)
    expect(files).toContain(
      'src/server/app/sets/high-risk-plants/journeys/linear/flow/section-captions/copy/copy.test.js'
    )
  })

  it('Should report every string with Welsh, none missing', async () => {
    const report = await buildReport({
      root: REPO_ROOT,
      setId: 'high-risk-plants'
    })
    expect(report.counts.total).toBeGreaterThan(0)
    expect(report.counts.missing).toBe(0)
    expect(report.groups.at(-1).title).toContain('Shared by every set')
  })
})
