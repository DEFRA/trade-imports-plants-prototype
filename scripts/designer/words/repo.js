import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

import {
  REAL_JOURNEY_SET,
  REPO_ROOT,
  listSets as listSetsIn,
  releaseInfo,
  setDir as setDirIn
} from '../lib/index.js'

export { REAL_JOURNEY_SET, REPO_ROOT }

export const SHARED_DIR = 'src/server/app/shared'

/** A repo-relative path with forward slashes, whatever the platform. */
export const toRepoPath = (root, absolutePath) =>
  path.relative(root, absolutePath).split(path.sep).join('/')

/**
 * Every file under a folder, as absolute paths, skipping `node_modules` and
 * dot-folders. Returns an empty list when the folder does not exist.
 */
export const walkFiles = (dir) => {
  if (!existsSync(dir)) {
    return []
  }
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
      return []
    }
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walkFiles(full) : [full]
  })
}

export const listSets = (root) => listSetsIn({ root })

export const setDir = (root, setId) => setDirIn(setId, { root })

/**
 * Who owns a set and whether it may be edited.
 *
 * `owner` is 'real-service' for the real journey, which the weekly update
 * owns, and 'yours' for every other set. `frozen` and `purpose` come from a
 * design release's `release.json`.
 */
export const setInfo = (root, setId) => {
  const info = releaseInfo(setId, { root })
  return {
    setId,
    kind: info.kind,
    owner: info.kind === 'real-journey' ? 'real-service' : 'yours',
    frozen: info.frozen === true,
    purpose: info.purpose ?? null
  }
}
