import { spawnSync } from 'node:child_process'

import { gitEnv } from '../lib/git-env.js'

const MAX_BUFFER = 64 * 1024 * 1024

/**
 * Runs `git` with an argument list — never a shell string — in the repo.
 *
 * @returns {{ status: number | null, stdout: string, stderr: string }}
 */
export const runGit = (repoRoot, args, { input } = {}) => {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: gitEnv(),
    input,
    maxBuffer: MAX_BUFFER
  })
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? ''
  }
}

/** Like `runGit`, but a non-zero exit throws with git's own message. */
export const git = (repoRoot, args, options) => {
  const result = runGit(repoRoot, args, options)
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed: ${result.stderr.trim() || result.stdout.trim()}`
    )
  }
  return result.stdout
}

/** Whether any of the paths are tracked by git. */
export const isTracked = (repoRoot, paths) =>
  git(repoRoot, ['ls-files', '--', ...paths]).trim() !== ''

/** True when any of the paths is in the last commit: staged alone is not
 * saved. False in a repo with no commit yet. */
export const isCommitted = (repoRoot, paths) => {
  try {
    return (
      git(repoRoot, [
        'ls-tree',
        '-r',
        '--name-only',
        'HEAD',
        '--',
        ...paths
      ]).trim() !== ''
    )
  } catch {
    return false
  }
}

/** `git status --porcelain` lines for the paths: uncommitted changes. */
export const uncommittedChanges = (repoRoot, paths) =>
  git(repoRoot, ['status', '--porcelain', '--', ...paths])
    .split('\n')
    .filter(Boolean)
