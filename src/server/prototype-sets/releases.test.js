import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  PLACEHOLDER,
  REAL_JOURNEY,
  byChooserOrder,
  countDesignGaps,
  longDate,
  releaseInfoFor
} from './releases.js'

let setsDir

const makeSet = (setId, { release, researchMode, designGaps } = {}) => {
  const setDir = path.join(setsDir, setId)
  mkdirSync(setDir, { recursive: true })
  if (release) {
    writeFileSync(path.join(setDir, 'release.json'), JSON.stringify(release))
  }
  if (researchMode) {
    writeFileSync(path.join(setDir, 'research-mode.md'), '# Research mode\n')
  }
  if (designGaps) {
    writeFileSync(path.join(setDir, 'design-gaps.md'), designGaps)
  }
}

const info = (setId) => releaseInfoFor(setId, { setsDir })

beforeEach(() => {
  setsDir = mkdtempSync(path.join(tmpdir(), 'releases-'))
})

afterEach(() => {
  rmSync(setsDir, { recursive: true, force: true })
})

describe('releaseInfoFor', () => {
  it('Should call high-risk-plants the real journey', () => {
    makeSet(REAL_JOURNEY)

    expect(info(REAL_JOURNEY)).toEqual(
      expect.objectContaining({
        kind: 'real',
        tag: 'Real journey, updates weekly'
      })
    )
  })

  it('Should call sample-journey a placeholder', () => {
    makeSet(PLACEHOLDER)

    expect(info(PLACEHOLDER).tag).toBe('Placeholder')
  })

  it.each([
    [{ purpose: 'working', frozen: false }, 'Working release'],
    [{ purpose: 'research', frozen: false }, 'Research'],
    [{ purpose: 'working', frozen: true }, 'Frozen'],
    [{ purpose: 'research', frozen: true }, 'Frozen']
  ])('Should tag a release recorded as %o "%s"', (record, tag) => {
    makeSet('plants-dr2', {
      release: { ...record, from: REAL_JOURNEY, createdAt: 'x' }
    })

    expect(info('plants-dr2').tag).toBe(tag)
  })

  it('Should treat a set with no release record as a working release', () => {
    makeSet('citrus-fruit')

    expect(info('citrus-fruit')).toEqual(
      expect.objectContaining({ kind: 'working', from: null, createdAt: null })
    )
  })

  it('Should see research mode and count design gaps', () => {
    makeSet('plants-research-oct', {
      release: { purpose: 'research' },
      researchMode: true,
      designGaps:
        '| Page | Wants | Built |\n| --- | --- | --- |\n| hub | chips | tags |\n| origin | modal | page |\n'
    })

    expect(info('plants-research-oct')).toEqual(
      expect.objectContaining({ researchMode: true, designGaps: 2 })
    )
  })
})

describe('countDesignGaps', () => {
  it('Should count list items when there is no table', () => {
    expect(countDesignGaps('# Gaps\n\n- one\n- two\n* three\n')).toBe(3)
  })

  it('Should count nothing in an empty file', () => {
    expect(countDesignGaps('')).toBe(0)
  })
})

describe('byChooserOrder', () => {
  it('Should list real, working, research, frozen, placeholder, newest first in each', () => {
    const sets = [
      { setId: PLACEHOLDER, order: 4, createdAt: null },
      { setId: 'plants-old', order: 1, createdAt: '2026-01-01' },
      { setId: 'plants-frozen', order: 3, createdAt: '2026-05-01' },
      { setId: REAL_JOURNEY, order: 0, createdAt: null },
      { setId: 'plants-new', order: 1, createdAt: '2026-09-01' },
      { setId: 'plants-research', order: 2, createdAt: '2026-03-01' }
    ]

    expect(sets.toSorted(byChooserOrder).map(({ setId }) => setId)).toEqual([
      REAL_JOURNEY,
      'plants-new',
      'plants-old',
      'plants-research',
      'plants-frozen',
      PLACEHOLDER
    ])
  })
})

describe('longDate', () => {
  it('Should write a date the GOV.UK way', () => {
    expect(longDate('2026-09-27T10:00:00.000Z')).toBe('27 September 2026')
  })

  it('Should use the UK calendar day, not the UTC one', () => {
    expect(longDate('2026-09-27T23:28:00.000Z')).toBe('28 September 2026')
  })
})
