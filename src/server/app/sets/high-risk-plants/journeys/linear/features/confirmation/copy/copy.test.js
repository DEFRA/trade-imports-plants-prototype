import { describe, expect, it } from 'vitest'
import { itHoldsCopyAtEveryLeaf } from '../../../../../../../engine/test-support.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('confirmation copy', () => {
  itHoldsCopyAtEveryLeaf(en, cy)

  it.each([en, cy])(
    'Should write the timing window into both late rules',
    (copy) => {
      expect(copy.late.potatoes(2)).toContain('2')
      expect(copy.late.plantsAndWood(4)).toContain('4')
    }
  )
})
