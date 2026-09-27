import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  changedAndUntrackedPaths,
  changedPaths,
  currentBranch,
  lastCommitTime,
  parseStatus,
  revParse,
  untrackedPaths
} from './git.js'
import { makeFixtureRepo } from './test-support.js'

describe('parseStatus', () => {
  it('Should read codes and paths, skipping the old path of a rename', () => {
    expect(parseStatus(' M a.js\0R  new.js\0old.js\0?? b c.js\0')).toEqual([
      { code: ' M', path: 'a.js' },
      { code: 'R ', path: 'new.js' },
      { code: '??', path: 'b c.js' }
    ])
  })

  it('Should read empty output as no entries', () => {
    expect(parseStatus('')).toEqual([])
  })
})

describe('git in a real repo', () => {
  let fixture
  beforeEach(() => {
    fixture = makeFixtureRepo({ git: true })
  })
  afterEach(() => fixture.cleanup())

  const options = () => ({ root: fixture.root })

  it('Should list changed and untracked paths separately and together', () => {
    fixture.write('overrides.json', '{}\n')
    fixture.write('notes/new file.md', 'hello\n')
    expect(changedPaths(options())).toEqual(['overrides.json'])
    expect(untrackedPaths(options())).toEqual(['notes/new file.md'])
    expect(changedAndUntrackedPaths(options())).toEqual([
      'overrides.json',
      'notes/new file.md'
    ])
  })

  it('Should name the current branch', () => {
    expect(currentBranch(options())).toBe('main')
  })

  it('Should resolve HEAD and refuse a ref that does not exist', () => {
    expect(revParse('HEAD', options())).toMatch(/^[0-9a-f]{40}$/)
    expect(revParse('no-such-branch', options())).toBeNull()
  })

  it('Should give the time of the last commit touching a path', () => {
    expect(lastCommitTime('overrides.json', options())).toBeGreaterThan(0)
    expect(lastCommitTime('never-committed.txt', options())).toBeNull()
  })
})
