import { records } from '../app/engine/persistence/records.js'
import { withSetContext } from '../app/shared/set-context.js'
import { PROTOTYPE_ORGANISATIONS } from '../prototype-sets/organisations.js'
import { seedHighRiskPlantsFor } from './seed-high-risk-plants.js'
import { clearSeededForOrganisation, recordSeeded } from './registry.js'

/**
 * Every set with example data to seed, by set id.
 *
 * `sample-journey` is not here: it configures the shared records seam but its
 * one page never calls `records.create()`, so there is nothing for it to
 * seed — see PROTOTYPE.md.
 */
const SEEDERS = { 'high-risk-plants': seedHighRiskPlantsFor }

export { seededIdsFor } from './registry.js'

const seedSetForEveryOrganisation = async (server, setId) => {
  const seeder = SEEDERS[setId]
  for (const { id: organisationId } of PROTOTYPE_ORGANISATIONS) {
    const journeyIds = await seeder(server, organisationId)
    recordSeeded(setId, organisationId, journeyIds)
  }
}

/**
 * Boot-time seeding for every set that has a seeder, in stub mode only. Runs
 * `onPostStart`, once the whole server — every set's routes, the records and
 * session seams — is registered and listening, so the seeder's own HTTP calls
 * land the same way a designer's browser would.
 */
export const seedOnBoot = {
  plugin: {
    name: 'prototype-seed-on-boot',
    register(server) {
      server.ext('onPostStart', async (instance) => {
        for (const setId of Object.keys(SEEDERS)) {
          await seedSetForEveryOrganisation(instance, setId)
        }
      })
    }
  }
}

const isPrototypeOrganisation = (organisationId) =>
  PROTOTYPE_ORGANISATIONS.some(({ id }) => id === organisationId)

/**
 * Clears one organisation's stub records in a set and, when the set has a
 * seeder and the organisation is one this prototype seeds, re-seeds that
 * organisation's example data — the "reset this organisation's data" action
 * on the chooser.
 *
 * Every other organisation's records in the same set are untouched: on a
 * shared deployment, one designer resetting their own view must never wipe
 * what anyone else is working on.
 *
 * @param {import('@hapi/hapi').Server} server
 * @param {string} setId
 * @param {string} organisationId
 */
export const reseedSet = async (server, setId, organisationId) => {
  await withSetContext(setId, () => records.clear(organisationId))
  clearSeededForOrganisation(setId, organisationId)
  if (SEEDERS[setId] && isPrototypeOrganisation(organisationId)) {
    const journeyIds = await SEEDERS[setId](server, organisationId)
    recordSeeded(setId, organisationId, journeyIds)
  }
}

export const hasSeeder = (setId) => Boolean(SEEDERS[setId])
