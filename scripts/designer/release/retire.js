import { existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { unregisterSet } from '../../new-set/register-set.js'
import { removeDescription } from '../../new-set/describe-set.js'
import {
  ownedPathsOf,
  removeOwnedPaths
} from '../../new-set/update-overrides.js'
import { git, isTracked, uncommittedChanges } from './git.js'
import {
  ReleaseRefused,
  existingSet,
  refuseNonRelease,
  relativePathsOf
} from './sets.js'

/** Per-release files other parts of the prototype keep, removed with it
 * when they exist. */
const extrasOf = (setId) => [
  `src/server/prototype-seed/scenarios/${setId}.js`,
  `src/server/prototype-seed/fixtures/${setId}`,
  `src/server/prototype-data/${setId}`
]

/** Kept data, never committed (`.cache` is ignored). */
const cacheOf = (setId) => [`.cache/designer/data/${setId}.json`]

const removePaths = (repoRoot, paths) => {
  const present = paths.filter((relativePath) =>
    existsSync(path.join(repoRoot, relativePath))
  )
  for (const relativePath of present) {
    if (isTracked(repoRoot, [relativePath])) {
      git(repoRoot, ['rm', '-r', '-q', '--', relativePath])
    }
    rmSync(path.join(repoRoot, relativePath), { recursive: true, force: true })
  }
  return present
}

/**
 * Retires a design release: removes its folder and gateway (with `git rm`
 * when committed), its mount, its chooser description, its two `ours` globs
 * in overrides.json, and its example scenarios, fixtures and extra data.
 *
 * Refuses when a saved release has changes that are not saved, so retiring
 * never throws work away. A saved release stays in git history once retired.
 *
 * A release that was never saved is not in git history at all, so removing
 * it is for good. It is refused unless `discard` is true.
 *
 * @returns {{ removed: string[], neverSaved: boolean }} what was removed, one
 *   plain line each, and whether the release had never been saved.
 */
export const retireRelease = (setId, { repoRoot, discard = false }) => {
  refuseNonRelease(setId, 'retire')
  existingSet(repoRoot, setId)

  const own = relativePathsOf(setId)
  const extras = extrasOf(setId)
  const neverSaved = !isTracked(repoRoot, own)
  if (neverSaved && !discard) {
    throw new ReleaseRefused(
      `"${setId}" was never saved, so it is not in git history: retiring it throws it and every change in it away for good.\nTo keep it, save it first (say "save my work").\nTo throw it away, run: npm run designer:release -- retire ${setId} --discard`
    )
  }
  const unsaved = uncommittedChanges(repoRoot, [...own, ...extras])
  if (unsaved.length > 0 && !neverSaved) {
    throw new ReleaseRefused(
      `"${setId}" has changes that are not saved yet:\n${unsaved.join('\n')}\nSave them (say "save my work") or throw them away first, then retire it.`
    )
  }

  const removed = removePaths(repoRoot, [...own, ...extras])
  removePaths(repoRoot, cacheOf(setId))

  if (
    unregisterSet(path.join(repoRoot, 'src/server/prototype-sets/index.js'), {
      setId
    })
  ) {
    removed.push(`its mount in src/server/prototype-sets/index.js`)
  }
  if (
    removeDescription(
      path.join(repoRoot, 'src/server/prototype-sets/descriptions.js'),
      { setId }
    )
  ) {
    removed.push(
      `its chooser description in src/server/prototype-sets/descriptions.js`
    )
  }
  for (const glob of removeOwnedPaths(
    path.join(repoRoot, 'overrides.json'),
    ownedPathsOf(setId)
  )) {
    removed.push(`"${glob}" from overrides.json`)
  }
  return { removed, neverSaved }
}
