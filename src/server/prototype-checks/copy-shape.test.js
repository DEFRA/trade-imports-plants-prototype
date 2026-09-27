import { describe, expect, it } from 'vitest'

import { checkSetCopy, describeCopyProblem } from './copy-shape.js'
import {
  REAL_JOURNEY_SET,
  setFolderOf,
  setIdsOnDisk,
  setsToCheck
} from './sets-on-disk.js'

/**
 * Every design release keeps its English and Welsh copy the same shape. The
 * real journey (high-risk-plants) is left to its own upstream tests, which
 * are stricter: they refuse the `[Welsh needed]` marker a release may carry.
 */
const releases = setsToCheck(setIdsOnDisk()).filter(
  (setId) => setId !== REAL_JOURNEY_SET
)

describe('copy shape — every design release', () => {
  it('Should find the sets on disk', () => {
    expect(setIdsOnDisk()).toContain(REAL_JOURNEY_SET)
  })

  it.each(releases)(
    'Should keep the English and Welsh copy of %s the same shape',
    async (setId) => {
      const { problems } = await checkSetCopy(setFolderOf(setId))
      const lines = problems.map(describeCopyProblem)

      expect(
        lines,
        `copy-shape: ${setId} has copy problems:\n${lines.join('\n')}`
      ).toEqual([])
    }
  )
})
