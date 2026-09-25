import {
  SET_BASE,
  SET_ID
} from '../../../server/app/sets/high-risk-plants/set.js'
import { vi } from 'vitest'

const mockReadFileSync = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('node:fs', async () => {
  const nodeFs = await import('node:fs')

  return {
    ...nodeFs,
    readFileSync: () => mockReadFileSync()
  }
})
vi.mock('../../../server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ error: (...args) => mockLoggerError(...args) })
}))

// `vi.resetModules()` gives each test a fresh `shared/set-context.js` with an
// empty mount registry, so the global setup's registration does not carry over.
// Re-register it, or every path builder throws for want of a set.
const remountSet = async () => {
  const { registerSetMount } =
    await import('../../../server/app/shared/set-context.js')
  registerSetMount(SET_ID, SET_BASE)
}

describe('context and cache', () => {
  beforeEach(async () => {
    mockReadFileSync.mockReset()
    mockLoggerError.mockReset()
    vi.resetModules()
    await remountSet()
  })

  describe('#context', () => {
    const mockRequest = { path: SET_BASE }

    describe('When webpack manifest file read succeeds', () => {
      let contextImport
      let contextResult

      beforeAll(async () => {
        contextImport = await import('./context.js')
      })

      beforeEach(async () => {
        // Return JSON string
        mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

        contextResult = await contextImport.context(mockRequest)
      })

      test('Should provide expected context', () => {
        expect(contextResult).toEqual({
          assetPath: '/public/assets',
          getAssetPath: expect.any(Function),
          serviceName: 'Plants',
          serviceUrl: '/',
          homeUrl: SET_BASE,
          authEnabled: true,
          staleActionRejected: false,
          activeNavigationItem: 'dashboard',
          addressBookUrl: 'http://localhost:3002/address-book',
          userSession: { isAuthenticated: false }
        })
      })

      test('Should mark no navigation item outside the dashboard section', async () => {
        const result = await contextImport.context({ path: '/auth/sign-out' })

        expect(result.activeNavigationItem).toBeNull()
      })

      test('Should send the home link to the root from outside every set', async () => {
        const result = await contextImport.context({ path: '/auth/sign-out' })

        expect(result.homeUrl).toBe('/')
      })

      test('Should send the home link to the set whose mount the path falls under', async () => {
        const result = await contextImport.context({
          path: `${SET_BASE}/notifications/abc-123/origin`
        })

        expect(result.homeUrl).toBe(SET_BASE)
      })

      test('Should describe the signed-in user from their session', async () => {
        const cacheGet = vi
          .fn()
          .mockResolvedValue({ email: 'trader@example.com' })
        const result = await contextImport.context({
          path: SET_BASE,
          auth: {
            isAuthenticated: true,
            credentials: { sessionId: 'session-1' }
          },
          server: { app: { cache: { get: cacheGet } } }
        })

        expect(cacheGet).toHaveBeenCalledWith('session-1')
        expect(result.userSession).toEqual({
          isAuthenticated: true,
          displayName: 'trader@example.com',
          email: 'trader@example.com'
        })
      })

      test('Should not look up a session for a sign-in callback that has no session id yet', async () => {
        const cacheGet = vi.fn()
        const result = await contextImport.context({
          path: '/auth/sign-in-oidc',
          auth: {
            isAuthenticated: true,
            credentials: { profile: { sessionId: 'session-1' } }
          },
          server: { app: { cache: { get: cacheGet } } }
        })

        expect(cacheGet).not.toHaveBeenCalled()
        expect(result.userSession).toEqual({ isAuthenticated: false })
      })

      describe('With valid asset path', () => {
        test('Should provide expected asset path', () => {
          expect(contextResult.getAssetPath('application.js')).toBe(
            '/public/javascripts/application.js'
          )
        })
      })

      describe('With invalid asset path', () => {
        test('Should provide expected asset', () => {
          expect(contextResult.getAssetPath('an-image.png')).toBe(
            '/public/an-image.png'
          )
        })
      })
    })

    describe('When webpack manifest file read fails', () => {
      let contextImport

      beforeAll(async () => {
        contextImport = await import('./context.js')
      })

      beforeEach(() => {
        mockReadFileSync.mockReturnValue(new Error('File not found'))

        return contextImport.context(mockRequest)
      })

      test('Should log that the Webpack Manifest file is not available', () => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          'Webpack assets-manifest.json not found'
        )
      })
    })
  })

  describe('#context cache', () => {
    const mockRequest = { path: SET_BASE }
    let contextResult

    describe('Webpack manifest file cache', () => {
      let contextImport

      beforeAll(async () => {
        contextImport = await import('./context.js')
      })

      beforeEach(async () => {
        // Return JSON string
        mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

        contextResult = await contextImport.context(mockRequest)
      })

      test('Should read file', () => {
        expect(mockReadFileSync).toHaveBeenCalled()
      })

      test('Should use cache', () => {
        expect(mockReadFileSync).not.toHaveBeenCalled()
      })

      test('Should provide expected context', () => {
        expect(contextResult).toEqual({
          assetPath: '/public/assets',
          getAssetPath: expect.any(Function),
          serviceName: 'Plants',
          serviceUrl: '/',
          homeUrl: SET_BASE,
          authEnabled: true,
          staleActionRejected: false,
          activeNavigationItem: 'dashboard',
          addressBookUrl: 'http://localhost:3002/address-book',
          userSession: { isAuthenticated: false }
        })
      })
    })
  })
})

