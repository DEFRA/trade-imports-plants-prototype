/**
 * A throwaway git repo holding just the files design releases read and
 * write, for the `designer:release` tests: the real high-risk-plants set and
 * its gateway, the placeholder set, the prototype-sets mount, the chooser
 * descriptions and overrides.json. Used only by tests.
 */
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { git } from './git.js'
import { REPO_ROOT } from './sets.js'

const COPIED_FROM_REPO = [
  'src/server/app/sets/high-risk-plants',
  'src/server/app/routes-high-risk-plants.js',
  'src/server/app/sets/sample-journey',
  'src/server/app/routes-sample-journey.js',
  'src/server/prototype-sets/index.js',
  'src/server/prototype-sets/descriptions.js',
  'overrides.json'
]

const IDENTITY = [
  '-c',
  'user.name=Design release tests',
  '-c',
  'user.email=design-release-tests@example.com',
  '-c',
  'commit.gpgsign=false',
  '-c',
  'core.hooksPath=/dev/null'
]

export const commitAll = (repoRoot, message) => {
  git(repoRoot, ['add', '-A'])
  git(repoRoot, [...IDENTITY, 'commit', '-q', '-m', message])
  return git(repoRoot, ['rev-parse', 'HEAD']).trim()
}

export const makeTestRepo = () => {
  const repoRoot = mkdtempSync(path.join(tmpdir(), 'design-release-'))
  for (const relativePath of COPIED_FROM_REPO) {
    cpSync(
      path.join(REPO_ROOT, relativePath),
      path.join(repoRoot, relativePath),
      { recursive: true }
    )
  }
  git(repoRoot, ['init', '-q', '-b', 'main'])
  git(repoRoot, ['config', 'gc.auto', '0'])
  git(repoRoot, ['config', 'maintenance.auto', 'false'])
  git(repoRoot, ['config', 'core.fsmonitor', 'false'])
  commitAll(repoRoot, 'Start')
  return repoRoot
}

/** Retries: git can still be writing into `.git` for a moment after the
 * command that started it has returned. */
export const removeTestRepo = (repoRoot) =>
  rmSync(repoRoot, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200
  })

export const readIn = (repoRoot, relativePath) =>
  readFileSync(path.join(repoRoot, relativePath), 'utf8')

/** Replaces the one occurrence of `from` in a file, failing if it is not
 * there exactly once. */
export const editIn = (repoRoot, relativePath, from, to) => {
  const content = readIn(repoRoot, relativePath)
  if (content.split(from).length !== 2) {
    throw new Error(`Expected "${from}" exactly once in ${relativePath}`)
  }
  writeFileSync(path.join(repoRoot, relativePath), content.replace(from, to))
}

export const statusOf = (repoRoot) =>
  git(repoRoot, ['status', '--porcelain']).split('\n').filter(Boolean)
