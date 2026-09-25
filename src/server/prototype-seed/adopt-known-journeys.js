import { setIdForPath, withSetContext } from '../app/shared/set-context.js'
import {
  knownJourneysCookie,
  session
} from '../app/engine/persistence/session.js'
import { hasSeeder, seededIdsFor } from './index.js'

/**
 * Adds the set's shared example notifications to every signed-in session.
 * The dashboard lists only what a session "knows" (see `engine/journey.js`),
 * so a notification seeded at boot is invisible until something adds it
 * there. Every signed-in user gets the same examples, whoever they are.
 *
 * Runs on every request under a seeded set rather than once at sign-in:
 * sign-in is server-wide and outside every set, so it has no set to ask.
 *
 * Writes go through the configured session seam, so this works with whichever
 * session the run uses. The stub session (local runs) reads the list from
 * `request.state` and writes it as a cookie, so `request.state` is kept in step
 * after each add: otherwise each add would overwrite the one before, and the
 * dashboard handler that runs next in this same request would not see them.
 * plants-frontend's own session (deployed runs) keeps the list in yar, which
 * already reads back its own writes, so the `request.state` update does nothing
 * there.
 */
const adopt = async (request, h) => {
  const setId = setIdForPath(request.path)
  if (!setId || !request.auth.isAuthenticated || !hasSeeder(setId)) {
    return h.continue
  }

  await withSetContext(setId, async () => {
    const known = await session.knownJourneyIds(request)
    const missing = seededIdsFor(setId).filter(
      (journeyId) => !known.includes(journeyId)
    )
    const cookieName = knownJourneysCookie()
    let adopted = known
    for (const journeyId of missing) {
      await session.addKnownJourney(request, h, journeyId)
      adopted = [...adopted, journeyId]
      request.state[cookieName] = adopted
    }
  })

  return h.continue
}

export const adoptKnownJourneys = {
  plugin: {
    name: 'prototype-seed-adopt-known-journeys',
    register(server) {
      server.ext('onPreHandler', adopt)
    }
  }
}
