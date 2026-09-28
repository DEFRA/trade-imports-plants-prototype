import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/**
 * Reads what each prototype-owned service says about itself: the
 * `NEEDS_A_REAL_SERVICE` sentence and the `CONTRACT` its `index.js` exports.
 *
 * A service is prototype-owned when `overrides.json` lists its folder on its
 * own line in `ours`, as `src/server/app/services/<name>/**`. Every other
 * folder under `src/server/app/services/` belongs to the real service.
 * `npm run designer:service -- list` prints this, and a hand-off reads it to
 * describe the service a developer needs to build.
 */

const DEFAULT_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

const SERVICE_GLOB =
  /^src\/server\/app\/services\/([a-z0-9]+(?:-[a-z0-9]+)*)\/\*\*$/

/** The folder a prototype-owned service lives in, relative to the repo. */
export const serviceFolderOf = (name) => `src/server/app/services/${name}`

/** The `ours` line that makes a service folder the prototype's own. */
export const ownedGlobOf = (name) => `${serviceFolderOf(name)}/**`

/**
 * The names of the prototype-owned services, in `ours` order.
 *
 * @param {{ ours: string[] }} overrides - `overrides.json`, parsed.
 * @returns {string[]} the service names.
 */
export const ownedServiceNames = (overrides) =>
  (overrides.ours ?? [])
    .map((line) => SERVICE_GLOB.exec(line)?.[1])
    .filter(Boolean)

const readOverrides = (root) =>
  JSON.parse(readFileSync(path.join(root, 'overrides.json'), 'utf8'))

/**
 * Every prototype-owned service, with what it says it needs.
 *
 * @param {object} [options]
 * @param {string} [options.root] - the repo root.
 * @returns {Promise<Array<{ name: string, folder: string, needsARealService: string|null, contract: object|null, problem?: string }>>}
 * one entry per service. `problem` says why a service could not be read.
 */
export const describeServices = async ({ root = DEFAULT_ROOT } = {}) => {
  const names = ownedServiceNames(readOverrides(root))
  return Promise.all(
    names.map(async (name) => {
      const folder = serviceFolderOf(name)
      const indexFile = path.join(root, folder, 'index.js')
      const entry = { name, folder, needsARealService: null, contract: null }
      if (!existsSync(indexFile)) {
        return { ...entry, problem: `${folder}/index.js does not exist` }
      }
      try {
        const service = await import(pathToFileURL(indexFile).href)
        return {
          ...entry,
          needsARealService: service.NEEDS_A_REAL_SERVICE ?? null,
          contract: service.CONTRACT ?? null
        }
      } catch (error) {
        return { ...entry, problem: error.message }
      }
    })
  )
}
