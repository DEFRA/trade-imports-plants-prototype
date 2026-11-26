/**
 * The set's mount prefix, for the FIT specs.
 *
 * Re-exported from the set's own module rather than spelled out, so the specs
 * and the server cannot disagree about where the journey is served.
 */
import { SET_BASE } from '../src/server/app/sets/high-risk-plants/set.js'
import { TRAIL_START, withTrail } from '../src/server/app/shared/trail.js'

export { SET_BASE as BASE } from '../src/server/app/sets/high-risk-plants/set.js'

const JOURNEY_ID_IN_URL = new RegExp(`^${SET_BASE}/notifications/([^/]+)`)

const ORIGIN_AND_SET_BASE = `^[a-z]+://[^/]+${SET_BASE}`

const trailSuffixSource = (pathSource, entries) => {
  const queryBefore = pathSource.includes('\\?') ? '?' : ''
  const trailQuery = withTrail(queryBefore, entries).slice(queryBefore.length)
  return `${pathSource}${RegExp.escape(trailQuery)}`
}

/**
 * A `toHaveURL` matcher for a path under this set's mount carrying exactly the
 * trail `entries`, encoded as the application encodes it.
 *
 * @param {string} pathSource - the path below the mount, as regex source,
 * without a trailing `$`. A path that writes its own query (`\\?index=\\d+`)
 * gets the trail after it.
 * @param {string[]} entries - the places of the trail, newest last.
 * @returns {RegExp} the anchored matcher.
 */
export const pageUrlWithTrail = (pathSource, entries) =>
  new RegExp(`${ORIGIN_AND_SET_BASE}${trailSuffixSource(pathSource, entries)}$`)

/**
 * A `toHaveURL` matcher for a journey page of any notification carrying exactly
 * the trail `entries`.
 *
 * @param {string} slug - the page's slug within the notification, as regex
 * source. A slug that writes its own query (`commodities\\?removed=\\d+`) gets
 * the trail after it.
 * @param {string[]} entries - the places of the trail, newest last.
 * @returns {RegExp} the anchored matcher.
 */
export const notificationPageWithTrail = (slug, entries) =>
  pageUrlWithTrail(`/notifications/[^/]+/${slug}`, entries)

export const COMMODITY_REMOVED_URL = notificationPageWithTrail(
  'commodities\\?removed=\\d+',
  ['commodity-type']
)

/**
 * A `toHaveURL` matcher for a path under this set's mount with no trail and no
 * other query, unless the pattern writes one.
 *
 * `toHaveURL` matches a regular expression against the WHOLE url, so anchoring
 * on the authority and on the end is what makes the mount prefix and the absence
 * of a trail load-bearing: a dropped prefix, a doubled one and an extra query
 * all fail. A page that carries a trail goes through `pageUrlWithTrail`.
 *
 * @param {string} pattern - the path below the mount, as regex source, with or
 * without a trailing `$`.
 * @returns {RegExp} the anchored matcher.
 */
export const setUrl = (pattern) =>
  new RegExp(
    `${ORIGIN_AND_SET_BASE}${pattern.endsWith('$') ? pattern : `${pattern}$`}`
  )

/**
 * A matcher for a rendered `href` under this set's mount, anchored at the start
 * only.
 *
 * @param {string} pattern - the path below the mount, as regex source. Write
 * the trailing `$` yourself for an exact match.
 * @returns {RegExp} the matcher.
 */
export const setPath = (pattern) => new RegExp(`^${SET_BASE}${pattern}`)

/**
 * A matcher for a rendered `href` under this set's mount carrying exactly the
 * trail `entries`, encoded as the application encodes it.
 *
 * @param {string} pathSource - the path below the mount, as regex source,
 * without a trailing `$`.
 * @param {string[]} entries - the places of the trail, newest last.
 * @returns {RegExp} the anchored matcher.
 */
export const pagePathWithTrail = (pathSource, entries) =>
  new RegExp(`^${SET_BASE}${trailSuffixSource(pathSource, entries)}$`)

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

/**
 * A `toHaveURL` matcher for a journey page reached by Save and continue from the
 * dashboard, carrying the trail of the places saved before it.
 *
 * @param {string} slug - the page's slug within the notification.
 * @param {string[]} walk - the slugs of the pages saved from the dashboard, in
 * order. A page that is on the walk expects the places before it, any other
 * page expects every place on the walk.
 * @returns {RegExp} the anchored matcher.
 */
export const pageUrlOnWalk = (slug, walk) => {
  const position = walk.indexOf(slug)
  const savedBefore = position === -1 ? walk : walk.slice(0, position)
  return notificationPageWithTrail(slug, [
    TRAIL_START.dashboard,
    ...savedBefore
  ])
}
