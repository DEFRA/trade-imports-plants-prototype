/**
 * Several obligation sets, one Node process.
 *
 * This is the suite EUDPA-619 exists to satisfy, so it boots the PRODUCTION
 * router rather than hand-rolling the composition it is meant to be checking.
 * A hand-rolled boot would assert against the test's own wiring: prefixing
 * /signout in router.js, or dropping the chooser at /, would leave it green.
 *
 * Unlike the two frontends, this repo is the prototype host, so it really does
 * ship two sets — high-risk-plants and sample-journey — and the root lists them
 * rather than redirecting to one. The fixture set in test/fixtures is mounted
 * on top of those, as a third, to keep the platform assertions readable.
 */
import path from 'node:path'
import Cookie from '@hapi/cookie'
import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { authPlugin } from '../../plugins/auth.js'
import { config } from '../../config/config.js'
import { nunjucksConfig } from '../../config/nunjucks/nunjucks.js'
import { router } from '../router.js'
import { createServer } from '../server.js'
import { authRoutes } from '../auth/index.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'
import {
  currentSetId,
  enterSetContext,
  mountedSetIds,
  registerSetMount,
  routeWithSetContext,
  withSetContext
} from './shared/set-context.js'
import { obligations } from './model/obligations/manifest.js'
import { journeySections } from './flow/journey-flow.js'
import { records as setRecords } from './engine/persistence/records.js'
import { authenticatedCredentials } from './engine/test-support.js'
import { dashboardPath } from './shared/paths.js'
import {
  SET_BASE as PLANTS_BASE,
  SET_ID as HIGH_RISK_PLANTS
} from './sets/high-risk-plants/set.js'
import {
  SET_BASE as SAMPLE_JOURNEY_BASE,
  SET_ID as SAMPLE_JOURNEY
} from './sets/sample-journey/set.js'
import { SESSION_COOKIE_NAMES as PLANTS_COOKIES } from './sets/high-risk-plants/journeys/linear/config.js'
import {
  SESSION_COOKIE_NAMES as SECOND_SET_COOKIES,
  SET_BASE as SECOND_SET_BASE,
  SET_ID as SECOND_SET,
  records as secondSetRecords,
  secondSet
} from '../../../test/fixtures/second-set.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

/**
 * The real `plugins/auth.js` is registered below, so every set's page routes
 * inherit the `session` default through `kit.routeOptions` and a request
 * crosses the strategy's async `validate()` between the gateway's `onPreAuth` —
 * where `enterSetContext` runs — and its `onPreHandler` entry guard. That
 * boundary is what the guard's own `withSetContext` wrap exists to survive.
 */
const SESSION_ID = 'co-residency-session'

const SIGNED_IN = {
  strategy: 'session',
  credentials: { ...authenticatedCredentials, sessionId: SESSION_ID }
}

