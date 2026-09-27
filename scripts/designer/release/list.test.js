import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { scaffoldSet } from '../../new-set/index.js'
import { formatList, listReleases } from './list.js'
import { makeTestRepo, removeTestRepo } from './test-repo.js'

let repoRoot

beforeAll(() => {
  repoRoot = makeTestRepo()
  scaffoldSet(
    { setId: 'plants-dr1', from: 'high-risk-plants', purpose: 'frozen' },
    { repoRoot, now: new Date('2026-06-01T09:00:00.000Z') }
  )
  scaffoldSet(
    { setId: 'plants-research-oct', from: 'plants-dr1', purpose: 'research' },
    { repoRoot, now: new Date('2026-09-01T09:00:00.000Z') }
  )
  const researchDir = path.join(
    repoRoot,
    'src/server/app/sets/plants-research-oct'
  )
  writeFileSync(path.join(researchDir, 'research-mode.md'), '# On\n')
  writeFileSync(
    path.join(researchDir, 'design-gaps.md'),
    '| Page | Wants |\n| --- | --- |\n| hub | chips |\n'
  )
})

afterAll(() => {
  removeTestRepo(repoRoot)
})

describe('list', () => {
  it('Should list every set in the chooser’s order with what it is', () => {
    expect(listReleases(repoRoot)).toEqual([
      {
        id: 'high-risk-plants',
        purpose: 'Real journey, updates weekly',
        from: '-',
        madeOn: '-',
        frozen: 'no',
        researchMode: 'off',
        designGaps: 0
      },
      {
        id: 'plants-research-oct',
        purpose: 'Research',
        from: 'plants-dr1',
        madeOn: '1 September 2026',
        frozen: 'no',
        researchMode: 'on',
        designGaps: 1
      },
      {
        id: 'plants-dr1',
        purpose: 'Frozen',
        from: 'high-risk-plants',
        madeOn: '1 June 2026',
        frozen: 'yes',
        researchMode: 'off',
        designGaps: 0
      },
      {
        id: 'sample-journey',
        purpose: 'Placeholder',
        from: '-',
        madeOn: '-',
        frozen: 'no',
        researchMode: 'off',
        designGaps: 0
      }
    ])
  })

  it('Should print a table with a heading row', () => {
    const [heading, first] = formatList(listReleases(repoRoot)).split('\n')

    expect(heading).toMatch(/^Release\s+Kind\s+Made from\s+Made on/)
    expect(first).toMatch(/^high-risk-plants\s+Real journey, updates weekly/)
  })
})