describe('#activeNavigationItem', () => {
  let activeNavigationItem

  beforeAll(async () => {
    await remountSet()
    ;({ activeNavigationItem } = await import('./context.js'))
  })

  test('Should mark the dashboard on the notifications list', () => {
    expect(activeNavigationItem(SET_BASE)).toBe('dashboard')
  })

  test('Should keep the dashboard marked inside a notification', () => {
    expect(
      activeNavigationItem(`${SET_BASE}/notifications/abc-123/origin`)
    ).toBe('dashboard')
  })

  test('Should mark nothing on a page outside the navigation', () => {
    expect(activeNavigationItem('/auth/sign-out')).toBeNull()
  })

  test('Should mark nothing on a path that merely starts with the section name', () => {
    expect(activeNavigationItem(`${SET_BASE}/notificationsomething`)).toBeNull()
  })

  test('Should mark nothing when there is no path', () => {
    expect(activeNavigationItem(undefined)).toBeNull()
  })
})

describe('When auth.enabled is set to false', () => {
  beforeEach(async () => {
    vi.resetModules()
    await remountSet()
    mockReadFileSync.mockReset()
    mockLoggerError.mockReset()
  })
  test('returns authEnabled=false in context', async () => {
    vi.doMock('../../config.js', async (importOriginal) => {
      const mod = await importOriginal()
      const originalGet = mod.config.get.bind(mod.config)
      vi.spyOn(mod.config, 'get').mockImplementation((key) => {
        if (key === 'auth.enabled') return false
        return originalGet(key)
      })
      return mod
    })
    const contextImport = await import('./context.js')
    mockReadFileSync.mockReturnValue(`{
      "application.js": "javascripts/application.js",
      "stylesheets/application.scss": "stylesheets/application.css"
    }`)
    const mockRequest = { path: SET_BASE }
    const contextResult = await contextImport.context(mockRequest)
    expect(contextResult.authEnabled).toBe(false)
    expect(contextResult.userSession).toEqual({ isAuthenticated: false })
  })
})

describe('When the configured INS base URL has a trailing slash', () => {
  beforeEach(() => {
    vi.resetModules()
    mockReadFileSync.mockReset()
    mockLoggerError.mockReset()
  })
  test('Should strip a trailing slash from the configured INS base URL', async () => {
    vi.doMock('../../config.js', async (importOriginal) => {
      const mod = await importOriginal()
      const originalGet = mod.config.get.bind(mod.config)
      vi.spyOn(mod.config, 'get').mockImplementation((key) => {
        if (key === 'tradeImportsInsFrontend.baseUrl') return 'http://ins.test/'
        return originalGet(key)
      })
      return mod
    })
    const contextImport = await import('./context.js')
    mockReadFileSync.mockReturnValue(`{
      "application.js": "javascripts/application.js",
      "stylesheets/application.scss": "stylesheets/application.css"
    }`)
    const mockRequest = { path: '/' }
    const contextResult = await contextImport.context(mockRequest)
    expect(contextResult.addressBookUrl).toBe('http://ins.test/address-book')
  })
})
