/**
 * Two obligation sets, one Node process.
 *
 * This is the suite EUDPA-619 exists to satisfy, so it boots the PRODUCTION
 * router rather than hand-rolling the composition it is meant to be checking.
 * A hand-rolled boot would assert against the test's own wiring: prefixing
 * /signout in router.js, or dropping the / redirect, would leave it green.
 *
 * The second set is a test fixture (test/fixtures/second-set.js) rather than a
 * real journey. Co-residency is a property of the platform, and shipping a
 * second real set would mean shipping a journey nobody asked for.
 */
import path from 'node:path'
import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { config } from '../../config/config.js'
import { nunjucksConfig } from '../../config/nunjucks/nunjucks.js'
import { router } from '../router.js'
import { createServer } from '../server.js'
import { authRoutes } from '../auth/index.js'
import { authController } from '../auth/controller.js'
import { catchAll } from '../common/helpers/errors.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'
import {
  currentSetId,
  enterSetContext,
  mountedSetIds,
  registerSetMount,
  setContextExtension,
  withSetContext
} from './shared/set-context.js'
import { obligations } from './model/obligations/manifest.js'
import { fulfilmentRegistry } from './bridge/fulfilment-registry.js'
import { journeySections } from './flow/journey-flow.js'
import { dashboardPath } from './shared/paths.js'
import {
  SET_BASE as PLANTS_BASE,
  SET_ID as HIGH_RISK_PLANTS
} from './sets/high-risk-plants/set.js'
import { SET_BASE as SAMPLE_JOURNEY_BASE } from './sets/sample-journey/set.js'
import { SESSION_COOKIE_NAMES as PLANTS_COOKIES } from './sets/high-risk-plants/journeys/linear/config.js'
import {
  FEATURE_NAME as SECOND_SET_FEATURE,
  GUARDED_JOURNEY_ID,
  RENDERED_ROUTE_PATH as SECOND_SET_RENDERED_PATH,
  RENDERED_TITLE as SECOND_SET_RENDERED_TITLE,
  SESSION_COOKIE_NAMES as SECOND_SET_COOKIES,
  SET_BASE as SECOND_SET_BASE,
  SET_ID as SECOND_SET,
  records as secondSetRecords,
  secondSet
} from '../../../test/fixtures/second-set.js'
import { configureRecords, records } from './engine/persistence/records.js'
import { records as shippedRecords } from './services/persistence/records/index.js'
import { commodityTypePage } from './sets/high-risk-plants/journeys/linear/features/commodity-type/page.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const FOREIGN_REALM = 'foreign-realm'
const FOREIGN_REALM_BASE = `/${FOREIGN_REALM}`
/** The real sign-in callback, mounted where server.js mounts it: outside every
 * set, so its error view has no set to build its chrome from. */
const SIGN_IN_OIDC_PATH = '/auth/sign-in-oidc'

let foreignRealmExtensionRan = 0

/**
 * A third mounted realm whose onPreAuth counts every route it runs on. If any
 * set-owned extension were registered without `{ sandbox: 'plugin' }` it would
 * be server-wide, and this counter would tick on the other sets' routes.
 */
const foreignRealm = {
  plugin: {
    name: 'foreign-realm-probe',
    register(server) {
      registerSetMount(FOREIGN_REALM, FOREIGN_REALM_BASE)
      server.ext(
        'onPreAuth',
        (_request, h) => {
          foreignRealmExtensionRan += 1
          enterSetContext(FOREIGN_REALM)
          return h.continue
        },
        { sandbox: 'plugin' }
      )
      server.route({
        method: 'GET',
        path: `${FOREIGN_REALM_BASE}/probe`,
        options: { auth: false },
        handler: () => ({ setId: currentSetId() })
      })
    }
  }
}

/** Reads Set-Cookie the way a browser does, so a cookie's Path attribute
 * decides which requests carry it back. Scoping is the whole point here. */
const cookieJar = () => {
  const cookies = new Map()
  return {
    absorb(response) {
      for (const header of response.headers['set-cookie'] ?? []) {
        const [pair, ...attributes] = header
          .split(';')
          .map((part) => part.trim())
        const separator = pair.indexOf('=')
        const name = pair.slice(0, separator)
        const pathAttribute = attributes.find((attribute) =>
          attribute.toLowerCase().startsWith('path=')
        )
        cookies.set(name, {
          name,
          value: pair.slice(separator + 1),
          path: pathAttribute?.slice('path='.length) ?? '/'
        })
      }
    },
    namesFor(pathname) {
      return [...cookies.values()]
        .filter((cookie) => pathname.startsWith(cookie.path))
        .map(({ name }) => name)
        .sort()
    }
  }
}