const FOREIGN_REALM = 'foreign-realm'
const FOREIGN_REALM_BASE = `/${FOREIGN_REALM}`

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
      // Wrapped the way a real gateway wraps its routes: the authentication
      // step between `onPreAuth` and the handler is async, so the handler has
      // to re-enter the context rather than trust `enterWith` to survive it.
      server.route(
        routeWithSetContext(FOREIGN_REALM, {
          method: 'GET',
          path: `${FOREIGN_REALM_BASE}/probe`,
          options: { auth: false },
          handler: () => ({ setId: currentSetId() })
        })
      )
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
  // The nunjucks context reads the signed-in reader's details from here, which
  // is what makes the layout render its service navigation — and so the
  // set-prefixed links each shipped set's page carries.
  server.app.cache = { get: async () => ({ email: 'trader@example.test' }) }
  await server.register([nunjucksConfig, Cookie, authPlugin, router])
  // Mounted the way router.js mounts the shipped sets. Registering a set
  // without its prefix collides with the chooser at the root, which is the
  // namespace split working: no set may sit there.
  await server.register(secondSet, { routes: { prefix: SECOND_SET_BASE } })
  await server.register(foreignRealm)
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
    expect(rootRoutes.toSorted()).toEqual([
      '/',
      '/favicon.ico',
      '/health',
      '/public/{param*}',
      '/signout'
    ])
  })

  it('Should list every mounted set at the root rather than serving one there', async () => {
    const response = await server.inject('/')

    expect(response.statusCode).toBe(200)
    // This is the prototype host, so the root is a chooser rather than a
    // redirect: with several prototypes running there is no default.
    for (const setId of mountedSetIds()) {
      expect(
        response.result,
        `${setId} is not linked from the chooser`
      ).toMatch(new RegExp(`href="/${setId}"`))
    }
  })

  it('Should link the sample journey alongside the plants journey', async () => {
    const response = await server.inject('/')

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
    // Positive as well as negative: `commodityType` is in the REAL
    // high-risk-plants manifest and in neither the fixture set nor the
    // synthetic manifest test/setup-obligation-set.js installs, so this fails
    // if anything but the real manifest is what resolved.
    expect(plantsObligations).toContain('commodityType')
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

describe('co-residency — a real set’s entry guard', () => {
  it('Should run the shipped set’s entry guard with that set’s configuration', async () => {
    // The guard is an `onPreHandler` registered on the server, so — unlike a
    // route handler — `routeWithSetContext` does not wrap it. Authentication
    // crosses an async boundary after the `onPreAuth` that entered the
    // context, so the gateway has to re-enter it around the guard itself.
    // Without that the guard resolves only by the sole-set fallback, and every
    // journey page 500s as soon as a second set mounts.
    const journey = await withSetContext(HIGH_RISK_PLANTS, () =>
      setRecords.create()
    )

    const response = await server.inject({
      method: 'GET',
      url: `${PLANTS_BASE}/notifications/${journey.journeyId}`,
      auth: SIGNED_IN
    })

    // The guard's actual effect, not merely "did not throw": a deep link into
    // a journey with no opening run and no committed answers goes to that
    // SET'S entry page, prefix and all.
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      `${PLANTS_BASE}/notifications/${journey.journeyId}/commodity-type`
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
      server.inject(`${FOREIGN_REALM_BASE}/probe`),
      // The two SHIPPED sets overlapped too, not only the fixtures: these are
      // the pages a reader actually sees, rendered through the shared layout.
      server.inject({ method: 'GET', url: PLANTS_BASE, auth: SIGNED_IN }),
      server.inject({
        method: 'GET',
        url: SAMPLE_JOURNEY_BASE,
        auth: SIGNED_IN
      })
    ]
    const [first, foreignA, second, foreignB, plants, sample] =
      await Promise.all(inFlight)

    expect(plants.statusCode).toBe(200)
    expect(sample.statusCode).toBe(200)
    // Each shipped set's page carries its own prefix and none of the other's.
    expect(plants.result).toContain(`${PLANTS_BASE}/notifications`)
    expect(plants.result).not.toContain(SAMPLE_JOURNEY_BASE)
    expect(sample.result).toContain(SAMPLE_JOURNEY_BASE)
    expect(sample.result).not.toContain(PLANTS_BASE)

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
      setRecords.list({ journeyIds: [journey.journeyId] })
    )
    expect(acrossSets.rows).toEqual([])
  })

  it('Should keep the two SHIPPED sets’ drafts apart as well', async () => {
    // The fixture set brings its own hand-rolled store, so it proves only that
    // a set MAY have one. These are the two real sets, both configured from
    // the same module: each has to be handed an instance of its own.
    const plantsJourney = await withSetContext(HIGH_RISK_PLANTS, () =>
      setRecords.create()
    )
    const sampleJourney = await withSetContext(SAMPLE_JOURNEY, () =>
      setRecords.create()
    )

    const plantsSeesSample = await withSetContext(HIGH_RISK_PLANTS, () => ({
      has: setRecords.has(sampleJourney.journeyId),
      load: setRecords.load({ journeyId: sampleJourney.journeyId })
    }))
    const sampleSeesPlants = await withSetContext(SAMPLE_JOURNEY, () => ({
      has: setRecords.has(plantsJourney.journeyId),
      load: setRecords.load({ journeyId: plantsJourney.journeyId })
    }))

    await expect(plantsSeesSample.has).resolves.toBe(false)
    await expect(plantsSeesSample.load).resolves.toBeUndefined()
    await expect(sampleSeesPlants.has).resolves.toBe(false)
    await expect(sampleSeesPlants.load).resolves.toBeUndefined()

    // Each set can still read back its own.
    await expect(
      withSetContext(HIGH_RISK_PLANTS, () =>
        setRecords.has(plantsJourney.journeyId)
      )
    ).resolves.toBe(true)
    await expect(
      withSetContext(SAMPLE_JOURNEY, () =>
        setRecords.has(sampleJourney.journeyId)
      )
    ).resolves.toBe(true)
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
