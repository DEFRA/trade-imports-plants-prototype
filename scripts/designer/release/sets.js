import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PLACEHOLDER,
  REAL_JOURNEY
} from '../../../src/server/prototype-sets/releases.js'
import { pathsFor } from '../../new-set/index.js'
import { readReleaseRecord } from '../../new-set/release-record.js'

export const REPO_ROOT = path.resolve(
  fileURLToPath(import.meta.url),
  '../../../..'
)

/** A refusal whose message is written for the designer. */
export class ReleaseRefused extends Error {}

export const HAND_OFF_LINE =
  'Changes reach the real journey only through the plants-frontend team: say "hand this to the real team" and Claude will prepare a brief and a patch.'

export const setsDirOf = (repoRoot) =>
  path.join(repoRoot, 'src/server/app/sets')

/** Every set in the checkout: each folder under `sets/` with a `set.js`. */
export const setIdsIn = (repoRoot) => {
  const setsDir = setsDirOf(repoRoot)
  return readdirSync(setsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((setId) => existsSync(path.join(setsDir, setId, 'set.js')))
    .toSorted()
}

/** The set's folder, gateway and release record, refusing a set that does
 * not exist. */
export const existingSet = (repoRoot, setId) => {
  if (!setId) {
    throw new ReleaseRefused('Say which release, for example "plants-dr2".')
  }
  const paths = pathsFor(repoRoot, setId)
  if (!existsSync(path.join(paths.setDir, 'set.js'))) {
    const known = setIdsIn(repoRoot).join(', ')
    throw new ReleaseRefused(
      `There is no release called "${setId}". The releases here are: ${known}.`
    )
  }
  return { setId, ...paths, record: readReleaseRecord(paths.setDir) }
}

/** Refuses the two sets that are not design releases. */
export const refuseNonRelease = (setId, action) => {
  if (setId === REAL_JOURNEY) {
    throw new ReleaseRefused(
      `You cannot ${action} high-risk-plants: it is the real journey, owned by the plants-frontend team and updated every week. ${HAND_OFF_LINE}`
    )
  }
  if (setId === PLACEHOLDER) {
    throw new ReleaseRefused(
      `You cannot ${action} sample-journey: it is a placeholder the prototype keeps to prove it can serve more than one journey.`
    )
  }
}

/** The repo-relative paths that make up a set. */
export const relativePathsOf = (setId) => [
  `src/server/app/sets/${setId}`,
  `src/server/app/routes-${setId}.js`
]