let server

beforeAll(async () => {
  server = Hapi.server({
    routes: {
      files: { relativeTo: path.resolve(config.get('root'), '.public') }
    }
  })
  // The prototype's chooser at `/` is `auth` mode `try`, which needs a default
  // strategy. This one never authenticates, so every route stays signed out.
  server.auth.scheme('anonymous', () => ({
    authenticate: (_request, h) => h.unauthenticated(new Error('no session'))
  }))
  server.auth.strategy('session', 'anonymous')
  server.auth.default({ strategy: 'session', mode: 'try' })
  await server.register([nunjucksConfig, router])
  // Mounted the way router.js mounts high-risk-plants. Registering a set without
  // its prefix collides with the root redirect, which is the namespace split
  // working: no set may sit at the root.
  await server.register(secondSet, { routes: { prefix: SECOND_SET_BASE } })
  await server.register(foreignRealm)
  // The two server-wide extensions server.js registers, in the same order: the
  // set context resolved from the path before routing, then the shared error
  // page. Without the first, an unrouted path under a set's mount has no set at
  // all — no route matched, so no set's own onPreAuth ran.
  server.ext(setContextExtension)
  server.ext('onPreResponse', catchAll)
  server.route({
    method: 'GET',
    path: SIGN_IN_OIDC_PATH,
    options: { auth: false },
    ...authController.signinOidc
  })
  await server.initialize()
})

afterAll(async () => {
  await server.stop({ timeout: 0 })
})

describe('co-residency — two sets mounted in one process', () => {
  it('Should mount every registered set under its own prefix', () => {
    expect(mountedSetIds()).toEqual(
      expect.arrayContaining([HIGH_RISK_PLANTS, SECOND_SET, FOREIGN_REALM])
    )
  })

  it('Should register no set route at the root', () => {
    const rootRoutes = server
      .table()
      .filter(
        (route) =>
          !route.path.startsWith(PLANTS_BASE) &&
          !route.path.startsWith(SAMPLE_JOURNEY_BASE) &&
          !route.path.startsWith(SECOND_SET_BASE) &&
          !route.path.startsWith(FOREIGN_REALM_BASE)
      )
      .map((route) => route.path)

    // What is left at the root is the server-wide surface and nothing else.
    // `/auth/sign-in-oidc` is this suite's own registration of the real
    // sign-in handler, mounted where server.js mounts it — outside every set.
    expect(rootRoutes.toSorted()).toEqual([
      '/',
      SIGN_IN_OIDC_PATH,
      '/favicon.ico',
      '/health',
      '/public/{param*}',
      '/reset/{setId}',
      '/signout'
    ])
  })

  it('Should list the sets at the root rather than serving a set there', async () => {
    const response = await server.inject('/')

    expect(response.statusCode).toBe(200)
    expect(response.result).toContain(`href="${PLANTS_BASE}"`)
    expect(response.result).toContain(`href="${SAMPLE_JOURNEY_BASE}"`)
  })
})

