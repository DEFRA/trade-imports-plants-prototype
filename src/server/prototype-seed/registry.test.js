import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearSeeded,
  hasBeenSeeded,
  recordSeeded,
  seededIdsFor
} from './registry.js'

const SET_A = 'a-set'
const SET_B = 'another-set'

describe('the seed registry', () => {
  beforeEach(() => {
    clearSeeded(SET_A)
    clearSeeded(SET_B)
  })

  it('Should answer empty for a set nothing was recorded for', () => {
    expect(seededIdsFor(SET_A)).toEqual([])
  })

  it('Should read back what was recorded for each set', () => {
    recordSeeded(SET_A, ['ref-1', 'ref-2'])
    recordSeeded(SET_B, ['ref-3'])

    expect(seededIdsFor(SET_A)).toEqual(['ref-1', 'ref-2'])
    expect(seededIdsFor(SET_B)).toEqual(['ref-3'])
  })

  it('Should replace what a set recorded before', () => {
    recordSeeded(SET_A, ['ref-1'])
    recordSeeded(SET_A, ['ref-2'])

    expect(seededIdsFor(SET_A)).toEqual(['ref-2'])
  })

  it('Should clear only the named set', () => {
    recordSeeded(SET_A, ['ref-1'])
    recordSeeded(SET_B, ['ref-2'])

    clearSeeded(SET_A)

    expect(seededIdsFor(SET_A)).toEqual([])
    expect(seededIdsFor(SET_B)).toEqual(['ref-2'])
  })

  it('Should not consider a set seeded until something is recorded for it', () => {
    expect(hasBeenSeeded(SET_A)).toBe(false)

    recordSeeded(SET_A, ['ref-1'])

    expect(hasBeenSeeded(SET_A)).toBe(true)
  })

  it('Should stop considering a set seeded once it is cleared', () => {
    recordSeeded(SET_A, ['ref-1'])

    clearSeeded(SET_A)

    expect(hasBeenSeeded(SET_A)).toBe(false)
  })
})
