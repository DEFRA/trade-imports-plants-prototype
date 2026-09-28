import { appendFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { scaffoldSet } from '../../new-set/index.js'
import { formatList, listReleases } from './list.js'
import { commitAll, makeTestRepo, removeTestRepo } from './test-repo.js'

let repoRoot

const ARRIVAL_PAGE =
  'src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-details/page.js'

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
        designGaps: 0,
        realJourneyChanged: '-'
      },
      {
        id: 'plants-research-oct',
        purpose: 'Research',
        from: 'plants-dr1',
        madeOn: '1 September 2026',
        frozen: 'no',
        researchMode: 'on',
        designGaps: 1,
        realJourneyChanged: 0
      },
      {
        id: 'plants-dr1',
        purpose: 'Frozen',
        from: 'high-risk-plants',
        madeOn: '1 June 2026',
        frozen: 'yes',
        researchMode: 'off',
        designGaps: 0,
        realJourneyChanged: 0
      },
      {
        id: 'sample-journey',
        purpose: 'Placeholder',
        from: '-',
        madeOn: '-',
        frozen: 'no',
        researchMode: 'off',
        designGaps: 0,
        realJourneyChanged: '-'
      }
    ])
  })

  it('Should print a table with a heading row', () => {
    const [heading, first] = formatList(listReleases(repoRoot)).split('\n')

    expect(heading).toMatch(
      /^Release\s+Kind\s+Made from\s+Made on.*Design gaps\s+Real journey changed since$/
    )
    expect(first).toMatch(/^high-risk-plants\s+Real journey, updates weekly/)
  })

  describe('after the real team changes a page', () => {
    beforeAll(() => {
      commitAll(repoRoot, 'Start the releases')
      appendFileSync(path.join(repoRoot, ARRIVAL_PAGE), '// changed\n')
      commitAll(repoRoot, 'Weekly update: arrival details')
    })

    it('Should count the changed page for every release copied before it', () => {
      const changed = Object.fromEntries(
        listReleases(repoRoot).map((row) => [row.id, row.realJourneyChanged])
      )

      expect(changed).toEqual({
        'high-risk-plants': '-',
        'plants-research-oct': 1,
        'plants-dr1': 1,
        'sample-journey': '-'
      })
    })

    it('Should show the count in the drift column', () => {
      const dr1Line = formatList(listReleases(repoRoot))
        .split('\n')
        .find((line) => line.startsWith('plants-dr1 '))

      expect(dr1Line).toMatch(/\s1$/)
    })
  })
})