describe('co-residency — each set answers with its own configuration', () => {
  it("Should resolve the second set's obligations and sections on its own route", async () => {
    const response = await server.inject(SECOND_SET_BASE)

    expect(response.statusCode).toBe(200)
    expect(response.result).toEqual({
      setId: SECOND_SET,
      dashboardPath: SECOND_SET_BASE,
      obligationNames: ['shipmentReference'],
      sectionIds: ['details']
    })
  })

  it("Should not leak the second set's configuration into high-risk-plants", async () => {
    // Read high-risk-plants' configuration the way a request does, then confirm it
    // is nothing like the second set's, which is mounted at the same time.
    const plantsObligations = await withSetContext(HIGH_RISK_PLANTS, () =>
      obligations().map(({ name }) => name)
    )
    const secondSetObligations = await withSetContext(SECOND_SET, () =>
      obligations().map(({ name }) => name)
    )

    expect(secondSetObligations).toEqual(['shipmentReference'])
    expect(plantsObligations).not.toContain('shipmentReference')
    expect(plantsObligations.length).toBeGreaterThan(1)
  })

  it('Should give each set its own journey flow', async () => {
    const plantsSections = await withSetContext(HIGH_RISK_PLANTS, () =>
      journeySections().map(({ id }) => id)
    )
    const secondSetSections = await withSetContext(SECOND_SET, () =>
      journeySections().map(({ id }) => id)
    )

    expect(secondSetSections).toEqual(['details'])
    expect(plantsSections).not.toEqual(secondSetSections)
  })

  it('Should give each set its own fulfilment registry', async () => {
    const plantsFeatures = await withSetContext(HIGH_RISK_PLANTS, () =>
      fulfilmentRegistry.features.map(({ name }) => name)
    )
    const secondSetFeatures = await withSetContext(SECOND_SET, () =>
      fulfilmentRegistry.features.map(({ name }) => name)
    )

    expect(secondSetFeatures).toEqual([SECOND_SET_FEATURE])
    // Stated as disjoint rather than as a literal list: the plants set is still
    // gaining features, and a list here would have to be retyped on each one
    // without saying anything more than this does.
    expect(plantsFeatures.length).toBeGreaterThan(1)
    expect(plantsFeatures).not.toContain(SECOND_SET_FEATURE)
  })

  it('Should build every link inside the request’s own set', async () => {
    const plantsBase = await withSetContext(HIGH_RISK_PLANTS, () =>
      dashboardPath()
    )
    const secondSetBase = await withSetContext(SECOND_SET, () =>
      dashboardPath()
    )

    expect(plantsBase).toBe(PLANTS_BASE)
    expect(secondSetBase).toBe(SECOND_SET_BASE)
  })
})

describe('co-residency — the render path resolves the request’s set', () => {
  it('Should render a second set’s view with that set’s own layout values', async () => {
    const response = await server.inject(
      `${SECOND_SET_BASE}${SECOND_SET_RENDERED_PATH}`
    )

    expect(response.statusCode).toBe(200)
    // The view is marshalled after the handler returns. These two values come
    // from the set's own configuration — its journey layout and its mount — so
    // a render that resolved the wrong set could not produce both.
    expect(response.result).toContain(SECOND_SET_RENDERED_TITLE)
    expect(response.result).toContain(`href="${SECOND_SET_BASE}"`)
    expect(response.result).not.toContain(`href="${PLANTS_BASE}"`)
  })

  it.each([
    ['inside a set', `${PLANTS_BASE}/no-such-page`],
    ['outside every set', '/no-such-page']
  ])(
    'Should answer an unrouted path %s with 404 rather than 500',
    async (_where, url) => {
      // The error page renders the shared chrome. Resolving it through the
      // sole-set fallback throws with several sets mounted, which turns the 404
      // the user should see into a 500.
      const response = await server.inject(url)

      expect(response.statusCode).toBe(404)
    }
  )

  it('Should give a 404 under a set’s mount that set’s own home link', async () => {
    const response = await server.inject(`${PLANTS_BASE}/no-such-page`)

    // Not `/`: the set is resolved from the path, because no route matched and
    // so no set's own extension ran.
    expect(response.result).toContain(`href="${PLANTS_BASE}"`)
  })
})

describe('co-residency — a real set’s entry guard', () => {
  it('Should run the shipped set’s entry guard with that set’s configuration', async () => {
    // The guard is an `onPreHandler` registered on the server, so — unlike a
    // route handler — `routeWithSetContext` does not wrap it. Authentication
    // crosses an async boundary after the `onPreAuth` that entered the
    // context, so the gateway has to re-enter it around the guard itself.
    // Without that the guard resolves only by the sole-set fallback, and every
    // journey page 500s as soon as a second set mounts.
    const draft = await withSetContext(HIGH_RISK_PLANTS, () => records.create())

    const response = await server.inject(
      `${PLANTS_BASE}/notifications/${draft.journeyId}`
    )

    // A target only THIS set's entryGuardTarget, resolved against THIS set's
    // base, can produce: the second set's guard names a different page, and a
    // dropped mount prefix names a different path.
    expect(response.headers.location).toBe(
      `${PLANTS_BASE}/notifications/${draft.journeyId}/${commodityTypePage.slug}`
    )
  })

  it('Should run the second set’s entry guard with that set’s configuration', async () => {
    // The fixture's guard reads `setBase()` on every request, so an unwrapped
    // call fails here rather than passing — which is what makes it a faithful
    // template of the shipped gateway.
    const response = await server.inject(
      `${SECOND_SET_BASE}/notifications/${GUARDED_JOURNEY_ID}/details`
    )

    expect(response.headers.location).toBe(
      `${SECOND_SET_BASE}/notifications/${GUARDED_JOURNEY_ID}`
    )
  })
})

