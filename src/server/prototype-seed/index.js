import process from 'node:process'

import { records } from '../app/engine/persistence/records.js'
import { withSetContext } from '../app/shared/set-context.js'
import {
  EXAMPLE_DATA_AUTHOR_ID,
  seedHighRiskPlants
} from './seed-high-risk-plants.js'
import { clearSeeded, hasBeenSeeded, recordSeeded } from './registry.js'

/**
 * Every set with example data to seed, by set id.
 *
 * `sample-journey` is not here: it configures the shared records seam but its
 * one page never calls `records.create()`, so there is nothing for it to
 * seed — see PROTOTYPE.md.
 */
const SEEDERS = { 'high-risk-plants': seedHighRiskPlants }

/**
 * Each seeded set's own throwaway author identity, by set id — see
 * `isSeedAuthorRequest`.
 */
const SEED_AUTHOR_IDS = { 'high-risk-plants': EXAMPLE_DATA_AUTHOR_ID }

/**
 * Whether a request is one of the seeder's own, driving the set's journey
 * through its real routes to create the shared example data — as opposed to
 * a real signed-in visitor. `adopt-known-journeys.js` skips these: the seed
 * client is authenticated too, so without this its own requests would trip
 * the same lazy-seed check they exist to satisfy, recursively, forever.
 *
 * @param {string} setId
 * @param {import('@hapi/hapi').Request} request
 * @returns {boolean}
 */
export const isSeedAuthorRequest = (setId, request) =>
  request.auth.credentials?.organisationId === SEED_AUTHOR_IDS[setId]

export { seededIdsFor } from './registry.js'

/**
 * Seeding is on unless `PROTOTYPE_SEED=false`. The FIT web server sets that,
 * because every FIT spec expects its own dashboard to start empty and runs in
 * parallel with the others.
 */
export const isSeedingEnabled = () => process.env.PROTOTYPE_SEED !== 'false'

const seedSet = async (server, setId) => {
  recordSeeded(setId, await SEEDERS[setId](server))
}

/**
 * One in-flight seeding promise per set, keyed by set id. Guards against two
 * concurrent first requests both starting a seed: the first caller starts
 * it, and every other caller for the same set awaits that same promise
 * instead of starting its own.
 */
const inFlightSeeds = new Map()

/**
 * Seeds a set's shared example notifications the first time a signed-in
 * request reaches it, rather than at server start — see PROTOTYPE.md.
 * `adopt-known-journeys.js` calls this from `onPreHandler`, so seeding
 * finishes before the handler runs and the seeded ids are adopted in the
 * same request that triggered it.
 *
 * Does nothing once the set has been seeded, when the set has no seeder, or
 * when seeding is switched off.
 *
 * @param {import('@hapi/hapi').Server} server
 * @param {string} setId
 */
export const ensureSeeded = async (server, setId) => {
  if (!isSeedingEnabled() || !SEEDERS[setId] || hasBeenSeeded(setId)) {
    return
  }
  if (!inFlightSeeds.has(setId)) {
    inFlightSeeds.set(
      setId,
      seedSet(server, setId).finally(() => inFlightSeeds.delete(setId))
    )
  }
  await inFlightSeeds.get(setId)
}

/**
 * Clears every record in a set and, when the set has a seeder, seeds its
 * example data again — the chooser's "Reset this prototype's data" action.
 *
 * The data is shared, so this resets it for everyone using the prototype.
 *
 * @param {import('@hapi/hapi').Server} server
 * @param {string} setId
 */
export const resetSet = async (server, setId) => {
  await withSetContext(setId, () => records.clear())
  clearSeeded(setId)
  if (isSeedingEnabled() && SEEDERS[setId]) {
    await seedSet(server, setId)
  }
}

export const hasSeeder = (setId) => Boolean(SEEDERS[setId])
