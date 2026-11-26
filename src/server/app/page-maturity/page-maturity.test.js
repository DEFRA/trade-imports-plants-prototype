import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { config } from '../../../config/config.js'
import { createServer } from '../../server.js'
import { mockOidcConfig } from '../../common/test-helpers/mock-oidc-config.js'
import { pageRouteOptions } from '../shared/kit.js'
import { dashboardPage } from '../sets/high-risk-plants/journeys/linear/features/dashboard/page.js'
import { originPage } from '../sets/high-risk-plants/journeys/linear/features/origin/page.js'
import { SET_BASE } from '../sets/high-risk-plants/set.js'
import { copy } from './copy/copy.en.js'
import { BANNER_CLASSES, LEVELS, TAG_CLASSES } from './levels.js'
import { pageLevelFor, pageMaturityContext } from './page-maturity.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const FLAG = 'pageMaturityBanner.enabled'

const requestFor = (page, response) => ({
  route: { settings: pageRouteOptions(page) },
  ...(response && { response })
})

describe('#pageLevelFor', () => {
  it.each(Object.values(LEVELS))(
    'Should give a page the %s level its page.js sets',
    (level) => {
      expect(pageLevelFor({ id: 'example', maturity: level })).toBe(level)
    }
  )

  it('Should make a page that sets no level Exploring', () => {
    expect(pageLevelFor({ id: 'example', slug: 'example' })).toBe(
      LEVELS.exploring
    )
  })

  it('Should return undefined when there is no page', () => {
    expect(pageLevelFor(undefined)).toBeUndefined()
  })
})

describe('#pageMaturityContext', () => {
  const initial = config.get(FLAG)

  afterEach(() => {
    config.set(FLAG, initial)
  })

  it('Should default the switch to on', () => {
    expect(config.default(FLAG)).toBe(true)
  })

  it('Should return the tag, class, line and hidden prefix for the level the route page sets', () => {
    expect(
      pageMaturityContext(
        requestFor({ id: 'example', maturity: LEVELS.detailing })
      )
    ).toEqual({
      pageMaturity: {
        tag: {
          text: copy.levels.detailing.tag,
          classes: TAG_CLASSES.detailing
        },
        text: copy.levels.detailing.text,
        classes: BANNER_CLASSES.detailing,
        hiddenPrefix: copy.hiddenPrefix
      }
    })
  })

  it('Should show Exploring for a route page that sets no level', () => {
    expect(
      pageMaturityContext(requestFor({ id: 'example' })).pageMaturity
    ).toEqual(expect.objectContaining({ classes: BANNER_CLASSES.exploring }))
  })

  it('Should return nothing for a route that carries no page', () => {
    expect(
      pageMaturityContext({ route: { settings: { auth: 'session' } } })
    ).toEqual({})
  })

  it('Should return nothing when the switch is off', () => {
    config.set(FLAG, false)

    expect(pageMaturityContext(requestFor(originPage))).toEqual({})
  })

  it('Should return nothing when the error page is rendered on a route with a page', () => {
    expect(
      pageMaturityContext(
        requestFor(originPage, { source: { template: 'shared/error' } })
      )
    ).toEqual({})
  })

  it('Should return nothing for a request with no route', () => {
    expect(pageMaturityContext({ path: SET_BASE })).toEqual({})
  })
})

describe('page maturity of the registered routes', () => {
  const REDIRECT_ONLY_ROUTES = [
    `get ${SET_BASE}/start`,
    `post ${SET_BASE}/notifications`,
    `post ${SET_BASE}/notifications/{journeyId}/amend`
  ]
  let routes
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    routes = server.table()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const routeAt = (method, path) =>
    routes.find((route) => route.method === method && route.path === path)

  const levelOf = (route) => pageLevelFor(route.settings.app?.page)

  it('Should make the high-risk plants start page Exploring', () => {
    const start = routeAt('get', SET_BASE)

    expect(start.settings.app.page).toEqual(dashboardPage)
    expect(levelOf(start)).toBe(LEVELS.exploring)
  })

  it('Should take a journey page level from its feature page.js', () => {
    const origin = routeAt(
      'get',
      `${SET_BASE}/notifications/{journeyId}/origin`
    )

    expect(origin.settings.app.page).toEqual(originPage)
    expect(levelOf(origin)).toBe(originPage.maturity)
  })

  it('Should make every high-risk plants route that renders a page Exploring', () => {
    const pageRoutes = routes.filter(
      ({ method, path }) =>
        (path === SET_BASE || path.startsWith(`${SET_BASE}/`)) &&
        !REDIRECT_ONLY_ROUTES.includes(`${method} ${path}`)
    )

    expect(pageRoutes.length).toBeGreaterThan(0)
    for (const route of pageRoutes) {
      expect(levelOf(route), `${route.method} ${route.path}`).toBe(
        LEVELS.exploring
      )
    }
  })

  it('Should give every route page a known level', () => {
    const levels = routes
      .map((route) => route.settings.app?.page)
      .filter(Boolean)
      .map(pageLevelFor)

    expect(levels.length).toBeGreaterThan(0)
    for (const level of levels) {
      expect(Object.values(LEVELS)).toContain(level)
    }
  })

  it.each(['get /health', 'get /auth/sign-out', ...REDIRECT_ONLY_ROUTES])(
    'Should give %s no level',
    (route) => {
      const [method, path] = route.split(' ')

      expect(levelOf(routeAt(method, path))).toBeUndefined()
    }
  )
})
