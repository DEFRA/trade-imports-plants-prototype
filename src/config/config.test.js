import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { config } from './config.js'

const originalStubMode = process.env.STUB_MODE

const restoreStubMode = () => {
  if (originalStubMode === undefined) {
    delete process.env.STUB_MODE
  } else {
    process.env.STUB_MODE = originalStubMode
  }
}

describe('#config', () => {
  test('defaults the address book link to a dead .invalid address', () => {
    expect(config.get('tradeImportsInsFrontend.baseUrl')).toBe(
      'https://address-book.invalid'
    )
  })

  describe('tradeImportsInsFrontend.baseUrl', () => {
    beforeEach(() => {
      vi.resetModules()
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    test('ignores TRADE_IMPORTS_INS_FRONTEND_URL — the address book link can never point at a real service', async () => {
      vi.stubEnv('TRADE_IMPORTS_INS_FRONTEND_URL', 'http://localhost:3002')

      const { config: freshConfig } = await import('./config.js')

      expect(freshConfig.get('tradeImportsInsFrontend.baseUrl')).toBe(
        'https://address-book.invalid'
      )
    })
  })

  describe('Defra ID redirect URLs', () => {
    test('defaults the sign-in redirect to this prototype’s own port, 3103', () => {
      expect(config.get('defraId.redirectUrl')).toBe(
        'http://localhost:3103/auth/sign-in-oidc'
      )
    })

    test('defaults the sign-out redirect to this prototype’s own port, 3103', () => {
      expect(config.get('defraId.signOutRedirectUrl')).toBe(
        'http://localhost:3103/auth/sign-out-oidc'
      )
    })
  })

  describe('stubMode', () => {
    beforeEach(() => {
      vi.resetModules()
    })

    afterEach(() => {
      restoreStubMode()
    })

    test('reads STUB_MODE=true as true', async () => {
      process.env.STUB_MODE = 'true'

      const { config: freshConfig } = await import('./config.js')

      expect(freshConfig.get('stubMode')).toBe(true)
    })

    test('defaults to false when STUB_MODE is unset', async () => {
      delete process.env.STUB_MODE

      const { config: freshConfig } = await import('./config.js')

      expect(freshConfig.get('stubMode')).toBe(false)
    })

    test("rejects a STUB_MODE value that is not 'true' or 'false'", async () => {
      process.env.STUB_MODE = 'flase'

      await expect(import('./config.js')).rejects.toThrow(
        "must be 'true' or 'false'"
      )
    })
  })

  describe('env-backed booleans', () => {
    const STRICT_BOOLEAN_ENV_VARS = [
      'LOG_ENABLED',
      'ENABLE_SECURE_CONTEXT',
      'SESSION_COOKIE_SECURE',
      'DEFRA_ID_SIGN_OUT_HOSTNAME_REWRITE_ENABLED',
      'DEFRA_ID_REFRESH_TOKENS',
      'STUB_MODE',
      'AUTH_ENABLED',
      'USE_SINGLE_INSTANCE_CACHE',
      'REDIS_TLS',
      'NUNJUCKS_WATCH',
      'NUNJUCKS_NO_CACHE'
    ]

    beforeEach(() => {
      vi.resetModules()
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    test.each(STRICT_BOOLEAN_ENV_VARS)(
      "refuses %s when it is not 'true' or 'false'",
      async (envVar) => {
        vi.stubEnv(envVar, 'flase')

        await expect(import('./config.js')).rejects.toThrow(
          "must be 'true' or 'false'"
        )
      }
    )

    test('reads AUTH_ENABLED=false as false', async () => {
      vi.stubEnv('AUTH_ENABLED', 'false')

      const { config: freshConfig } = await import('./config.js')

      expect(freshConfig.get('auth.enabled')).toBe(false)
    })
  })

  describe('auth.cookieName', () => {
    beforeEach(() => {
      vi.resetModules()
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    test('defaults to a service-distinct name in development', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const { config: freshConfig } = await import('./config.js')

      expect(freshConfig.get('auth.cookieName')).toBe('plants-prototype-sid')
    })

    test('reads AUTH_SESSION_COOKIE_NAME as the cookie name', async () => {
      vi.stubEnv('AUTH_SESSION_COOKIE_NAME', 'custom-sid')

      const { config: freshConfig } = await import('./config.js')

      expect(freshConfig.get('auth.cookieName')).toBe('custom-sid')
    })
  })
})
