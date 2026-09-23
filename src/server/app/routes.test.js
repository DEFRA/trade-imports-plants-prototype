import { load } from 'cheerio'

import { SET_BASE, SET_ID } from './sets/high-risk-plants/set.js'
import { withSetContext } from './shared/set-context.js'
import { SET_BASE as SAMPLE_JOURNEY_BASE } from './sets/sample-journey/set.js'
import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { makeScope } from './engine/index.js'
import { answersForRead } from './bridge/answers-read.js'
import { isDispatchBuilt } from './flow/dispatch.js'
import { allRoutes } from './sets/high-risk-plants/journeys/linear/features/index.js'
import {
  COMPLETE_NOTIFICATION,
  COMPLETE_POTATO_CONSIGNMENT
} from './sets/high-risk-plants/journeys/linear/test-support.js'
import { copy as dashboardCopy } from './sets/high-risk-plants/journeys/linear/features/dashboard/copy/copy.en.js'
import { copy as sharedCopy } from './shared/copy.en.js'
import { authenticatedCredentials } from './engine/test-support.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

describe('high-risk-plants plugin registration', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it('Should register the set under its own plugin name', () => {
    expect(server.registrations).toHaveProperty('high-risk-plants')
  })

  // Every seam below is keyed by set, and this process mounts more than one, so
  // each assertion has to name the set it means. Reading them bare resolved by
  // the sole-set fallback while only high-risk-plants was mounted.
  it('Should pass every boot guard and build the dispatch index', () => {
    expect(withSetContext(SET_ID, () => isDispatchBuilt())).toBe(true)
  })

  it('Should inject the flow readiness roll-up into the bridge seam', () => {
    const readiness = (answers) =>
      withSetContext(SET_ID, () => makeScope(answers).readyForCheckYourAnswers)

    expect(readiness({})).toBe(false)
    expect(
      readiness({ commodityType: 'potatoes' }),
      'a commodity type with no line leaves the task unfinished'
    ).toBe(false)
    expect(
      readiness(COMPLETE_POTATO_CONSIGNMENT),
      'a complete commodity section with no country of origin leaves the notification unfinished'
    ).toBe(false)
    expect(readiness(COMPLETE_NOTIFICATION)).toBe(true)
  })

  it('Should inject the set party sanitiser into the answers-read seam', async () => {
    // Registration replaces the bridge's identity default, so a reference the
    // address book does not resolve stops being an answer on every read. The
    // seam is only proved here: nothing else configures it.
    const request = { auth: { credentials: authenticatedCredentials } }
    const dangling = { placeOfDestination: { addressId: 'no-such-address' } }
    const read = (answers) =>
      withSetContext(SET_ID, () => answersForRead(request, answers))

    await expect(read(dangling)).resolves.toEqual({})
    await expect(read(COMPLETE_NOTIFICATION)).resolves.toBe(
      COMPLETE_NOTIFICATION
    )
  })

  it('Should name the set-owned session cookies', () => {
    expect(Object.keys(server.states.cookies)).toEqual(
      expect.arrayContaining([
        'highRiskPlantsKnownJourneys',
        'highRiskPlantsOpeningRun',
        'highRiskPlantsFlowOnlyAnswers'
      ])
    )
  })

  it('Should leave every promoted route to inherit the server default strategy', () => {
    for (const route of allRoutes) {
      expect(route.options ?? {}).not.toHaveProperty('auth')
    }
  })

  it('Should serve health unprefixed and the dashboard under the set prefix', async () => {
    const health = await server.inject({ method: 'GET', url: '/health' })
    const dashboard = await server.inject({
      method: 'GET',
      url: SET_BASE,
      auth: { strategy: 'session', credentials: authenticatedCredentials }
    })

    expect(health.statusCode).toBe(statusCodes.ok)
    expect(dashboard.statusCode).toBe(statusCodes.ok)
    expect(dashboard.result).toContain(dashboardCopy.startButton)
  })

  it('Should list the sets at the root rather than serving one there', async () => {
    // No credentials: the chooser is reachable signed out (`auth` mode `try`),
    // so passing them here would only mislead the reader.
    const response = await server.inject({ method: 'GET', url: '/' })

    // This is the prototype host, so the root is a chooser rather than a
    // redirect: with several prototypes running there is no default.
    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.result).toContain(`href="${SET_BASE}"`)
    expect(response.result).toContain(`href="${SAMPLE_JOURNEY_BASE}"`)
    // Signed out, so no signed-in navigation.
    expect(response.result).not.toContain(
      sharedCopy.layout.serviceNavigation.logOut
    )
  })

  it('Should render the signed-in navigation on the chooser for a reader with a session', async () => {
    // `auth` mode `try` rather than `false`: the chooser is reachable signed
    // out, but a request that carries a session still reads it.
    const sessionId = 'chooser-session'
    await server.app.cache.set(sessionId, { email: 'trader@example.com' })

    const response = await server.inject({
      method: 'GET',
      url: '/',
      auth: {
        strategy: 'session',
        credentials: { ...authenticatedCredentials, sessionId }
      }
    })

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.result).toContain('govuk-service-navigation__list')
    expect(response.result).toContain(
      sharedCopy.layout.serviceNavigation.logOut
    )
  })

  it.each([
    ['high-risk-plants', SET_BASE],
    ['sample-journey', SAMPLE_JOURNEY_BASE]
  ])(
    'Should mark the Dashboard item active on the %s dashboard',
    async (_setId, setBase) => {
      // Both sets are mounted here, so nothing resolves by the sole-set
      // fallback: the navigation item is marked from the set the REQUEST is
      // in, and it points at that set's own dashboard.
      const sessionId = `nav-session-${setBase}`
      await server.app.cache.set(sessionId, { email: 'trader@example.com' })

      const response = await server.inject({
        method: 'GET',
        url: setBase,
        auth: {
          strategy: 'session',
          credentials: { ...authenticatedCredentials, sessionId }
        }
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      const $ = load(response.result)
      const dashboard = $('.govuk-service-navigation__link').filter(
        (_, link) =>
          $(link).text().trim() ===
          sharedCopy.layout.serviceNavigation.dashboard
      )

      expect(dashboard).toHaveLength(1)
      expect(dashboard.attr('aria-current')).toBe('true')
      expect(dashboard.attr('href')).toBe(setBase)
    }
  )

  it('Should serve the sample journey’s own page under its prefix', async () => {
    // The chooser linking to a set proves nothing about the set answering.
    // This renders the real template through the set's configured seams, so a
    // broken template or an unconfigured seam fails here.
    const response = await server.inject({
      method: 'GET',
      url: SAMPLE_JOURNEY_BASE,
      auth: { strategy: 'session', credentials: authenticatedCredentials }
    })

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.result).toContain('Sample journey')
  })
})
