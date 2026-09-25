import { sampleJourney } from '../app/routes-sample-journey.js'
import { SET_BASE as SAMPLE_JOURNEY_BASE } from '../app/sets/sample-journey/set.js'
import { setsIndex } from '../sets-index/index.js'
import { adoptKnownJourneys } from '../prototype-seed/adopt-known-journeys.js'

/**
 * Everything this prototype host mounts on top of plants-frontend's router:
 * the prototype-only sets, each under its own prefix, and the chooser at `/`
 * in place of plants-frontend's redirect to its default set.
 *
 * Kept in one prototype-owned plugin so router.js carries a single-line hook
 * and every weekly sync from plants-frontend merges it untouched otherwise. A
 * new prototype set is mounted here, and then appears on the chooser by being
 * mounted — there is no list to maintain.
 */
export const prototypeSets = {
  plugin: {
    name: 'prototype-sets',
    async register(server) {
      await server.register(sampleJourney, {
        routes: { prefix: SAMPLE_JOURNEY_BASE }
      })
      await server.register([setsIndex, adoptKnownJourneys])
    }
  }
}
