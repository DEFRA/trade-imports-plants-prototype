import { describe, expect, it } from 'vitest'
import { itHoldsCopyAtEveryLeaf } from '../../../../../../../engine/test-support.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('declaration copy', () => {
  itHoldsCopyAtEveryLeaf(en, cy)

  it.each([en, cy])('Should contain three plants statements', (copy) => {
    expect(copy.body).toHaveLength(3)
  })
})
