import { describe, expect, it } from 'vitest'
import {
  activeOnCommits,
  isRuleFile,
  onCommitBody,
  onTitle,
  parseResearchMode,
  revertTitle,
  sortChanges,
  unloggedFiles
} from './research-mode.js'

const SET = 'plants-research-arrival-202610'
const SET_DIR = `src/server/app/sets/${SET}`
const CONTROLLER = 'journeys/linear/features/arrival-details/controller.js'

const LOG = `# Research mode for ${SET}

| Page | File | What participants can now do | What the real service does |
|---|---|---|---|
| arrival-details | \`${CONTROLLER}\` | Leave the arrival date blank | Asks for the arrival date |
| arrival-details | obligations/sections/arrival.js | Submit without an arrival date | Will not submit without one |
`

describe('titles', () => {
  it('Should title the research-mode commit with the set id', () => {
    expect(onTitle(SET)).toBe(`Research mode on for ${SET}`)
  })

  it('Should match the subject git revert gives that commit', () => {
    expect(revertTitle(SET)).toBe(`Revert "Research mode on for ${SET}"`)
  })
})

describe('parseResearchMode', () => {
  it('Should read one rule per table row after the header', () => {
    expect(parseResearchMode(LOG)).toEqual([
      {
        page: 'arrival-details',
        file: CONTROLLER,
        now: 'Leave the arrival date blank',
        real: 'Asks for the arrival date'
      },
      {
        page: 'arrival-details',
        file: 'obligations/sections/arrival.js',
        now: 'Submit without an arrival date',
        real: 'Will not submit without one'
      }
    ])
  })

  it('Should find no rules in a log with only a header', () => {
    expect(
      parseResearchMode('| Page | File | Now | Real |\n|---|---|---|---|\n')
    ).toEqual([])
  })
})

describe('isRuleFile', () => {
  it.each([
    ['research-mode.md', true],
    [CONTROLLER, true],
    ['obligations/sections/arrival.js', true],
    ['journeys/linear/features/arrival-details/template.njk', false],
    ['journeys/linear/features/arrival-details/copy/copy.en.js', false],
    ['research-session.json', false]
  ])('Should say %s is a rule file: %s', (file, expected) => {
    expect(isRuleFile(file)).toBe(expected)
  })
})

describe('sortChanges', () => {
  it('Should take rule files in the set and leave everything else alone', () => {
    const sorted = sortChanges(SET, [
      { code: ' M', path: `${SET_DIR}/${CONTROLLER}` },
      { code: '??', path: `${SET_DIR}/research-mode.md` },
      { code: ' M', path: `${SET_DIR}/research-session.json` },
      { code: ' M', path: 'src/server/app/shared/layout.njk' },
      {
        code: ' M',
        path: 'src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-details/controller.js'
      }
    ])
    expect(sorted.rules.map((rule) => rule.relative)).toEqual([
      CONTROLLER,
      'research-mode.md'
    ])
    expect(sorted.leftAlone).toHaveLength(3)
    expect(sorted.deleted).toEqual([])
  })

  it('Should report a deleted rule file', () => {
    const removed = { code: ' D', path: `${SET_DIR}/${CONTROLLER}` }
    expect(sortChanges(SET, [removed]).deleted).toEqual([removed.path])
  })
})

describe('unloggedFiles', () => {
  it('Should list a changed rule file the log does not name', () => {
    const rules = [
      { relative: CONTROLLER },
      { relative: 'research-mode.md' },
      { relative: 'journeys/linear/features/origin/controller.js' }
    ]
    expect(unloggedFiles(rules, LOG)).toEqual([
      'journeys/linear/features/origin/controller.js'
    ])
  })
})

describe('activeOnCommits', () => {
  const on = (sha) => ({ sha, subject: onTitle(SET), body: '' })
  const revertOf = (sha) => ({
    sha: 'f'.repeat(40),
    subject: revertTitle(SET),
    body: `This reverts commit ${sha}.`
  })

  it('Should treat an unreverted research-mode commit as active', () => {
    expect(activeOnCommits(SET, [on('a'.repeat(40))])).toHaveLength(1)
  })

  it('Should treat a reverted research-mode commit as inactive', () => {
    const sha = 'b'.repeat(40)
    expect(activeOnCommits(SET, [revertOf(sha), on(sha)])).toEqual([])
  })

  it('Should ignore a commit for a release whose id starts the same', () => {
    expect(
      activeOnCommits(SET, [
        { sha: 'c'.repeat(40), subject: `${onTitle(SET)}-2`, body: '' }
      ])
    ).toEqual([])
  })
})

describe('onCommitBody', () => {
  it('Should list each rule and how to undo it', () => {
    const body = onCommitBody(SET, parseResearchMode(LOG))
    expect(body).toContain(`npm run designer:research -- off ${SET}`)
    expect(body).toContain('- arrival-details: Leave the arrival date blank')
  })
})
