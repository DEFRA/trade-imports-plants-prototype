import { readFileSync, writeFileSync } from 'node:fs'

/** Adds a scaffolded set's own paths to `overrides.json`'s `ours` list, so
 * the weekly sync never treats them as something to merge from upstream. */
export const addOwnedPaths = (overridesPath, newPaths) => {
  const overrides = JSON.parse(readFileSync(overridesPath, 'utf8'))
  for (const path of newPaths) {
    if (!overrides.ours.includes(path)) {
      overrides.ours.push(path)
    }
  }
  writeFileSync(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`)
}
