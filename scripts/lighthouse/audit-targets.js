import { allRoutes } from '../../src/server/app/sets/high-risk-plants/journeys/linear/features/index.js'

const JOURNEY_PARAM = '{journeyId}'
const OTHER_PARAM = /\{(?!journeyId})[^}]+}/
const NOT_FILENAME_SAFE = /[^a-z0-9]+/gi
const DEFAULT_SHAPE = 'warePotatoes'
const ROOT_REPORT_NAME = 'home'

export const TARGETS_FILE = new URL(
  '../../.lighthouse/targets.json',
  import.meta.url
)

/** GET routes Lighthouse deliberately does not audit. Every entry is checked
 * against the live route table, so a stale reason fails the build rather than
 * quietly shrinking the audit. Each page increment adds its own reason. */
export const SKIPPED = new Map([
  [
    '/notifications/{journeyId}/cancel-amend',
    'renders only on an amending notification, and no seed shape submits then amends a notification yet; covered by the cancel-amend feature axe tests'
  ],
  [
    '/notifications/{journeyId}/confirmation',
    'renders only on a submitted notification, and no seed shape completes the journey far enough to submit one yet'
  ]
])

/** Routes whose answers live on a seeded notification other than the default —
 * either because the page only exists once the notification is submitted, or
 * because the obligation behind it is out of scope on the default shape.
 * Everything else is audited on the default shape. */
export const FILLED_BY = new Map([
  // arrivalStatus is out of scope on the ware-potato default: the question is
  // asked of plants and wood alone, so the audit reads the page on a plants
  // notification rather than one that never sees it.
  ['/notifications/{journeyId}/arrival-status', 'plantsForPlanting'],
  ['/notifications/{journeyId}/consignors/select', 'plantsForPlanting']
])

/** Query strings a route needs before it will render rather than redirect.
 * Empty until a route needs one, and each page increment adds its own entry
 * where it needs one. */
export const QUERY = new Map()

const getPathsOf = (routes) =>
  routes.filter(({ method }) => method === 'GET').map(({ path }) => path)

const assertStillRouted = (paths, listed, label) => {
  for (const path of listed) {
    if (!paths.includes(path)) {
      throw new Error(
        `Lighthouse ${label} names ${path}, which the app no longer serves as a GET route`
      )
    }
  }
}

export const assertTargetsAreCurrent = (routes = allRoutes) => {
  const paths = getPathsOf(routes)
  assertStillRouted(paths, SKIPPED.keys(), 'skip list')
  assertStillRouted(paths, FILLED_BY.keys(), 'filled-by list')
  assertStillRouted(paths, QUERY.keys(), 'query list')

  const unsatisfiable = paths.filter(
    (path) => !SKIPPED.has(path) && OTHER_PARAM.test(path)
  )
  if (unsatisfiable.length > 0) {
    throw new Error(
      `Lighthouse cannot build a URL for ${unsatisfiable.join(', ')} — satisfy the ` +
        'extra path parameter or add the route to SKIPPED with a reason'
    )
  }
}

const journeyIdFor = (journeyIds, path) => {
  const shape = FILLED_BY.get(path) ?? DEFAULT_SHAPE
  const journeyId = journeyIds[shape]
  if (!journeyId) {
    throw new Error(
      `Lighthouse audits ${path} on the "${shape}" notification, which the setup step did not seed`
    )
  }
  return journeyId
}

/** The route paths this run will audit, still carrying `{journeyId}` because no
 * notification has been seeded yet. The dashboard at `/` is the first of them,
 * and each page increment adds its own. */
export const auditableRoutePaths = (routes = allRoutes) => {
  assertTargetsAreCurrent(routes)
  return getPathsOf(routes).filter((path) => !SKIPPED.has(path))
}

export const auditPaths = (journeyIds, routes = allRoutes) =>
  auditableRoutePaths(routes).map((path) => {
    const resolved = path.includes(JOURNEY_PARAM)
      ? path.replace(JOURNEY_PARAM, journeyIdFor(journeyIds, path))
      : path
    return `${resolved}${QUERY.get(path) ?? ''}`
  })

export const auditUrls = (origin, journeyIds, routes = allRoutes) =>
  auditPaths(journeyIds, routes).map((path) => new URL(path, origin).toString())

/** The report filename a URL earns, with the seeded journey id dropped so the
 * name is the page's route and nothing else. Reports then overwrite their
 * predecessor instead of piling up a fresh set on every run. */
export const reportName = (url, journeyIds) => {
  const seeded = new Set(Object.values(journeyIds))
  const name = new URL(url).pathname
    .split('/')
    .filter((segment) => segment !== '' && !seeded.has(segment))
    .join('_')
    .replace(NOT_FILENAME_SAFE, '_')
  return name === '' ? ROOT_REPORT_NAME : name
}

export const reportNames = (urls, journeyIds) => {
  const taken = new Map()
  const names = {}
  for (const url of urls) {
    const name = reportName(url, journeyIds)
    if (taken.has(name)) {
      throw new Error(
        `Lighthouse would write both ${taken.get(name)} and ${url} to ${name}.report.html — ` +
          'one of the two routes needs a path the other does not share'
      )
    }
    taken.set(name, url)
    names[url] = name
  }
  return names
}
