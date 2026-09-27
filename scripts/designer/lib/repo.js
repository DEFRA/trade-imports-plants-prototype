import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** The prototype's checkout root, whatever directory a script runs from. */
export const REPO_ROOT = path.resolve(
  fileURLToPath(import.meta.url),
  '../../../..'
)

/**
 * Turns any path a designer or a tool gives us (absolute, `./`-prefixed or
 * Windows-separated) into the repo-relative, forward-slash form overrides.json
 * uses. Relative paths resolve against `cwd`, defaulting to the repo root.
 * Returns null for a path outside the repo.
 */
export const toRepoPath = (filePath, { root = REPO_ROOT, cwd = root } = {}) => {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    return null
  }
  const absolute = path.resolve(cwd, filePath)
  const relative = path.relative(root, absolute)
  if (
    relative === '' ||
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    return null
  }
  return relative.split(path.sep).join('/')
}

/** The sync robot's rules file, parsed. */
export const readOverrides = ({ root = REPO_ROOT } = {}) =>
  JSON.parse(readFileSync(path.join(root, 'overrides.json'), 'utf8'))
