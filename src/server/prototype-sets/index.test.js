/**
 * The prototype host's additions to plants-frontend's router, booted through
 * the real composition root: the chooser at `/` and the sample-journey set
 * mounted alongside high-risk-plants.
 */
import { load } from 'cheerio'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'
import { authenticatedCredentials } from '../app/engine/test-support.js'
import { copy as sharedCopy } from '../app/shared/copy.en.js'
import { SET_BASE as PLANTS_BASE } from '../app/sets/high-risk-plants/set.js'
import { SET_BASE as SAMPLE_JOURNEY_BASE } from '../app/sets/sample-journey/set.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const signedIn = async (server, sessionId) => {
  await server.app.cache.set(sessionId, { email: 'trader@example.com' })
  return {
    strategy: 'session',
    credentials: { ...authenticatedCredentials, sessionId }
  }
}

describe('the prototype host', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it('Should list every mounted set on the chooser, signed out', async () => {
    const response = await server.inject({ method: 'GET', url: '/' })

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.result).toContain(`href="${PLANTS_BASE}"`)
    expect(response.result).toContain(`href="${SAMPLE_JOURNEY_BASE}"`)
    expect(response.result).not.toContain(
      sharedCopy.layout.serviceNavigation.logOut
    )
  })

  it('Should render the signed-in navigation on the chooser for a reader with a session', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/',
      auth: await signedIn(server, 'chooser-session')
    })

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.result).toContain(
      sharedCopy.layout.serviceNavigation.logOut
    )
  })

  it('Should serve the sample journey’s own page under its prefix', async () => {
    const response = await server.inject({
      method: 'GET',
      url: SAMPLE_JOURNEY_BASE,
      auth: { strategy: 'session', credentials: authenticatedCredentials }
    })

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.result).toContain('Sample journey')
  })

  it.each([
    ['high-risk-plants', PLANTS_BASE],
    ['sample-journey', SAMPLE_JOURNEY_BASE]
  ])(
    'Should point the Dashboard item at the %s dashboard from inside it',
    async (_setId, setBase) => {
      const response = await server.inject({
        method: 'GET',
        url: setBase,
        auth: await signedIn(server, `nav-session-${setBase}`)
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      const $ = load(response.result)
      const dashboard = $('.govuk-service-navigation__link').filter(
        (_, link) =>
          $(link).text().trim() ===
          sharedCopy.layout.serviceNavigation.dashboard
      )

      expect(dashboard).toHaveLength(1)
      expect(dashboard.attr('href')).toBe(setBase)
    }
  )
})
