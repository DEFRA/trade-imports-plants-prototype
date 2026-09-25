/**
 * The deployed prototype runs in production with STUB_MODE set. Sign-in must
 * then be plants-frontend's own Defra ID sign-in, with no stub sign-in, while
 * every data service still serves stub data and the shared example data still
 * reaches a signed-in dashboard.
 *
 * Every module is imported after `isProduction` is switched on, because the
 * records seam picks stub or real when it is first imported.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const SET_ID = 'high-risk-plants'

const DEFRA_ID_USER = Object.freeze({
  contactId: 2100010101,
  name: 'Defra ID User',
  organisationId: 'defra-id-organisation',
  currentRelationshipId: 'defra-id-organisation'
})

describe('a production run with stub mode set', () => {
  let server
  let fetchMock
  let mode

  beforeAll(async () => {
    vi.resetModules()
    const { config } = await import('../../config/config.js')
    config.set('isProduction', true)
    config.set('stubMode', true)

    fetchMock = vi.fn(async () => {
      throw new Error('no real service should be called')
    })
    vi.stubGlobal('fetch', fetchMock)

    mode = await import('../common/services/mode.js')
    const { createServer } = await import('../server.js')
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    vi.unstubAllGlobals()
    await server.stop({ timeout: 0 })
  })

  describe('sign-in', () => {
    it('Should not honour stub mode for sign-in', () => {
      expect(mode.isStubMode()).toBe(false)
    })

    it('Should not register stub sign-in', async () => {
      const response = await server.inject('/auth/stub-sign-in')

      expect(response.statusCode).toBe(404)
    })

    it('Should sign in through Defra ID', () => {
      const signIn = server.match('GET', '/auth/sign-in')
      const callback = server.match('GET', '/auth/sign-in-oidc')

      expect(signIn.settings.auth.strategies).toEqual(['defra-id'])
      expect(callback.settings.auth.strategies).toEqual(['defra-id'])
    })
  })

  describe('data', () => {
    it('Should serve stub data', () => {
      expect(mode.isStubDataMode()).toBe(true)
    })

    it('Should use the stub records store', async () => {
      const { records } =
        await import('../app/services/persistence/records/index.js')
      const { records: stubRecords } =
        await import('../app/services/persistence/records/stub/index.js')

      expect(records).toBe(stubRecords)
    })

    it('Should serve the stub countries, ports and address book without calling out', async () => {
      const countries = await import('../app/services/countries/index.js')
      const ports = await import('../app/services/ports/index.js')
      const addressBook = await import('../app/services/address-book/index.js')

      expect(await countries.originLabel('AT')).toBe('Austria')
      expect(await ports.list()).toContainEqual({
        code: 'GB ABD',
        name: 'Aberdeen Harbour'
      })
      expect(
        (await addressBook.search(DEFRA_ID_USER.organisationId)).total
      ).toBeGreaterThan(0)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('Should show the shared example data to a user signed in through Defra ID', async () => {
      const { seedHighRiskPlants } =
        await import('../prototype-seed/seed-high-risk-plants.js')
      const { recordSeeded } = await import('../prototype-seed/registry.js')
      const { createSeedClient } =
        await import('../prototype-seed/http-client.js')
      const journeyIds = await seedHighRiskPlants(server)
      recordSeeded(SET_ID, journeyIds)

      const user = createSeedClient(server, { credentials: DEFRA_ID_USER })
      const dashboard = await user.get(`/${SET_ID}`)

      expect(dashboard.statusCode).toBe(200)
      for (const journeyId of journeyIds) {
        expect(dashboard.result).toContain(journeyId)
      }
    })
  })
})
