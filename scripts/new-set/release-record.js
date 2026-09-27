import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { longDate } from '../../src/server/prototype-sets/releases.js'
import { RELEASE_FILE } from './copy-set.js'

export const PURPOSES = ['working', 'frozen', 'research']

/** The chooser line a set gets when nobody described it. */
export const placeholderDescription = (from, isoDate) =>
  `Copy of ${from} made ${longDate(isoDate)}`

const gitOutput = (repoRoot, args) => {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
  } catch {
    return null
  }
}

/** The commit the template was copied at, or null outside a git checkout. */
export const currentCommit = (repoRoot) =>
  gitOutput(repoRoot, ['rev-parse', 'HEAD'])

/**
 * The last real plants-frontend commit this checkout has taken in, or null
 * when the `upstream` remote has not been fetched here.
 */
export const upstreamCommitOf = (repoRoot) =>
  gitOutput(repoRoot, ['merge-base', 'HEAD', 'upstream/main'])

/** A set's `release.json`, or null when it has none (high-risk-plants,
 * sample-journey, or a set made before releases had a record). */
export const readReleaseRecord = (setDir) => {
  const path = join(setDir, RELEASE_FILE)
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null
}

export const writeReleaseRecord = (setDir, record) =>
  writeFileSync(
    join(setDir, RELEASE_FILE),
    `${JSON.stringify(record, null, 2)}\n`
  )

const sortedObject = (entries) =>
  Object.fromEntries(entries.toSorted(([a], [b]) => a.localeCompare(b)))

/**
 * The new release's `uuidMap`, always keyed by the obligation ids of the set
 * the whole family started from (its `root`, normally high-risk-plants), so
 * any two releases can be translated into each other, and a release can be
 * translated back to the real journey, through their maps alone.
 *
 * @param {Map<string, string>} copied - template id -> new id, from the copy.
 * @param {object | null} templateRecord - the template's own release record.
 */
export const rootUuidMap = (copied, templateRecord) => {
  if (!templateRecord?.uuidMap) {
    return sortedObject([...copied.entries()])
  }
  return sortedObject(
    Object.entries(templateRecord.uuidMap)
      .filter(([, templateId]) => copied.has(templateId))
      .map(([rootId, templateId]) => [rootId, copied.get(templateId)])
  )
}
