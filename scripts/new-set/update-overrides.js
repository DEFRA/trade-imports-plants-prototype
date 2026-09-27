import { readFileSync, writeFileSync } from 'node:fs'

const readOverrides = (overridesPath) =>
  JSON.parse(readFileSync(overridesPath, 'utf8'))

const writeOverrides = (overridesPath, overrides) =>
  writeFileSync(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`)

/** A set's own paths: the two globs `new:set` marks as the prototype's. */
export const ownedPathsOf = (setId) => [
  `src/server/app/sets/${setId}/**`,
  `src/server/app/routes-${setId}.js`
]

/** Adds a scaffolded set's own paths to `overrides.json`'s `ours` list, so
 * the weekly sync never treats them as something to merge from upstream. */
export const addOwnedPaths = (overridesPath, newPaths) => {
  const overrides = readOverrides(overridesPath)
  for (const path of newPaths) {
    if (!overrides.ours.includes(path)) {
      overrides.ours.push(path)
    }
  }
  writeOverrides(overridesPath, overrides)
}

/**
 * Takes a retired set's paths back out of `ours`.
 *
 * @returns {string[]} the paths that were there and are now removed.
 */
export const removeOwnedPaths = (overridesPath, paths) => {
  const overrides = readOverrides(overridesPath)
  const removed = overrides.ours.filter((path) => paths.includes(path))
  overrides.ours = overrides.ours.filter((path) => !paths.includes(path))
  writeOverrides(overridesPath, overrides)
  return removed
}
