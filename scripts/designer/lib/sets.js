/**
 * What sets the prototype holds, and what kind each one is. A set is a
 * folder under src/server/app/sets with a set.js. A design release is any set
 * other than the real journey (high-risk-plants) and the placeholder
 * (sample-journey); its release.json says how it was made and whether it is
 * frozen.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { changedAndUntrackedPaths, lastCommitTime } from './git.js'
import { REPO_ROOT, toRepoPath } from './repo.js'

export const SETS_DIR = 'src/server/app/sets'
export const REAL_JOURNEY_SET = 'high-risk-plants'
export const PLACEHOLDER_SET = 'sample-journey'

const SET_PATH = /^src\/server\/app\/sets\/([a-z0-9-]+)\//
const ROUTES_PATH = /^src\/server\/app\/routes-([a-z0-9-]+)\.js$/

/** Every set id, sorted. */
export const listSets = ({ root = REPO_ROOT } = {}) => {
  const setsRoot = path.join(root, SETS_DIR)
  if (!existsSync(setsRoot)) {
    return []
  }
  return readdirSync(setsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((id) => existsSync(path.join(setsRoot, id, 'set.js')))
    .sort((a, b) => a.localeCompare(b))
}

/** The absolute folder of a set. */
export const setDir = (id, { root = REPO_ROOT } = {}) =>
  path.join(root, SETS_DIR, id)

const readReleaseJson = (id, root) => {
  const file = path.join(setDir(id, { root }), 'release.json')
  if (!existsSync(file)) {
    return null
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return { unreadable: true }
  }
}

/**
 * What kind of set `id` is:
 * - `{ kind: 'real-journey' }` for high-risk-plants
 * - `{ kind: 'placeholder' }` for sample-journey
 * - `{ kind: 'release', ...release.json, frozen }` for a design release. A
 *   release made before release.json existed reads as a working release with
 *   `declared: false`.
 * Returns null when there is no such set.
 */
export const releaseInfo = (id, { root = REPO_ROOT } = {}) => {
  if (!listSets({ root }).includes(id)) {
    return null
  }
  if (id === REAL_JOURNEY_SET) {
    return { kind: 'real-journey', id, frozen: false }
  }
  if (id === PLACEHOLDER_SET) {
    return { kind: 'placeholder', id, frozen: false }
  }
  const release = readReleaseJson(id, root)
  if (!release || release.unreadable) {
    return {
      kind: 'release',
      id,
      purpose: 'working',
      frozen: false,
      declared: false
    }
  }
  return {
    purpose: 'working',
    ...release,
    kind: 'release',
    id,
    frozen: release.frozen === true || release.purpose === 'frozen',
    declared: true
  }
}

/**
 * The set a path belongs to: anything under src/server/app/sets/<id>/, and
 * that set's gateway src/server/app/routes-<id>.js. Null for anything else.
 */
export const setOfPath = (filePath, { root = REPO_ROOT } = {}) => {
  const repoPath = toRepoPath(filePath, { root })
  if (!repoPath) {
    return null
  }
  const match = SET_PATH.exec(repoPath) ?? ROUTES_PATH.exec(repoPath)
  return match ? match[1] : null
}

const modifiedTime = (root, repoPath) => {
  try {
    return statSync(path.join(root, repoPath)).mtimeMs / 1000
  } catch {
    return 0
  }
}

const lastChanged = (id, root, pending) => {
  const pendingTimes = pending
    .filter((repoPath) => setOfPath(repoPath, { root }) === id)
    .map((repoPath) => modifiedTime(root, repoPath))
  const committed = lastCommitTime(`${SETS_DIR}/${id}`, { root }) ?? 0
  return Math.max(committed, ...pendingTimes)
}

/**
 * The working release a designer most probably means when they do not name
 * one: the unfrozen, working-purpose release changed most recently (unsaved
 * edits count, and beat older commits). Null when there is none.
 */
export const defaultSet = ({ root = REPO_ROOT } = {}) => {
  const working = listSets({ root }).filter((id) => {
    const info = releaseInfo(id, { root })
    return info.kind === 'release' && !info.frozen && info.purpose === 'working'
  })
  if (working.length === 0) {
    return null
  }
  let pending = []
  try {
    pending = changedAndUntrackedPaths({ root })
  } catch {
    pending = []
  }
  const ranked = working
    .map((id) => ({ id, time: lastChanged(id, root, pending) }))
    .sort((a, b) => b.time - a.time || a.id.localeCompare(b.id))
  return ranked[0].id
}
