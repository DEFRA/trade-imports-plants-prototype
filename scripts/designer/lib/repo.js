import { existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
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
 * `~` or `~/…` expanded against this computer's home folder. Every other
 * path is returned unchanged. Designers who work from the trade-imports
 * workspace sometimes paste a tilde path into a file's own address.
 */
const expandHome = (filePath) => {
  if (filePath === '~') {
    return os.homedir()
  }
  return filePath.startsWith('~/')
    ? path.join(os.homedir(), filePath.slice(2))
    : filePath
}

/**
 * `repos/<this repo's folder name>/…`, resolved against `root` when the
 * typed path starts with it, else null. Working from the trade-imports
 * workspace root, that is how every tool names a file in this repo (a path
 * relative to the workspace, not to this repo), whatever folder the caller's
 * shell happens to be standing in.
 */
const workspaceRelative = (filePath, root) => {
  const prefix = `repos/${path.basename(root)}/`
  return filePath.startsWith(prefix)
    ? path.resolve(root, filePath.slice(prefix.length))
    : null
}

/**
 * Which absolute path a typed relative path means. It is read from `cwd`
 * first (a designer standing in `src/server/app` types `sets/x/set.js`).
 * When that lands outside the repo, or names nothing while the same path
 * from the repo root does exist, it is read from the repo root instead:
 * `npm --prefix` and agents started elsewhere set `cwd` to a parent folder,
 * and every repo-relative path in the skills must still answer correctly.
 * A tilde path and a workspace-relative `repos/<name>/…` path are read
 * against the repo root before any of that, whatever `cwd` is.
 */
const resolveTyped = (filePath, { root, cwd }) => {
  const expanded = expandHome(filePath)
  if (path.isAbsolute(expanded)) {
    return expanded
  }
  const fromWorkspace = workspaceRelative(expanded, root)
  if (fromWorkspace) {
    return fromWorkspace
  }
  const fromCwd = path.resolve(cwd, expanded)
  if (cwd === root) {
    return fromCwd
  }
  const fromRoot = path.resolve(root, expanded)
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
