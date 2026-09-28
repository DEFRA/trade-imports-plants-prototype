/**
 * Thin git layer for research mode. Each function runs one git command with
 * `execFileSync` (no shell strings) in the repo it is given, and returns plain
 * data. The decisions live in research-mode.js and switch.js.
 */
import { execFileSync } from 'node:child_process'

import { gitEnv } from '../lib/git-env.js'

const RECORD = '\u001e'
const FIELD = '\u001f'
const STATUS_CODE_LENGTH = 2

const git = (repoRoot, args) =>
  execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: gitEnv(),
    stdio: ['ignore', 'pipe', 'pipe']
  })

/**
 * Every changed, added and untracked path, from `git status -z`, so names with
 * spaces survive. A rename lists its new path.
 * @returns {{ code: string, path: string }[]}
 */
export const changedPaths = (repoRoot, pathspec = []) => {
  const entries = git(repoRoot, [
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=all',
    '--',
    ...pathspec
  ]).split('\0')
  const changes = []
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index]
    if (entry === '') {
      continue
    }
    const code = entry.slice(0, STATUS_CODE_LENGTH)
    changes.push({ code, path: entry.slice(STATUS_CODE_LENGTH + 1) })
    if (code.includes('R') || code.includes('C')) {
      index++
    }
  }
  return changes
}

/**
 * Commits whose message mentions `text`, newest first, with subject and body.
 * @returns {{ sha: string, subject: string, body: string }[]}
 */
export const commitsMentioning = (repoRoot, text) =>
  git(repoRoot, [
    'log',
    '--fixed-strings',
    `--grep=${text}`,
    `--format=%H${FIELD}%s${FIELD}%b${RECORD}`
  ])
    .split(RECORD)
    .map((record) => record.trim())
    .filter((record) => record !== '')
    .map((record) => {
      const [sha, subject, body = ''] = record.split(FIELD)
      return { sha, subject, body }
    })

export const addPaths = (repoRoot, paths) =>
  git(repoRoot, ['add', '--', ...paths])

/** Every path staged for the next commit. */
export const stagedPaths = (repoRoot) =>
  git(repoRoot, ['diff', '--cached', '--name-only', '-z'])
    .split('\0')
    .filter((entry) => entry !== '')

/**
 * Commits what is staged, with no pathspec. A pathspec commit (`--only` or
 * `-- <paths>`) makes git run the pre-commit hook against a temporary index
 * (`GIT_INDEX_FILE=.git/next-index-NNNN.lock`), which the hook's own git
 * tests trip over. The caller checks that only its own paths are staged.
 */
export const commitStaged = (repoRoot, { title, body }) =>
  git(repoRoot, ['commit', '-m', title, '-m', body])

export const revert = (repoRoot, sha) =>
  git(repoRoot, ['revert', '--no-edit', sha])

export const abortRevert = (repoRoot) => {
  try {
    git(repoRoot, ['revert', '--abort'])
  } catch {
    // Nothing to abort: the revert stopped before it started.
  }
}

export const headSha = (repoRoot) =>
  git(repoRoot, ['rev-parse', '--short', 'HEAD']).trim()
