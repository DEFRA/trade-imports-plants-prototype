import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import {
  PLACEHOLDER,
  REAL_JOURNEY
} from '../../../src/server/prototype-sets/releases.js'
import {
  addDescription,
  describedSetIds,
  hasDescription,
  removeDescription
} from '../../new-set/describe-set.js'
import { placeholderDescription } from '../../new-set/release-record.js'
import {
  isRegistered,
  registerSet,
  registeredSetIds,
  unregisterSet
} from '../../new-set/register-set.js'
import {
  addOwnedPaths,
  ownedPathsOf,
  removeOwnedPaths
} from '../../new-set/update-overrides.js'
import { readReleaseRecord } from '../../new-set/release-record.js'
import { runGit } from './git.js'
import { setIdsIn } from './sets.js'

/** The three shared files every new release adds a line to. */
export const MOUNT_FILES = Object.freeze([
  'overrides.json',
  'src/server/prototype-sets/index.js',
  'src/server/prototype-sets/descriptions.js'
])

const CONFLICT = /^(<{7}|={7}|>{7})( |$)/m
const FIXED_SETS = new Set([REAL_JOURNEY, PLACEHOLDER])

/**
 * Puts back a file git left with <<<<<<< conflict markers: this branch's side
 * of the merge (git's stage 2), or else the last saved version. The releases
 * the other side added are mounted again afterwards from the folders on disk.
 *
 * @returns {boolean} whether the file had conflict markers.
 */
const takeOurSide = (repoRoot, relativePath) => {
  const file = path.join(repoRoot, relativePath)
  if (!CONFLICT.test(readFileSync(file, 'utf8'))) {
    return false
  }
  for (const ref of [`:2:${relativePath}`, `HEAD:${relativePath}`]) {
    const shown = runGit(repoRoot, ['show', ref])
    if (shown.status === 0) {
      writeFileSync(file, shown.stdout)
      return true
    }
  }
  throw new Error(
    `${relativePath} has conflict markers and git has no clean version of it. Ask the maintainer.`
  )
}

const releasesOnDisk = (repoRoot) =>
  setIdsIn(repoRoot).filter(
    (setId) =>
      !FIXED_SETS.has(setId) &&
      existsSync(path.join(repoRoot, `src/server/app/routes-${setId}.js`))
  )

const setFolderExists = (repoRoot, setId) =>
  existsSync(path.join(repoRoot, 'src/server/app/sets', setId, 'set.js'))

const OWNED_SHAPES = [
  /^src\/server\/app\/sets\/([a-z0-9-]+)\/\*\*$/,
  /^src\/server\/app\/routes-([a-z0-9-]+)\.js$/
]

const ownedSetIds = (overridesPath) =>
  JSON.parse(readFileSync(overridesPath, 'utf8'))
    .ours.map((entry) =>
      OWNED_SHAPES.map((shape) => shape.exec(entry)?.[1]).find(Boolean)
    )
    .filter(Boolean)

/**
 * Rebuilds the three shared files every release adds a line to, from the
 * release folders on disk: each release is mounted in
 * prototype-sets/index.js, described in descriptions.js and listed in
 * overrides.json `ours`; a release whose folder is gone is taken out of all
 * three. A file left with merge conflict markers (two branches that each
 * started a release) is first put back to this branch's side.
 *
 * @returns {{ resolved: string[], added: string[], removed: string[] }} plain
 * lines saying what changed.
 */
export const remountReleases = ({ repoRoot }) => {
  const resolved = MOUNT_FILES.filter((file) => takeOurSide(repoRoot, file))
  const indexPath = path.join(repoRoot, MOUNT_FILES[1])
  const descriptionsPath = path.join(repoRoot, MOUNT_FILES[2])
  const overridesPath = path.join(repoRoot, MOUNT_FILES[0])
  const added = []
  const removed = []

  for (const setId of releasesOnDisk(repoRoot)) {
    if (!isRegistered(indexPath, { setId })) {
      registerSet(indexPath, { setId })
      added.push(`mounted ${setId}`)
    }
    if (!hasDescription(descriptionsPath, { setId })) {
      const record = readReleaseRecord(
        path.join(repoRoot, 'src/server/app/sets', setId)
      )
      addDescription(descriptionsPath, {
        setId,
        text:
          record?.description ??
          placeholderDescription(
            record?.from ?? REAL_JOURNEY,
            record?.createdAt ?? new Date().toISOString()
          )
      })
      added.push(`described ${setId} on the chooser`)
    }
    const before = JSON.parse(readFileSync(overridesPath, 'utf8')).ours.length
    addOwnedPaths(overridesPath, ownedPathsOf(setId))
    if (JSON.parse(readFileSync(overridesPath, 'utf8')).ours.length > before) {
      added.push(`marked ${setId} as yours in overrides.json`)
    }
  }

  const gone = (setId) =>
    !FIXED_SETS.has(setId) && !setFolderExists(repoRoot, setId)
  for (const setId of [...new Set(registeredSetIds(indexPath))].filter(gone)) {
    if (unregisterSet(indexPath, { setId })) {
      removed.push(`unmounted ${setId}: its folder is gone`)
    }
  }
  for (const setId of describedSetIds(descriptionsPath).filter(gone)) {
    removeDescription(descriptionsPath, { setId })
    removed.push(`removed the chooser description of ${setId}`)
  }
  for (const setId of [...new Set(ownedSetIds(overridesPath))].filter(gone)) {
    removeOwnedPaths(overridesPath, ownedPathsOf(setId))
    removed.push(`removed ${setId} from overrides.json`)
  }
  return { resolved, added, removed }
}
