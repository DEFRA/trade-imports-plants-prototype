import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { happyPathFileFor, isSetId, loadFixturePool } from './fixtures.js'
import { validateExamples } from './grammar.js'
import { defaultExamples } from './scenarios/default.js'

/**
 * Which examples a set has, and where they come from:
 *
 * 1. `src/server/prototype-seed/scenarios/<set-id>.js`, when it exists;
 * 2. otherwise the four default examples, when the set has a happy-path
 *    fixture to replay;
 * 3. otherwise none (sample-journey, whose one page saves nothing).
 */

const SCENARIOS = fileURLToPath(new URL('./scenarios/', import.meta.url))

export const SCENARIO_FILES = 'src/server/prototype-seed/scenarios'

/**
 * The scenario file a set's examples live in, whether or not it exists yet.
 *
 * @param {string} setId
 * @param {string} [scenarios] - the scenarios folder, for tests.
 * @returns {string} the file's path.
 */
export const scenarioFileFor = (setId, scenarios = SCENARIOS) =>
  join(scenarios, `${setId}.js`)

/**
 * Where a set's examples come from.
 *
 * @param {string} setId
 * @param {{ scenarios?: string, appSets?: string }} [folders] - for tests.
 * @returns {'scenarios'|'default'|null} a scenario file, the default four, or
 * nothing to seed.
 */
export const exampleSourceFor = (setId, { scenarios, appSets } = {}) => {
  if (!isSetId(setId) || setId === 'default') {
    return null
  }
  if (existsSync(scenarioFileFor(setId, scenarios))) {
    return 'scenarios'
  }
  return existsSync(happyPathFileFor(setId, appSets)) ? 'default' : null
}

/**
 * Loads a scenario file synchronously, so the chooser can list a set's examples
 * while it renders. Node 24 can `require` an ES module that has no top-level
 * `await`, which a scenario file never needs.
 */
const requireScenarios = createRequire(import.meta.url)

/**
 * The set's examples, checked and turned into the walks the seed replays.
 *
 * @param {string} setId
 * @param {{ scenarios?: string, appSets?: string, namedFixtures?: string }}
 * [folders] - for tests.
 * @returns {object[]} the checked examples, or none.
 * @throws {import('./grammar.js').ExampleGrammarError} when an example is
 * written wrongly, naming every problem.
 */
export const loadExamples = (setId, folders = {}) => {
  const source = exampleSourceFor(setId, folders)
  if (!source) {
    return []
  }
  const pool = loadFixturePool(setId, folders)
  if (source === 'default') {
    return validateExamples(defaultExamples(pool), {
      pool,
      source: `the default examples for ${setId}`
    })
  }
  const { examples } = requireScenarios(
    scenarioFileFor(setId, folders.scenarios)
  )
  return validateExamples(examples, {
    pool,
    source: `${SCENARIO_FILES}/${setId}.js`
  })
}
