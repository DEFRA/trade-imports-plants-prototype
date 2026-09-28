import { execFileSync } from 'node:child_process'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { gitEnv } from '../lib/git-env.js'
import { makeFixtureRepo } from '../lib/test-support.js'
import {
  READY_MARKER,
  baseCacheDir,
  baseFolderName,
  baseFoldersToPrune,
  prepareBaseTree
} from './base-tree.js'

const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup()
  }
})

const fixtureRepo = () => {
  const repo = makeFixtureRepo({ git: true })
  const cacheDir = mkdtempSync(path.join(tmpdir(), 'designer-base-cache-'))
  cleanups.push(repo.cleanup, () =>
    rmSync(cacheDir, { recursive: true, force: true })
  )
  return { repo, cacheDir }
}

const headOf = (root) =>
  execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    env: gitEnv()
  }).trim()

const statusOf = (root) =>
  execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: root,
    encoding: 'utf8',
    env: gitEnv()
  })

describe('baseFolderName', () => {
  it('Should name the copy after the first 12 characters of the commit', () => {
    expect(baseFolderName('0123456789abcdef0123')).toBe('base-0123456789ab')
  })
})

describe('baseCacheDir', () => {
  it('Should keep copies outside the repo, one folder per checkout', () => {
    const first = baseCacheDir('/work/prototype', '/tmp')
    expect(first.startsWith('/tmp/plants-prototype-designer-show/')).toBe(true)
    expect(baseCacheDir('/work/prototype', '/tmp')).toBe(first)
    expect(baseCacheDir('/work/another-clone', '/tmp')).not.toBe(first)
  })
})

describe('baseFoldersToPrune', () => {
  it('Should keep the current copy and the newest others up to the limit', () => {
    const folders = [
      { name: 'base-a', time: 1 },
      { name: 'base-b', time: 4 },
      { name: 'base-c', time: 3 },
      { name: 'base-d', time: 2 }
    ]
    expect(baseFoldersToPrune(folders, 'base-a', 3)).toEqual(['base-d'])
  })
})

describe('prepareBaseTree', () => {
  it('Should unpack the last commit outside the repo without touching the working tree', async () => {
    const { repo, cacheDir } = fixtureRepo()
    mkdirSync(path.join(repo.root, 'node_modules'))
    const setFile = 'src/server/app/sets/plants-working/set.js'
    const committed = readFileSync(path.join(repo.root, setFile), 'utf8')
    repo.write(setFile, `${committed}// an unsaved change\n`)
    repo.write('src/server/app/sets/plants-working/new-file.js', 'export {}\n')
    const statusBefore = statusOf(repo.root)

    const folder = await prepareBaseTree(repo.root, headOf(repo.root), {
      cacheDir
    })

    expect(folder).toBe(path.join(cacheDir, baseFolderName(headOf(repo.root))))
    expect(readFileSync(path.join(folder, setFile), 'utf8')).toBe(committed)
    expect(
      existsSync(
        path.join(folder, 'src/server/app/sets/plants-working/new-file.js')
      )
    ).toBe(false)
    expect(lstatSync(path.join(folder, 'node_modules')).isSymbolicLink()).toBe(
      true
    )
    expect(existsSync(path.join(folder, READY_MARKER))).toBe(true)
    expect(statusOf(repo.root)).toBe(statusBefore)
  })

  it('Should reuse a copy it has already made', async () => {
    const { repo, cacheDir } = fixtureRepo()
    const sha = headOf(repo.root)
    const folder = await prepareBaseTree(repo.root, sha, { cacheDir })
    writeFileSync(path.join(folder, 'marker.txt'), 'kept')
    await prepareBaseTree(repo.root, sha, { cacheDir })
    expect(readFileSync(path.join(folder, 'marker.txt'), 'utf8')).toBe('kept')
  })
})
