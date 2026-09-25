import process from 'node:process'

import { records } from '../app/engine/persistence/records.js'
import { withSetContext } from '../app/shared/set-context.js'
import { seedHighRiskPlants } from './seed-high-risk-plants.js'
import { clearSeeded, recordSeeded } from './registry.js'

/**
 * Every set with example data to seed, by set id.
 *
 * `sample-journey` is not here: it configures the shared records seam but its
 * one page never calls `records.create()`, so there is nothing for it to
 * seed — see PROTOTYPE.md.
 */
const SEEDERS = { 'high-risk-plants': seedHighRiskPlants }

export { seededIdsFor } from './registry.js'

/**
 * Seeding is on unless `PROTOTYPE_SEED=false`. The FIT web server sets that,
 * because every FIT spec expects its own dashboard to start empty and runs in
 * parallel with the others.
 */
export const isSeedingEnabled = () => process.env.PROTOTYPE_SEED !== 'false'

const seedSet = async (server, setId) => {
  if (!isSeedingEnabled()) {
    return
  }
  recordSeeded(setId, await SEEDERS[setId](server))
}

/**
 * Boot-time seeding for every set that has a seeder. Runs `onPostStart`, once
 * the whole server — every set's routes, the records and session seams — is
 * registered and listening, so the seeder's own requests land the same way a
 * designer's browser would.
 */
export const seedOnBoot = {
  plugin: {
    name: 'prototype-seed-on-boot',
    register(server) {
      server.ext('onPostStart', async (instance) => {
        for (const setId of Object.keys(SEEDERS)) {
          await seedSet(instance, setId)
        }
      })
    }
  }
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
  if (SEEDERS[setId]) {
    await seedSet(server, setId)
  }
}

export const hasSeeder = (setId) => Boolean(SEEDERS[setId])