describe('co-residency — interleaved requests', () => {
  it('Should keep each in-flight request in its own set while the other is still running', async () => {
    // Genuinely interleaved, not sequential: both injections are started
    // before either is awaited, so their AsyncLocalStorage contexts overlap.
    // Running them one after the other would prove nothing.
    const inFlight = [
      server.inject(`${SECOND_SET_BASE}/notifications/SUN-A/details`),
      server.inject(`${FOREIGN_REALM_BASE}/probe`),
      server.inject(`${SECOND_SET_BASE}/notifications/SUN-B/details`),
      server.inject(`${FOREIGN_REALM_BASE}/probe`)
    ]
    const [first, foreignA, second, foreignB] = await Promise.all(inFlight)

    expect(first.result.setId).toBe(SECOND_SET)
    expect(first.result.journeyId).toBe('SUN-A')
    expect(first.result.selfHref).toBe(
      `${SECOND_SET_BASE}/notifications/SUN-A/details`
    )
    expect(second.result.setId).toBe(SECOND_SET)
    expect(second.result.journeyId).toBe('SUN-B')
    expect(second.result.selfHref).toBe(
      `${SECOND_SET_BASE}/notifications/SUN-B/details`
    )
    expect(foreignA.result.setId).toBe(FOREIGN_REALM)
    expect(foreignB.result.setId).toBe(FOREIGN_REALM)
  })
})

describe('co-residency — extensions are sandboxed to their own set', () => {
  it("Should not run one set's lifecycle extension on another set's routes", async () => {
    foreignRealmExtensionRan = 0

    await server.inject(SECOND_SET_BASE)
    await server.inject(`${SECOND_SET_BASE}/notifications/SUN-A/details`)
    await server.inject('/health')
    await server.inject('/')

    // A `server.ext` registered without { sandbox: 'plugin' } is server-wide,
    // so without it this would have ticked on all four.
    expect(foreignRealmExtensionRan).toBe(0)

    await server.inject(`${FOREIGN_REALM_BASE}/probe`)
    expect(foreignRealmExtensionRan).toBe(1)
  })
})

describe('co-residency — journey cookies are scoped to their set', () => {
  it("Should scope each set's journey cookies to that set's path", async () => {
    const states = server.states.cookies

    for (const name of Object.values(PLANTS_COOKIES)) {
      expect(states[name]?.path, `${name} is not scoped`).toBe(PLANTS_BASE)
    }
    for (const name of Object.values(SECOND_SET_COOKIES)) {
      expect(states[name]?.path, `${name} is not scoped`).toBe(SECOND_SET_BASE)
    }
  })

  it('Should give the two sets different cookie names', () => {
    const plants = Object.values(PLANTS_COOKIES)
    const second = Object.values(SECOND_SET_COOKIES)

    expect(plants.filter((name) => second.includes(name))).toEqual([])
  })

  it('Should not send one set’s journey cookie to the other set', async () => {
    const jar = cookieJar()
    const created = await server.inject({
      method: 'POST',
      url: `${SECOND_SET_BASE}/notifications`
    })
    jar.absorb(created)

    // The positive half first: without it the negative half below passes on an
    // empty jar, which would prove nothing at all.
    expect(jar.namesFor(`${SECOND_SET_BASE}/notifications`)).toContain(
      SECOND_SET_COOKIES.knownJourneys
    )
    // The browser rule: a cookie scoped to /sundry-goods never travels to
    // /high-risk-plants, so a draft started in one set cannot reach the other.
    expect(jar.namesFor(`${PLANTS_BASE}/notifications`)).not.toContain(
      SECOND_SET_COOKIES.knownJourneys
    )
  })

  it("Should keep one set's drafts out of the other set's records store", async () => {
    const journey = await secondSetRecords.create()
    const listed = await secondSetRecords.list({
      journeyIds: [journey.journeyId]
    })

    expect(listed.rows.map(({ journeyId }) => journeyId)).toEqual([
      journey.journeyId
    ])
    // high-risk-plants reads its own store, which has never seen this id.
    const acrossSets = await withSetContext(HIGH_RISK_PLANTS, () =>
      records.list({ journeyIds: [journey.journeyId] })
    )
    expect(acrossSets.rows).toEqual([])
  })

  it("Should keep each set's drafts out of the other's SHIPPED stub store", async () => {
    // The fixture stub above is a store of its own, so it cannot show what
    // happens when two sets are wired to the SAME shipped stub — which is the
    // arrangement a second real set would arrive in.
    configureRecords(SECOND_SET, shippedRecords)
    try {
      const plantsDraft = await withSetContext(HIGH_RISK_PLANTS, () =>
        records.create()
      )
      const secondDraft = await withSetContext(SECOND_SET, () =>
        records.create()
      )
      const bothIds = [plantsDraft.journeyId, secondDraft.journeyId]

      const plantsRows = await withSetContext(HIGH_RISK_PLANTS, () =>
        records.list({ journeyIds: bothIds })
      )
      const secondRows = await withSetContext(SECOND_SET, () =>
        records.list({ journeyIds: bothIds })
      )

      expect(plantsRows.rows.map(({ journeyId }) => journeyId)).toEqual([
        plantsDraft.journeyId
      ])
      expect(secondRows.rows.map(({ journeyId }) => journeyId)).toEqual([
        secondDraft.journeyId
      ])
      // Listing is scoped by id, so loading by id is the stronger check: one
      // set must not be able to open the other's draft even knowing its id.
      await expect(
        withSetContext(SECOND_SET, () =>
          records.load({ journeyId: plantsDraft.journeyId })
        )
      ).resolves.toBeUndefined()
      await expect(
        withSetContext(HIGH_RISK_PLANTS, () =>
          records.load({ journeyId: secondDraft.journeyId })
        )
      ).resolves.toBeUndefined()
    } finally {
      configureRecords(SECOND_SET, secondSetRecords)
    }
  })
})

