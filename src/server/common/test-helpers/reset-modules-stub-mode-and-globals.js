import { afterEach, beforeEach, vi } from 'vitest'

/**
 * Resets the module registry before each test and, after it, restores the
 * STUB_MODE environment variable to its value when this was called. For a
 * test file whose tests set process.env.STUB_MODE and dynamically import a
 * module that reads it at import time.
 */
export const resetModulesStubModeAndStubbedGlobals = () => {
  const originalMode = process.env.STUB_MODE

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalMode === undefined) {
      delete process.env.STUB_MODE
    } else {
      process.env.STUB_MODE = originalMode
    }
  })
}
