import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const ENV_KEYS = ['STUB_MODE', 'SESSION_CACHE_ENGINE', 'PORT']
const originalEnv = {}

describe('prototype defaults', () => {
  beforeEach(() => {
    vi.resetModules()
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = originalEnv[key]
      }
    }
  })

  test('sets each variable when it is not already set', async () => {
    await import('./prototype-defaults.js')

    expect(process.env.STUB_MODE).toBe('true')
    expect(process.env.SESSION_CACHE_ENGINE).toBe('memory')
    expect(process.env.PORT).toBe('3103')
  })

  test('leaves an already-set variable alone', async () => {
    process.env.STUB_MODE = 'false'
    process.env.SESSION_CACHE_ENGINE = 'redis'
    process.env.PORT = '4000'

    await import('./prototype-defaults.js')

    expect(process.env.STUB_MODE).toBe('false')
    expect(process.env.SESSION_CACHE_ENGINE).toBe('redis')
    expect(process.env.PORT).toBe('4000')
  })
})
