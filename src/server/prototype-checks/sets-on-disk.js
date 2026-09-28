import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

/**
 * The sets this prototype holds, read straight off the folder tree so the
 * prototype checks never depend on the designer scripts under `scripts/`.
 * A set is a folder under `src/server/app/sets` with a `set.js`.
 */
export const SETS_FOLDER = fileURLToPath(
  new URL('../app/sets', import.meta.url)
)

/** The real journey. Its own upstream tests already cover its copy. */
export const REAL_JOURNEY_SET = 'high-risk-plants'

/**
 * `npm run designer:check -- --set <id>` sets this so the prototype checks
 * look at one set only. Unset (as in `npm test`), they look at every set.
 */
export const CHECK_SET_ENV = 'DESIGNER_CHECK_SET'

/** Every set id on disk, sorted. */
export const setIdsOnDisk = (setsFolder = SETS_FOLDER) =>
  readdirSync(setsFolder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((id) => existsSync(path.join(setsFolder, id, 'set.js')))
    .sort((first, second) => first.localeCompare(second))

/** The absolute folder of one set. */
export const setFolderOf = (setId, setsFolder = SETS_FOLDER) =>
  path.join(setsFolder, setId)

/**
 * Narrows `setIds` to the one set named by `DESIGNER_CHECK_SET`, when it is
 * set. Otherwise returns every id unchanged.
 */
export const setsToCheck = (setIds, env = process.env) => {
  const chosen = env[CHECK_SET_ENV]
  return chosen ? setIds.filter((id) => id === chosen) : setIds
}
