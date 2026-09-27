import { setIdForPath, withSetContext } from '../app/shared/set-context.js'
import {
  knownJourneysCookie,
  session
} from '../app/engine/persistence/session.js'
import { organisationIdOf } from '../common/helpers/organisation-id.js'
import {
  ensureSeeded,
  hasSeeder,
  isSeedAuthorRequest,
  organisationIdsFor,
  seededIdsFor
} from './index.js'

/**
 * Seeds the set's example notifications on the first signed-in request to
 * reach it, then adds them to every signed-in session. The dashboard lists
 * only what a session "knows" (see `engine/journey.js`), so a seeded
 * notification is invisible until something adds it there.
 *
 * Shared examples (no `organisationId` in the scenario) go to every signed-in
 * user, whoever they are. An example made for one organisation goes only to
 * sessions signed in to that organisation, so a designer can show what another
 * organisation sees by signing in as it
 * (`/auth/stub-sign-in?organisationId=<organisation>` locally).
 *
 * Runs on every request under a seeded set rather than once at sign-in:
 * sign-in is server-wide and outside every set, so it has no set to ask.
 * `ensureSeeded` is a no-op once the set has already been seeded, so this
 * costs nothing on every request after the first.
 *
 * Writes go through the configured session seam, so this works with whichever
 * session the run uses. The stub session (local runs) reads the list from
 * `request.state` and writes it as a cookie, so `request.state` is kept in step
 * after each add: otherwise each add would overwrite the one before, and the
 * dashboard handler that runs next in this same request would not see them.
 * plants-frontend's own session (deployed runs) keeps the list in yar, which
 * already reads back its own writes, so the `request.state` update does nothing
 * there.
 *
 * Skipped for the seed's own requests: the seeder drives the journey through
 * these same routes, signed in as its own author identity, and that identity
 * would otherwise trip this same lazy seed check on its way to seeding —
 * seeding itself, recursively, forever.
 */
const adopt = async (request, h) => {
  const setId = setIdForPath(request.path)
  if (
    !setId ||
    !request.auth.isAuthenticated ||
    !hasSeeder(setId) ||
    isSeedAuthorRequest(setId, request)
  ) {
    return h.continue
  }

  await ensureSeeded(request.server, setId)

  await withSetContext(setId, async () => {
    const known = await session.knownJourneyIds(request)
    const forThisSession = [
      ...seededIdsFor(setId),
      ...organisationIdsFor(setId, organisationIdOf(request))
    ]
    const missing = forThisSession.filter(
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
