import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** The prototype's checkout root, whatever directory a script runs from. */
export const REPO_ROOT = path.resolve(
  fileURLToPath(import.meta.url),
  '../../../..'
)

const insideRoot = (absolute, root) => {
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

/**
 * Which absolute path a typed relative path means. It is read from `cwd`
 * first (a designer standing in `src/server/app` types `sets/x/set.js`).
 * When that lands outside the repo, or names nothing while the same path
 * from the repo root does exist, it is read from the repo root instead:
 * `npm --prefix` and agents started elsewhere set `cwd` to a parent folder,
 * and every repo-relative path in the skills must still answer correctly.
 */
const resolveTyped = (filePath, { root, cwd }) => {
  const fromCwd = path.resolve(cwd, filePath)
  if (path.isAbsolute(filePath) || cwd === root) {
    return fromCwd
  }
  const fromRoot = path.resolve(root, filePath)
  if (!insideRoot(fromCwd, root)) {
    return fromRoot
  }
  return !existsSync(fromCwd) && existsSync(fromRoot) ? fromRoot : fromCwd
}

/**
 * Turns any path a designer or a tool gives us (absolute, `./`-prefixed or
 * Windows-separated) into the repo-relative, forward-slash form overrides.json
 * uses. Relative paths resolve against `cwd`, defaulting to the repo root,
 * and fall back to the repo root when `cwd` is outside the repo or the path
 * only exists from the root. Returns null for a path outside the repo.
 */
export const toRepoPath = (filePath, { root = REPO_ROOT, cwd = root } = {}) => {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    return null
  }
  return insideRoot(resolveTyped(filePath, { root, cwd }), root)
}

/** The sync robot's rules file, parsed. */
export const readOverrides = ({ root = REPO_ROOT } = {}) =>
  JSON.parse(readFileSync(path.join(root, 'overrides.json'), 'utf8'))
