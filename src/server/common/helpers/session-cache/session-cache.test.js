import { describe, expect, test, vi } from 'vitest'

const configGetMock = vi.hoisted(() => vi.fn())
const isStubModeMock = vi.hoisted(() => vi.fn())

vi.mock('../../../../config/config.js', () => ({
  config: {
    get: configGetMock
  }
}))

vi.mock('../../services/mode.js', () => ({
  isStubMode: isStubModeMock
}))

const sessionConfig = {
  cache: { name: 'session', ttl: 14400000 },
  cookie: { password: 'replace-with-at-least-32-chars-long', ttl: 14400000 }
}

const configureMock = ({ cookieSecure, stubMode }) => {
  isStubModeMock.mockReturnValue(stubMode)
  configGetMock.mockImplementation((key) => {
    if (key === 'session') {
      return sessionConfig
    }
    if (key === 'session.cookie.secure') {
      return cookieSecure
    }
    return undefined
  })
}

describe('sessionCache', () => {
  test('cookie is secure when config says so and stub mode is off', async () => {
    vi.resetModules()
    configureMock({ cookieSecure: true, stubMode: false })

    const { sessionCache } = await import('./session-cache.js')

    expect(sessionCache.options.cookieOptions.isSecure).toBe(true)
  })

  test('cookie is not secure when stub mode is on, even if config says secure', async () => {
    // A designer reaches the prototype over plain http, in production mode
    // (see mode.js) - a Secure cookie would refuse to travel with the
    // request, breaking the journey state this cookie carries.
    vi.resetModules()
    configureMock({ cookieSecure: true, stubMode: true })

    const { sessionCache } = await import('./session-cache.js')

    expect(sessionCache.options.cookieOptions.isSecure).toBe(false)
  })

  test('cookie is not secure when config says so, regardless of stub mode', async () => {
    vi.resetModules()
    configureMock({ cookieSecure: false, stubMode: false })

    const { sessionCache } = await import('./session-cache.js')

    expect(sessionCache.options.cookieOptions.isSecure).toBe(false)
  })
})
