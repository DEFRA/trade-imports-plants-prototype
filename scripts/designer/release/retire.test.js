import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { scaffoldSet } from '../../new-set/index.js'
import { git } from './git.js'
import { retireRelease } from './retire.js'
import {
  commitAll,
  editIn,
  makeTestRepo,
  readIn,
  removeTestRepo,
  statusOf
} from './test-repo.js'

const NOW = new Date('2026-09-27T10:00:00.000Z')
const SHARED_FILES = [
  'overrides.json',
  'src/server/prototype-sets/index.js',
  'src/server/prototype-sets/descriptions.js'
]

let repoRoot
let beforeRelease

beforeEach(() => {
  repoRoot = makeTestRepo()
  beforeRelease = git(repoRoot, ['rev-parse', 'HEAD']).trim()
  scaffoldSet(
    {
      setId: 'plants-old',
      from: 'high-risk-plants',
      describe: 'An old release',
      purpose: 'working'
    },
    { repoRoot, now: NOW }
  )
  const scenario = path.join(
    repoRoot,
    'src/server/prototype-seed/scenarios/plants-old.js'
  )
  mkdirSync(path.dirname(scenario), { recursive: true })
  writeFileSync(scenario, 'export const scenarios = []\n')
  commitAll(repoRoot, 'Start plants-old')
})

afterEach(() => {
  removeTestRepo(repoRoot)
})

describe('retire', () => {
  it('Should leave only deletions, and the shared files as they were before the release', () => {
    const removed = retireRelease('plants-old', { repoRoot })

    expect(removed).toEqual(
      expect.arrayContaining([
        'src/server/app/sets/plants-old',
        'src/server/app/routes-plants-old.js',
        'src/server/prototype-seed/scenarios/plants-old.js',
        '"src/server/app/sets/plants-old/**" from overrides.json',
        '"src/server/app/routes-plants-old.js" from overrides.json'
      ])
    )
    const changes = statusOf(repoRoot)
    expect(
      changes.filter((line) => !/^(D | M)/.test(line)),
      changes.join('\n')
    ).toEqual([])
    expect(git(repoRoot, ['diff', beforeRelease, '--', ...SHARED_FILES])).toBe(
      ''
    )
  })

  it('Should leave no stray overrides.json globs', () => {
    retireRelease('plants-old', { repoRoot })

    expect(readIn(repoRoot, 'overrides.json')).not.toContain('plants-old')
    expect(
      existsSync(path.join(repoRoot, 'src/server/app/sets/plants-old'))
    ).toBe(false)
  })

  it('Should remove a release that was never saved, leaving a clean tree', () => {
    scaffoldSet(
      { setId: 'plants-unsaved', from: 'high-risk-plants', purpose: 'working' },
      { repoRoot, now: NOW }
    )

    retireRelease('plants-unsaved', { repoRoot })

    expect(statusOf(repoRoot)).toEqual([])
  })

  it('Should refuse a release with changes that are not saved', () => {
    editIn(
      repoRoot,
      'src/server/app/sets/plants-old/journeys/linear/features/origin/copy/copy.en.js',
      "hint: 'Start typing to search for a country.'",
      "hint: 'Unsaved'"
    )

    expect(() => retireRelease('plants-old', { repoRoot })).toThrow(
      /changes that are not saved/
    )
  })

  it.each(['high-risk-plants', 'sample-journey'])(
    'Should refuse to retire %s',
    (setId) => {
      expect(() => retireRelease(setId, { repoRoot })).toThrow(
        /You cannot retire/
      )
    }
  )
})
