import { DELETED } from './grammar.js'
import { seedSet } from './seed-set.js'

export { EXAMPLE_DATA_AUTHOR_ID } from './seed-set.js'

/**
 * Seeds the high-risk-plants set's examples and answers with the reference
 * numbers every session is told about (shared, not deleted).
 *
 * Kept for the tests outside this folder that seed high-risk-plants directly
 * (`sets-index/reset-controller.test.js`, `prototype-sets/production-run.test.js`).
 * New code seeds any set with `seedSet(server, setId)` from `seed-set.js`.
 *
 * @param {import('@hapi/hapi').Server} server
 * @returns {Promise<string[]>} the shared examples' reference numbers.
 */
export const seedHighRiskPlants = async (server) =>
  (await seedSet(server, 'high-risk-plants'))
    .filter(
      (example) => example.organisationId === null && example.status !== DELETED
    )
    .map((example) => example.journeyId)
