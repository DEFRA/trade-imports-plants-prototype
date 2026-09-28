import { rmSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { scaffoldSet } from '../../new-set/index.js'
import { git, runGit } from './git.js'
import { MOUNT_FILES, remountReleases } from './remount.js'
import { commitAll, makeTestRepo, readIn, removeTestRepo } from './test-repo.js'

const NOW = new Date('2026-09-27T10:00:00.000Z')
const IDENTITY = [
  '-c',
  'user.name=Remount test',
  '-c',
  'user.email=remount@example.com',
  '-c',
  'core.hooksPath=/dev/null'
]

let repoRoot

const release = (setId, describe) =>
  scaffoldSet(
    { setId, from: 'high-risk-plants', purpose: 'working', describe },
    { repoRoot, now: NOW }
  )

const mountedIn = (setId) => {
  const index = readIn(repoRoot, MOUNT_FILES[1])
  const descriptions = readIn(repoRoot, MOUNT_FILES[2])
  const ours = JSON.parse(readIn(repoRoot, MOUNT_FILES[0])).ours
  return {
    mounted: index.includes(`routes-${setId}.js`),
    described: descriptions.includes(`'${setId}'`),
    yours: ours.includes(`src/server/app/sets/${setId}/**`)
  }
}

beforeEach(() => {
  repoRoot = makeTestRepo()
})

afterEach(() => {
  removeTestRepo(repoRoot)
})

describe('remount', () => {
  it('Should join two branches that each started a release', () => {
    git(repoRoot, ['switch', '-q', '-c', 'design/a'])
    release('plants-a', 'Release A')
    commitAll(repoRoot, 'Start plants-a')
    git(repoRoot, ['switch', '-q', 'main'])
    git(repoRoot, ['switch', '-q', '-c', 'design/b'])
    release('plants-b', 'Release B')
    commitAll(repoRoot, 'Start plants-b')

    const merged = runGit(repoRoot, [...IDENTITY, 'merge', '-q', 'design/a'])
    expect(merged.status).not.toBe(0)

    const result = remountReleases({ repoRoot })

    expect(result.resolved.length).toBeGreaterThan(0)
    for (const setId of ['plants-a', 'plants-b']) {
      expect(mountedIn(setId)).toEqual({
        mounted: true,
        described: true,
        yours: true
      })
    }
    for (const file of MOUNT_FILES) {
      expect(readIn(repoRoot, file)).not.toMatch(/^<{7}/m)
    }
    expect(readIn(repoRoot, MOUNT_FILES[2])).toContain('Release A')
  })

  it('Should take out a release whose folder is gone', () => {
    release('plants-gone')
    commitAll(repoRoot, 'Start plants-gone')
    rmSync(path.join(repoRoot, 'src/server/app/sets/plants-gone'), {
      recursive: true
    })
    rmSync(path.join(repoRoot, 'src/server/app/routes-plants-gone.js'))

    const result = remountReleases({ repoRoot })

    expect(result.removed).toContain(
      'unmounted plants-gone: its folder is gone'
    )
    expect(mountedIn('plants-gone')).toEqual({
      mounted: false,
      described: false,
      yours: false
    })
  })

  it('Should start every test repo without the releases of the checkout it copies', () => {
    release('plants-working')
    commitAll(repoRoot, 'Start plants-working')

    const copied = makeTestRepo({ from: repoRoot })
    try {
      const ours = JSON.parse(readIn(copied, MOUNT_FILES[0])).ours
      expect(readIn(copied, MOUNT_FILES[1])).not.toContain('plants-working')
      expect(readIn(copied, MOUNT_FILES[2])).not.toContain('plants-working')
      expect(ours.join('\n')).not.toContain('plants-working')
      expect(remountReleases({ repoRoot: copied })).toEqual({
        resolved: [],
        added: [],
        removed: []
      })
    } finally {
      removeTestRepo(copied)
    }
  })

  it('Should change nothing when every release is mounted', () => {
    release('plants-a')
    commitAll(repoRoot, 'Start plants-a')

    expect(remountReleases({ repoRoot })).toEqual({
      resolved: [],
      added: [],
      removed: []
    })
  })
})
