import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { scaffoldSet } from '../../new-set/index.js'
import { readReleaseRecord } from '../../new-set/release-record.js'
import { freezeRelease } from './freeze.js'
import { commitAll, makeTestRepo, removeTestRepo } from './test-repo.js'

const NOW = new Date('2026-09-27T10:00:00.000Z')

let repoRoot

const recordOf = (setId) =>
  readReleaseRecord(path.join(repoRoot, 'src/server/app/sets', setId))

beforeEach(() => {
  repoRoot = makeTestRepo()
  scaffoldSet(
    { setId: 'plants-dr2', from: 'high-risk-plants', purpose: 'working' },
    { repoRoot, now: NOW }
  )
  commitAll(repoRoot, 'Start plants-dr2')
})

afterEach(() => {
  removeTestRepo(repoRoot)
})

describe('freeze', () => {
  it('Should freeze the release and make a working release from it', () => {
    const result = freezeRelease('plants-dr2', {
      as: 'plants-dr2-1',
      repoRoot,
      now: NOW
    })

    expect(result).toEqual(
      expect.objectContaining({
        frozen: 'plants-dr2',
        working: 'plants-dr2-1',
        alreadyFrozen: false
      })
    )
    expect(recordOf('plants-dr2')).toEqual(
      expect.objectContaining({
        purpose: 'frozen',
        frozen: true,
        frozenAt: NOW.toISOString()
      })
    )
    expect(recordOf('plants-dr2-1')).toEqual(
      expect.objectContaining({
        from: 'plants-dr2',
        root: 'high-risk-plants',
        purpose: 'working',
        frozen: false
      })
    )
  })

  it('Should name the working release after the frozen one when not told', () => {
    const { working } = freezeRelease('plants-dr2', { repoRoot, now: NOW })

    expect(working).toBe('plants-dr2-working')
    expect(recordOf('plants-dr2-working')).not.toBeNull()
  })

  it('Should freeze nothing when the new release’s id is taken', () => {
    expect(() =>
      freezeRelease('plants-dr2', { as: 'plants-dr2', repoRoot, now: NOW })
    ).toThrow(/already exists/)
    expect(recordOf('plants-dr2').frozen).toBe(false)
  })

  it('Should refuse the real journey', () => {
    expect(() =>
      freezeRelease('high-risk-plants', { repoRoot, now: NOW })
    ).toThrow(/real journey/)
  })

  it('Should refuse a release that does not exist', () => {
    expect(() => freezeRelease('plants-dr9', { repoRoot, now: NOW })).toThrow(
      /There is no release called "plants-dr9"/
    )
  })
})
