import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

/**
 * A frozen design release is a record of what was designed: nothing in it
 * may change after the commit that froze it. This finds what has.
 *
 * The freeze itself (release.json going from `frozen: false` to `true`) is
 * never a change "after the freeze": until the freeze is saved, HEAD's
 * release.json is not frozen and nothing is reported.
 */
export const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url))

const setPath = (setId) => `src/server/app/sets/${setId}`
const SHORT_COMMIT_LENGTH = 7

// Inside a git hook, GIT_INDEX_FILE and friends point at the hook's own
// temporary index; every call here names its repo with cwd instead.
const cleanEnv = () =>
  Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))
  )

const git = (repoRoot, args) => {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      env: cleanEnv(),
      stdio: ['ignore', 'pipe', 'ignore']
    })
  } catch {
    return null
  }
}

const lines = (output) =>
  (output ?? '').split('\n').filter((line) => line.trim() !== '')

const parse = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const recordOnDisk = (repoRoot, setId) => {
  try {
    return parse(
      readFileSync(path.join(repoRoot, setPath(setId), 'release.json'), 'utf8')
    )
  } catch {
    return null
  }
}

/** The newest commit that froze the release, or null (not saved yet, or a
 * shallow clone that does not hold it). */
export const freezeCommitOf = (repoRoot, setId) => {
  const head = parse(
    git(repoRoot, ['show', `HEAD:${setPath(setId)}/release.json`]) ?? ''
  )
  if (!head?.frozen) {
    return null
  }
  return (
    lines(
      git(repoRoot, [
        'log',
        '--format=%H',
        '-S"frozen": true',
        '--',
        `${setPath(setId)}/release.json`
      ])
    )[0] ?? null
  )
}

/**
 * `{ frozen, freezeCommit, changed }` for one set: whether it is frozen, the
 * commit that froze it, and every repo-relative file in it that differs from
 * that commit (saved since, staged, changed or new).
 */
export const frozenReleaseChanges = (setId, { repoRoot = REPO_ROOT } = {}) => {
  const record = recordOnDisk(repoRoot, setId)
  const none = {
    frozen: Boolean(record?.frozen),
    freezeCommit: null,
    changed: []
  }
  if (!record?.frozen) {
    return none
  }
  const freezeCommit = freezeCommitOf(repoRoot, setId)
  if (!freezeCommit) {
    return none
  }
  const folder = setPath(setId)
  const changed = [
    ...new Set([
      ...lines(
        git(repoRoot, ['diff', '--name-only', freezeCommit, '--', folder])
      ),
      ...lines(
        git(repoRoot, [
          'ls-files',
          '--others',
          '--exclude-standard',
          '--',
          folder
        ])
      )
    ])
  ]
  return { frozen: true, freezeCommit, changed }
}

/** The line the pre-commit hook and designer:check print for a change. */
export const describeFrozenChange = (setId, { freezeCommit, changed }) =>
  `frozen-release: ${setId} was frozen in ${freezeCommit.slice(0, SHORT_COMMIT_LENGTH)}, and ${changed.length} file${changed.length === 1 ? '' : 's'} in it changed since: ${changed.join(', ')}`
