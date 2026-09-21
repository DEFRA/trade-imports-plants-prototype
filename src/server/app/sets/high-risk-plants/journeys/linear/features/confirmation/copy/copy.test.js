import { describe, expect, it } from 'vitest'
import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('confirmation copy', () => {
  it.each([en, cy])('Should provide non-empty receipt copy', (copy) => {
    for (const { value } of leaves(copy)) {
      expect(isCopyLeaf(value)).toBe(true)
    }
  })

  // The late rules are parameterised on the timing window, so the leaf walk
  // above only proves they are functions. Call them in both languages.
  it.each([en, cy])(
    'Should write the timing window into both late rules',
    (copy) => {
      expect(copy.late.potatoes(2)).toContain('2')
      expect(copy.late.plantsAndWood(4)).toContain('4')
    }
  )
})