describe('co-residency — the server-wide surface renders without a set', () => {
  it('Should render a 404 for an unknown server-wide path rather than failing for want of a set', async () => {
    const response = await server.inject('/not-a-page')

    expect(response.statusCode).toBe(404)
    expect(response.result).toEqual(expect.stringContaining('Page not found'))
  })

  it('Should render the sign-in error page outside every set', async () => {
    const response = await server.inject(SIGN_IN_OIDC_PATH)

    expect(response.statusCode).toBe(200)
    expect(response.result).toEqual(
      expect.stringContaining('unable to sign you in')
    )
  })
})

describe('co-residency — the server-wide surface stays server-wide', () => {
  it('Should serve /health unprefixed', async () => {
    const response = await server.inject('/health')

    expect(response.statusCode).toBe(200)
  })

  it('Should serve /signout outside every set prefix', () => {
    const paths = server.table().map((route) => route.path)

    // /signout registers perfectly happily at /high-risk-plants/signout and fails
    // only when a user tries to sign out, so it is pinned rather than trusted.
    expect(paths).toContain('/signout')
    expect(paths).not.toContain(`${PLANTS_BASE}/signout`)
    expect(paths).not.toContain(`${SECOND_SET_BASE}/signout`)
  })

  it('Should serve static assets unprefixed', () => {
    const paths = server.table().map((route) => route.path)

    expect(paths).toContain('/public/{param*}')
    expect(paths).not.toContain(`${PLANTS_BASE}/public/{param*}`)
  })
})

describe('co-residency — the real composition root', () => {
  let realServer

  beforeAll(async () => {
    // The sign-in routes are registered by server.js alongside the router, not
    // inside it, so only the real composition root can show where they land.
    realServer = await createServer()
  })

  afterAll(async () => {
    await realServer.stop({ timeout: 0 })
  })

  it('Should keep every sign-in route outside the set prefix', () => {
    const authPaths = realServer
      .table()
      .map((route) => route.path)
      .filter((routePath) => routePath.includes('/auth/'))

    expect(authPaths.length).toBeGreaterThan(0)
    for (const routePath of authPaths) {
      expect(routePath.startsWith('/auth/'), `${routePath} is prefixed`).toBe(
        true
      )
    }
  })

  it('Should keep the real OIDC routes outside the set prefix too', () => {
    // The unit suite runs in stub mode, so the server above never registers the
    // real OIDC plugin. Ask that plugin what it declares instead, so a prefix
    // creeping into the routes only production registers is still caught.
    const declared = []
    authRoutes.plugin.register({
      route: (routes) => declared.push(...[routes].flat())
    })

    expect(declared.length).toBeGreaterThan(0)
    for (const { path: routePath } of declared) {
      expect(routePath.startsWith('/auth/'), `${routePath} is prefixed`).toBe(
        true
      )
    }
  })

  it('Should mount the default set under its prefix in the real server', () => {
    const paths = realServer.table().map((route) => route.path)

    expect(paths).toContain(PLANTS_BASE)
    expect(paths).toContain(`${PLANTS_BASE}/notifications`)
  })
})
