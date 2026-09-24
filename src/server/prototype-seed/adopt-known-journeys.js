import { organisationIdOf } from '../common/helpers/organisation-id.js'
import { setIdForPath, withSetContext } from '../app/shared/set-context.js'
import {
  knownJourneysCookie,
  session
} from '../app/engine/persistence/session.js'
import { hasSeeder, seededIdsFor } from './index.js'

/**
 * Makes a fresh browser session that signs in to a set with seeded example
 * data "know" that data, the same way it would if this session itself had
 * started those notifications — the dashboard reads only what a session's own
 * `knownJourneys` cookie names (see `engine/journey.js`), so a notification
 * seeded at boot is otherwise invisible until something adds it there.
 *
 * Runs on every request under a seeded set rather than once at sign-in: sign-in
 * is server-wide and outside every set (`server/auth/stub-sign-in.js`, an
 * upstream file), so it has no set to ask and no per-set cookie to write to.
 *
 * Writes `request.state` as well as `h.state()`: every other write to this
 * cookie is followed by a redirect, so the write only has to reach the next
 * request. This one renders straight away — the dashboard's own GET — so the
 * merged list has to be visible to the handler that runs right after this one,
 * in the same request, not just to the browser's next request.
 */
const adopt = async (request, h) => {
  const setId = setIdForPath(request.path)
  const organisationId = organisationIdOf(request)
  if (!setId || !organisationId || !hasSeeder(setId)) {
    return h.continue
  }

  await withSetContext(setId, async () => {
    const seeded = seededIdsFor(setId, organisationId)
    const known = await session.knownJourneyIds(request)
    const missing = seeded.filter((journeyId) => !known.includes(journeyId))
    if (missing.length === 0) {
      return
    }
    const merged = [...known, ...missing]
    const cookieName = knownJourneysCookie()
    h.state(cookieName, merged)
    request.state[cookieName] = merged
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
