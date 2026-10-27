import { describe, expect, it } from 'vitest'

import { REPO_ROOT } from '../lib/repo.js'
import { listSets, REAL_JOURNEY_SET } from '../lib/sets.js'
import { allowRepoScaleWork } from '../lib/test-support.js'
import { checkReleaseAssets } from './release-assets.js'

allowRepoScaleWork()

describe('#checkReleaseAssets — every set on disk', () => {
  it.each(
    listSets({ root: REPO_ROOT }).filter((id) => id !== REAL_JOURNEY_SET)
  )(
    "Should find no problem with %s's own styles, scripts and patterns",
    (setId) => {
      const { problems } = checkReleaseAssets(setId, { root: REPO_ROOT })

      expect(
        problems.map(({ file, message }) => `${file}: ${message}`)
      ).toEqual([])
    }
  )
})
