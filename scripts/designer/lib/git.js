/**
 * Thin, read-only git layer for the designer scripts. Every call is one
 * `git` invocation through execFileSync with an argument array, never a shell
 * string, so a path with spaces or quotes can never be misread.
 */
import { execFileSync } from 'node:child_process'

import { gitEnv } from './git-env.js'
import { REPO_ROOT } from './repo.js'

const STATUS_CODE_LENGTH = 2

export const runGit = (args, { root = REPO_ROOT } = {}) =>
  execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: gitEnv(),
    stdio: ['ignore', 'pipe', 'pipe']
  })

const runGitOrNull = (args, options) => {
  try {
    return runGit(args, options).trim()
  } catch {
    return null
  }
}

/**
 * Parses `git status --porcelain=v1 -z` output. A rename or copy entry is
 * followed by a second NUL-separated field holding its old path, which is
 * skipped: only the new path is on disk.
 */
export const parseStatus = (output) => {
  const fields = output.split('\0').filter((field) => field !== '')
  const entries = []
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index]
    const code = field.slice(0, STATUS_CODE_LENGTH)
    entries.push({ code, path: field.slice(STATUS_CODE_LENGTH + 1) })
    if (code.includes('R') || code.includes('C')) {
      index += 1
    }
  }
  return entries
}

/** Every changed, staged or untracked path, each listed once. */
export const statusEntries = (options) =>
  parseStatus(
    runGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], options)
  )

/** Tracked paths with changes (staged or not), excluding untracked files. */
export const changedPaths = (options) =>
  statusEntries(options)
    .filter(({ code }) => code !== '??')
    .map((entry) => entry.path)

/** New files git does not track yet. */
export const untrackedPaths = (options) =>
  statusEntries(options)
    .filter(({ code }) => code === '??')
    .map((entry) => entry.path)

/** Changed and untracked paths together: everything `git status` lists. */
export const changedAndUntrackedPaths = (options) => [
  ...new Set(statusEntries(options).map((entry) => entry.path))
]

/** The branch checked out, or null (detached HEAD, no commits, no git). */
export const currentBranch = (options) => {
  const branch = runGitOrNull(['rev-parse', '--abbrev-ref', 'HEAD'], options)
  return branch && branch !== 'HEAD' ? branch : null
}

/** The full commit id a ref points at, or null if it does not resolve. */
export const revParse = (ref, options) =>
  runGitOrNull(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], options)

/** Unix seconds of the last commit touching `pathspec`, or null. */
export const lastCommitTime = (pathspec, options) => {
  const output = runGitOrNull(
    ['log', '-1', '--format=%ct', '--', pathspec],
    options
  )
  return output ? Number(output) : null
}
