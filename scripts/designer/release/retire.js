import { existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { unregisterSet } from '../../new-set/register-set.js'
import { removeDescription } from '../../new-set/describe-set.js'
import {
  ownedPathsOf,
  removeOwnedPaths
} from '../../new-set/update-overrides.js'
import { git, isCommitted, isTracked, uncommittedChanges } from './git.js'
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

/** The files every release adds a line to, kept by the prototype. */
const SHARED_FILES = [
  'overrides.json',
  'src/server/prototype-sets/index.js',
  'src/server/prototype-sets/descriptions.js'
]

/** Kept data, never committed (`.cache` is ignored). */
const cacheOf = (setId) => [`.cache/designer/data/${setId}.json`]

/** Removes each path that exists, from git too when it is tracked. With
 * `unstage`, a path only staged (after a failed save of a never-saved
 * release) is taken out of the index first, which `git rm` alone refuses. */
const removePaths = (repoRoot, paths, { unstage = false } = {}) => {
  const present = paths.filter((relativePath) =>
    existsSync(path.join(repoRoot, relativePath))
  )
  for (const relativePath of present) {
    if (isTracked(repoRoot, [relativePath])) {
      git(repoRoot, [
        'rm',
        '-r',
        '-q',
        ...(unstage ? ['--cached', '-f'] : []),
        '--',
        relativePath
      ])
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
  const neverSaved = !isCommitted(repoRoot, own)
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

  const removed = removePaths(repoRoot, [...own, ...extras], {
    unstage: neverSaved
  })
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
  if (neverSaved) {
    // A failed save may have staged the release's lines in these shared
    // files. Resetting their index entries to the last commit keeps the
    // working files as they now are and loses nothing that was saved.
    git(repoRoot, ['reset', '-q', '--', ...SHARED_FILES])
  }
  return { removed, neverSaved }
}
