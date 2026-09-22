/**
 * The set's mount prefix, for the FIT specs.
 *
 * Re-exported from the set's own module rather than spelled out, so the specs
 * and the server cannot disagree about where the journey is served.
 */
import { SET_BASE } from '../src/server/app/sets/high-risk-plants/set.js'

export { SET_BASE as BASE } from '../src/server/app/sets/high-risk-plants/set.js'

const JOURNEY_ID_IN_URL = new RegExp(`^${SET_BASE}/notifications/([^/]+)`)

/**
 * The journey id out of the page's current URL.
 *
 * Anchored at the set base rather than counting path segments: an index shifts
 * silently when the mount prefix changes, and a URL that lost or doubled the
 * prefix would hand back the wrong segment rather than failing.
 */
export const journeyIdFromPage = (page) => {
  const match = new URL(page.url()).pathname.match(JOURNEY_ID_IN_URL)
  if (!match) {
    throw new Error(`No journey id in URL: ${page.url()}`)
  }
  return match[1]
}
