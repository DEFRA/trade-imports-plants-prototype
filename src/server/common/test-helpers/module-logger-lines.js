import { afterEach, beforeEach, vi } from 'vitest'

import { createLogger } from '../helpers/logging/logger.js'

const recordModuleLoggerLines = (level) => {
  const entries = []
  let levelSpy

  beforeEach(() => {
    entries.length = 0
    levelSpy = vi
      .spyOn(createLogger(), level)
      .mockImplementation((fields, message) => {
        entries.push({ fields, message })
      })
  })

  afterEach(() => {
    levelSpy.mockRestore()
  })

  return {
    entriesWith: (message) =>
      entries.filter((entry) => entry.message === message)
  }
}

/**
 * Records the info lines the module-level logger writes during each test of the
 * enclosing `describe`, and restores the logger afterwards.
 *
 * @returns {{ entriesWith: (message: string) => Array<{ fields: object, message: string }> }}
 */
export const recordModuleLoggerInfo = () => recordModuleLoggerLines('info')

/**
 * Records the warn lines the module-level logger writes during each test of the
 * enclosing `describe`, and restores the logger afterwards.
 *
 * @returns {{ entriesWith: (message: string) => Array<{ fields: object, message: string }> }}
 */
export const recordModuleLoggerWarn = () => recordModuleLoggerLines('warn')
