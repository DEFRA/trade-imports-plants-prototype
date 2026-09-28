import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { scaffoldSet } from '../../new-set/index.js'
import { readReleaseRecord } from '../../new-set/release-record.js'
import { STEP_RUNNERS } from '../check/steps.js'
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

  it('Should give the frozen release a new chooser line and name, and name the working copy, when asked', () => {
    freezeRelease('plants-dr2', {
      as: 'plants-dr2-1',
      frozenDescribe: 'Design release 2, as handed to the developers',
      frozenTitle: 'Design release 2',
      title: 'Design release 2: working copy',
      repoRoot,
      now: NOW
    })

    expect(recordOf('plants-dr2').description).toBe(
      'Design release 2, as handed to the developers'
    )
    expect(recordOf('plants-dr2').title).toBe('Design release 2')
    expect(recordOf('plants-dr2-1').title).toBe(
      'Design release 2: working copy'
    )
    expect(
      readFileSync(
        path.join(repoRoot, 'src/server/prototype-sets/descriptions.js'),
        'utf8'
      )
    ).toContain('Design release 2, as handed to the developers')
  })

  it('Should have the check say the release was frozen in this change', async () => {
    freezeRelease('plants-dr2', { as: 'plants-dr2-1', repoRoot, now: NOW })

    const outcome = await STEP_RUNNERS.ownership({
      root: repoRoot,
      changedPaths: ['src/server/app/sets/plants-dr2/release.json']
    })

    expect(outcome.status).toBe('pass')
    expect(outcome.summary).toContain('You froze plants-dr2 in this change.')
  })

  it('Should count an edit to a frozen release once, as frozen', async () => {
    freezeRelease('plants-dr2', { as: 'plants-dr2-1', repoRoot, now: NOW })
    commitAll(repoRoot, 'Freeze plants-dr2')
    const edited = 'src/server/app/sets/plants-dr2/set.js'
    writeFileSync(
      path.join(repoRoot, edited),
      `${readFileSync(path.join(repoRoot, edited), 'utf8')}// edited\n`
    )

    const outcome = await STEP_RUNNERS.ownership({
      root: repoRoot,
      changedPaths: [edited]
    })

    expect(outcome.status).toBe('fail')
    expect(outcome.summary).toBe('1 file changed: 1 in a frozen release.')
    expect(outcome.details).toEqual([])
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
