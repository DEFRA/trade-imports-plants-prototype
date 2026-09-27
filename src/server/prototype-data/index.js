import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { currentSetId, hasSetContext } from '../app/shared/set-context.js'
import { KINDS, overlayProblems } from './rows.js'
import { liveList, liveLookup } from './live.js'

/**
 * Extra parties, ports and countries a designer adds for the prototype, on top
 * of the rows the stub services already serve.
 *
 *   src/server/prototype-data/_all/parties.json        every set
 *   src/server/prototype-data/<set-id>/ports.json      one set only
 *
 * Each file is optional. Rows come after the stub rows: first the stub, then
 * `_all`, then the active set's own folder. The active set is the one the
 * request is in (`shared/set-context.js`); outside every set only `_all`
 * applies.
 *
 * Files are read once and kept. Saving one restarts the local prototype, which
 * reads it again.
 */

export const EVERY_SET = '_all'

const DEFAULT_ROOT = fileURLToPath(new URL('.', import.meta.url))

let root = DEFAULT_ROOT
const cache = new Map()

/**
 * Points the overlay at another folder. For tests only: the prototype always
 * reads `src/server/prototype-data`.
 *
 * @param {string} [folder] - the folder to read, or nothing to go back to the
 * real one.
 */
export const useOverlayRoot = (folder = DEFAULT_ROOT) => {
  root = folder
  cache.clear()
}

const relativeName = (folder, file) =>
  `src/server/prototype-data/${folder}/${file}`

const readJson = (path, name) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(
      `${name} is not valid JSON: ${error.message}. Check for a missing comma or quote.`,
      { cause: error }
    )
  }
}

const rowsIn = (kind, folder) => {
  const spec = KINDS[kind]
  const path = join(root, folder, spec.file)
  if (!existsSync(path)) {
    return []
  }
  const name = relativeName(folder, spec.file)
  const rows = readJson(path, name)
  const taken = new Set(spec.stubKeys())
  if (folder !== EVERY_SET) {
    for (const row of rowsFor(kind, EVERY_SET)) {
      taken.add(spec.keyOf(row))
    }
  }
  const problems = overlayProblems(kind, rows, name, taken)
  if (problems.length > 0) {
    throw new Error(problems.join('\n'))
  }
  return rows
}

function rowsFor(kind, folder) {
  const key = `${kind}:${folder}`
  if (!cache.has(key)) {
    cache.set(key, rowsIn(kind, folder))
  }
  return cache.get(key)
}

const activeFolders = () =>
  hasSetContext() ? [EVERY_SET, currentSetId()] : [EVERY_SET]

const shapedFor = (kind) => {
  const key = `${kind}:shaped:${activeFolders().join('+')}`
  if (!cache.has(key)) {
    const shaped = activeFolders()
      .flatMap((folder) => rowsFor(kind, folder))
      .map(KINDS[kind].toRow)
    cache.set(key, Object.freeze(shaped))
  }
  return cache.get(key)
}

/** The active set's extra address-book records, in the stub book's shape. */
export const extraParties = () => shapedFor('parties')

/** The active set's extra ports of entry, as `{ code, name }`. */
export const extraPorts = () => shapedFor('ports')

/** The active set's extra countries, as `{ code, name }`. */
export const extraCountries = () => shapedFor('countries')

const extraCountryLabels = () => {
  const key = `countries:labels:${activeFolders().join('+')}`
  if (!cache.has(key)) {
    cache.set(
      key,
      Object.fromEntries(extraCountries().map(({ code, name }) => [code, name]))
    )
  }
  return cache.get(key)
}

/**
 * The stub address book with the active set's extra parties after it. Used by
 * `services/address-book/index.js`.
 *
 * @param {object[]} stubBook - the stub book's records.
 * @returns {object[]} a read-only view.
 */
export const withExtraParties = (stubBook) => liveList(stubBook, extraParties)

/**
 * The stub ports with the active set's extra ports after them. Used by
 * `services/ports/index.js`.
 *
 * @param {object[]} stubPorts - the stub ports.
 * @returns {object[]} a read-only view.
 */
export const withExtraPorts = (stubPorts) => liveList(stubPorts, extraPorts)

/**
 * The stub country names by code, with the active set's extra countries
 * added. Used by `services/countries/index.js`.
 *
 * @param {Record<string, string>} stubLabels - the stub names by code.
 * @returns {Record<string, string>} a read-only view.
 */
export const withExtraCountries = (stubLabels) =>
  liveLookup(stubLabels, extraCountryLabels)

const overlayFolders = () =>
  existsSync(root)
    ? readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    : []

/**
 * Reads every overlay file in every folder and reports each problem, rather
 * than waiting for a page to need the rows. `designer:examples -- check` runs
 * this first.
 *
 * @returns {{ problems: string[], counts: Record<string, number> }} each
 * problem in plain English, and how many extra rows of each kind were found.
 */
export const checkOverlays = () => {
  const problems = []
  const counts = { parties: 0, ports: 0, countries: 0 }
  for (const folder of overlayFolders()) {
    for (const kind of Object.keys(KINDS)) {
      try {
        counts[kind] += rowsFor(kind, folder).length
      } catch (error) {
        problems.push(error.message)
      }
    }
  }
  return { problems, counts }
}
