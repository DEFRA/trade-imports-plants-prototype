import { describe, expect, it } from 'vitest'
import { descriptionFor } from './descriptions.js'

describe('descriptionFor', () => {
  it('Should describe high-risk-plants', () => {
    expect(descriptionFor('high-risk-plants')).toEqual(expect.any(String))
  })

  it('Should answer undefined for a set nothing describes', () => {
    expect(descriptionFor('not-a-known-set')).toBeUndefined()
  })
})
