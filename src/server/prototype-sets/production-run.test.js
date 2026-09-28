/**
 * The deployed prototype runs in production with STUB_MODE set. Sign-in must
 * then be plants-frontend's own Defra ID sign-in, with no stub sign-in, while
 * every data service still serves stub data and the shared example data still
 * reaches a signed-in dashboard. This covers every kind of thing the prototype
 * serves — the real journey, the chooser, the placeholder set, a prototype-owned
 * service page, and a release scaffolded from the real journey the way
 * `new:set` makes one — because each is wired up slightly differently and a
 * production boot has broken one kind before without breaking the others.
 *
 * The scaffolded-release fixture is made with the same `copySetFiles`/
 * `copyRoutesFile` primitives `new:set` uses, so it proves the real copier's
 * output boots, not a hand-written stand-in. It is scaffolded into a private
 * copy of `src/` under the gitignored `.cache/`, never into this repo's own
 * `src/server/app/sets/`: every other test file that lists the sets on disk
 * runs at the same time, and would otherwise find a set that is not mounted.
 * The copy sits inside the repo so its imports still find `node_modules`.
 *
 * Every module is imported after `isProduction` is switched on, because the
 * records seam picks stub or real when it is first imported.
 */
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'
import { authenticatedCredentials } from '../app/engine/test-support.js'
import { SET_BASE as PLANTS_BASE } from '../app/sets/high-risk-plants/set.js'
import { SET_BASE as SAMPLE_JOURNEY_BASE } from '../app/sets/sample-journey/set.js'
import {
  copyRoutesFile,
  copySetFiles,
  planCopy
} from '../../../scripts/new-set/copy-set.js'

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

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url))
const setPath = (root, setId) => path.join(root, 'src/server/app/sets', setId)
const routesFilePath = (root, setId) =>
  path.join(root, `src/server/app/routes-${setId}.js`)

const FIXTURE_SOURCE_ID = 'high-risk-plants'
const FIXTURE_SET_ID = 'production-run-fixture'
const FIXTURE_SET_BASE = `/${FIXTURE_SET_ID}`

const isTestFile = (source) => /\.(?:test|spec)\.js$/.test(source)

/**
 * A private copy of `src/`, without its tests, under the repo's gitignored
 * `.cache/`. Its own module instances (config, server, stores) are separate
 * from the ones the rest of this file imports.
 *
 * @returns {string} the copy's root, the folder that holds its `src/`.
 */
const makeIsolatedCopy = () => {
  const cacheDir = path.join(REPO_ROOT, '.cache')
  mkdirSync(cacheDir, { recursive: true })
  const root = mkdtempSync(path.join(cacheDir, 'production-run-'))
  cpSync(path.join(REPO_ROOT, 'src'), path.join(root, 'src'), {
    recursive: true,
    filter: (source) => !isTestFile(source)
  })
  return root
}

/** Scaffolds a release from the real journey into `root` the way `new:set`
 * does, without `scaffoldSet`'s further edits to `prototype-sets/index.js`,
 * `overrides.json` and `descriptions.js` — this fixture is registered
 * directly on the test's own server instead. */
const scaffoldFixtureRelease = (root) => {
  const sourceSetDir = setPath(root, FIXTURE_SOURCE_ID)
  const sourceRoutesFile = routesFilePath(root, FIXTURE_SOURCE_ID)
  const fixtureSetDir = setPath(root, FIXTURE_SET_ID)
  const fixtureRoutesFile = routesFilePath(root, FIXTURE_SET_ID)
  const uuidMap = new Map()
  const { keep } = planCopy(sourceSetDir, {
    fromId: FIXTURE_SOURCE_ID,
    routesFile: sourceRoutesFile,
    purpose: 'working'
  })
  copySetFiles(sourceSetDir, fixtureSetDir, keep, {
    fromId: FIXTURE_SOURCE_ID,
    newId: FIXTURE_SET_ID,
    uuidMap
  })
  copyRoutesFile(sourceRoutesFile, fixtureRoutesFile, {
    fromId: FIXTURE_SOURCE_ID,
    newId: FIXTURE_SET_ID,
    uuidMap
  })
  return fixtureRoutesFile
}

const signedIn = (credentials = authenticatedCredentials) => ({
  strategy: 'session',
  credentials
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

  describe('the chooser', () => {
    it('Should list every mounted set, signed out', async () => {
      const response = await server.inject({ method: 'GET', url: '/' })

      expect(response.statusCode).toBe(200)
      expect(response.result).toContain(`href="${PLANTS_BASE}"`)
      expect(response.result).toContain(`href="${SAMPLE_JOURNEY_BASE}"`)
    })
  })

  describe('the placeholder set', () => {
    it('Should serve the sample journey’s own page under its prefix', async () => {
      const response = await server.inject({
        method: 'GET',
        url: SAMPLE_JOURNEY_BASE,
        auth: signedIn()
      })

      expect(response.statusCode).toBe(200)
      expect(response.result).toContain('Sample journey')
    })
  })

  describe('a prototype-owned service page', () => {
    it('Should list the stub transporters on the sample journey’s saved-transporters page without calling out', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `${SAMPLE_JOURNEY_BASE}/transporters`,
        auth: signedIn()
      })

      expect(response.statusCode).toBe(200)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })
})

describe('a release scaffolded from the real journey, in a production run with stub mode set', () => {
  let copyRoot
  let server
  let fetchMock

  beforeAll(async () => {
    copyRoot = makeIsolatedCopy()
    const fixtureRoutesFile = scaffoldFixtureRelease(copyRoot)
    const importFromCopy = (repoPath) =>
      import(pathToFileURL(path.join(copyRoot, repoPath)).href)

    vi.doMock(path.join(copyRoot, 'src/auth/get-oidc-config.js'), () => ({
      getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
    }))
    const { config } = await importFromCopy('src/config/config.js')
    config.set('isProduction', true)
    config.set('stubMode', true)
    // The built assets stay in this repo's own .public/.
    config.set('root', REPO_ROOT)

    fetchMock = vi.fn(async () => {
      throw new Error('no real service should be called')
    })
    vi.stubGlobal('fetch', fetchMock)

    const { createServer } = await importFromCopy('src/server/server.js')
    const { productionRunFixture } = await import(
      pathToFileURL(fixtureRoutesFile).href
    )
    server = await createServer()
    await server.register(productionRunFixture, {
      routes: { prefix: FIXTURE_SET_BASE }
    })
    await server.initialize()
  })

  afterAll(async () => {
    vi.unstubAllGlobals()
    await server?.stop({ timeout: 0 })
    if (copyRoot) {
      rmSync(copyRoot, { recursive: true, force: true })
    }
  })

  it('Should require Defra ID sign-in, the same as the real journey', async () => {
    const response = await server.inject({
      method: 'GET',
      url: FIXTURE_SET_BASE
    })

    expect(response.statusCode).not.toBe(200)
  })

  it('Should render its dashboard with stub data for a user signed in through Defra ID', async () => {
    const response = await server.inject({
      method: 'GET',
      url: FIXTURE_SET_BASE,
      auth: signedIn(DEFRA_ID_USER)
    })

    expect(response.statusCode).toBe(200)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
