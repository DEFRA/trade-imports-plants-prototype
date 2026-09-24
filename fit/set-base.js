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
 * A `toHaveURL` matcher for a path under this set's mount.
 *
 * `toHaveURL` matches a regular expression against the WHOLE url, so anchoring
 * on the authority is what makes the mount prefix load-bearing: a dropped
 * prefix and a doubled one both fail, where a bare `/notifications/…` pattern
 * would pass either way.
 *
 * @param {string} pattern - the path below the mount, as regex source. Carry
 * the trailing `$` yourself when the match must be exact.
 * @returns {RegExp} the anchored matcher.
 */
export const setUrl = (pattern) =>
  new RegExp(`^[a-z]+://[^/]+${SET_BASE}${pattern}`)

/**
 * The same matcher for a rendered `href`, which is a path rather than a whole
 * URL — `toHaveAttribute('href', …)` sees what the template wrote.
 *
 * @param {string} pattern - the path below the mount, as regex source. Carry
 * the trailing `$` yourself when the match must be exact.
 * @returns {RegExp} the anchored matcher.
 */
export const setPath = (pattern) => new RegExp(`^${SET_BASE}${pattern}`)

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
