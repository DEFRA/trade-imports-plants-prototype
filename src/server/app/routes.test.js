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

  it('Should pass every boot guard and build the dispatch index', () => {
    expect(isDispatchBuilt()).toBe(true)
  })

  it('Should inject the flow readiness roll-up into the bridge seam', () => {
    expect(makeScope({}).readyForCheckYourAnswers).toBe(false)
    expect(
      makeScope({ commodityType: 'potatoes' }).readyForCheckYourAnswers,
      'a commodity type with no line leaves the task unfinished'
    ).toBe(false)
    expect(
      makeScope(COMPLETE_POTATO_CONSIGNMENT).readyForCheckYourAnswers,
      'a complete commodity section with no country of origin leaves the notification unfinished'
    ).toBe(false)
    expect(makeScope(COMPLETE_NOTIFICATION).readyForCheckYourAnswers).toBe(true)
  })

  it('Should inject the set party sanitiser into the answers-read seam', async () => {
    // Registration replaces the bridge's identity default, so a reference the
    // address book does not resolve stops being an answer on every read. The
    // seam is only proved here: nothing else configures it.
    const request = { auth: { credentials: authenticatedCredentials } }
    const dangling = { placeOfDestination: { addressId: 'no-such-address' } }

    await expect(answersForRead(request, dangling)).resolves.toEqual({})
    await expect(answersForRead(request, COMPLETE_NOTIFICATION)).resolves.toBe(
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

  it('Should serve health and the dashboard at /', async () => {
    const health = await server.inject({ method: 'GET', url: '/health' })
    const dashboard = await server.inject({
      method: 'GET',
      url: '/',
      auth: { strategy: 'session', credentials: authenticatedCredentials }
    })

    expect(health.statusCode).toBe(statusCodes.ok)
    expect(dashboard.statusCode).toBe(statusCodes.ok)
    expect(dashboard.result).toContain(dashboardCopy.startButton)
  })
})
