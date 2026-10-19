import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createServer } from '../../server.js'
import { mockOidcConfig } from '../../common/test-helpers/mock-oidc-config.js'
import { LEVELS } from './levels.js'
import { PAGE_LEVELS, SECTION_LEVELS } from './page-levels.js'
import { isInSection } from './page-maturity.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

describe('page maturity page levels', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const registeredGetPaths = () =>
    server
      .table()
      .filter((route) => route.method === 'get')
      .map((route) => route.path)

  it('Should list only GET routes the server really registers', () => {
    const registered = new Set(registeredGetPaths())

    for (const routePath of Object.keys(PAGE_LEVELS)) {
      expect(registered.has(routePath), `${routePath} is not a route`).toBe(
        true
      )
    }
  })

  it('Should list only sections that hold at least one registered GET route', () => {
    const registered = registeredGetPaths()

    for (const { section } of SECTION_LEVELS) {
      expect(
        registered.some((routePath) => isInSection(routePath, section)),
        `${section} holds no route`
      ).toBe(true)
    }
  })

  it('Should give every page and section a known level', () => {
    const levels = [
      ...Object.values(PAGE_LEVELS),
      ...SECTION_LEVELS.map(({ level }) => level)
    ]

    for (const level of levels) {
      expect(Object.values(LEVELS)).toContain(level)
    }
  })
})
