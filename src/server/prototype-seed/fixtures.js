import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Where an example's answers come from.
 *
 * Every set that can be walked has a happy-path fixture: the canned answers its
 * own Playwright journey smoke test drives the real journey with. The seed
 * reads that file back rather than inventing answers, so an example can never
 * describe a consignment the real journey would refuse.
 *
 * Designers add their own named fixtures in
 * `src/server/prototype-seed/fixtures/<set-id>/<file>.json`, so they never edit
 * the set's fixture itself (in high-risk-plants it belongs to the real
 * service). A named fixture is either a whole walk (`steps`, the same shape as
 * the happy path) or a happy-path walk with some answers changed:
 *
 *   { "seedPotatoesToFelixstowe": {
 *       "from": "seedPotatoes",
 *       "answers": { "arrival-details": { "proposedPlaceOfLanding": "GB FXT" } } } }
 */

export const HAPPY_PATH = 'happy-path'

const APP_SETS = fileURLToPath(new URL('../app/sets/', import.meta.url))
const NAMED_FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url))

/** Set ids are lower-case words joined by hyphens; anything else is refused
 * before it can become part of a file path. */
export const SET_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const isSetId = (setId) =>
  typeof setId === 'string' && SET_ID_PATTERN.test(setId)

/**
 * The set's happy-path fixture file.
 *
 * @param {string} setId
 * @param {string} [appSets] - the sets folder, for tests.
 * @returns {string} the file's path.
 */
export const happyPathFileFor = (setId, appSets = APP_SETS) =>
  join(
    appSets,
    setId,
    'journeys',
    'linear',
    'flow',
    'fixtures',
    'happy-path.json'
  )

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

/**
 * Every fixture file the set's examples may name, by file name without
 * `.json`: `happy-path` first, then each named fixture file.
 *
 * @param {string} setId
 * @param {{ appSets?: string, namedFixtures?: string }} [folders] - for tests.
 * @returns {Record<string, Record<string, object>>} fixtures by file, then by
 * name.
 */
export const loadFixturePool = (
  setId,
  { appSets = APP_SETS, namedFixtures = NAMED_FIXTURES } = {}
) => {
  const pool = {}
  const happyPath = happyPathFileFor(setId, appSets)
  if (existsSync(happyPath)) {
    pool[HAPPY_PATH] = readJson(
      happyPath,
      `The ${setId} happy-path fixture (journeys/linear/flow/fixtures/happy-path.json)`
    )
  }
  const folder = join(namedFixtures, setId)
  if (existsSync(folder)) {
    for (const file of readdirSync(folder).filter((name) =>
      name.endsWith('.json')
    )) {
      const name = basename(file, '.json')
      pool[name] = readJson(
        join(folder, file),
        `src/server/prototype-seed/fixtures/${setId}/${file}`
      )
    }
  }
  return pool
}

const filesHolding = (pool, name) =>
  Object.keys(pool).filter((file) => Object.hasOwn(pool[file], name))

/**
 * Finds one fixture by name, or by file and name.
 *
 * @param {Record<string, Record<string, object>>} pool - from
 * `loadFixturePool`.
 * @param {string|{file: string, name: string}} reference - how the example
 * named it.
 * @returns {{ file: string, name: string, fixture: object } | { problem: string }}
 * the fixture, or why it could not be found.
 */
export const findFixture = (pool, reference) => {
  if (typeof reference === 'string') {
    const files = filesHolding(pool, reference)
    if (files.length === 0) {
      return {
        problem: `names the fixture '${reference}', which is not in ${Object.keys(pool).join(' or ') || 'any fixture file'}. The fixtures are: ${fixtureNames(pool).join(', ') || 'none'}`
      }
    }
    if (files.length > 1) {
      return {
        problem: `names the fixture '${reference}', which is in both ${files.join(' and ')}. Say which with fixture: { file: '${files[0]}', name: '${reference}' }`
      }
    }
    return {
      file: files[0],
      name: reference,
      fixture: pool[files[0]][reference]
    }
  }
  const { file, name } = reference ?? {}
  if (!pool[file]) {
    return {
      problem: `names the fixture file '${file}', which does not exist. The files are: ${Object.keys(pool).join(', ') || 'none'}`
    }
  }
  if (!Object.hasOwn(pool[file], name)) {
    return {
      problem: `names the fixture '${name}' in '${file}', which is not there. That file has: ${Object.keys(pool[file]).join(', ')}`
    }
  }
  return { file, name, fixture: pool[file][name] }
}

/**
 * Every fixture name in the pool, for listing in error messages.
 *
 * @param {Record<string, Record<string, object>>} pool
 * @returns {string[]} the names.
 */
export function fixtureNames(pool) {
  return [...new Set(Object.values(pool).flatMap((file) => Object.keys(file)))]
}
