import { beforeEach, describe, expect, it } from 'vitest'
import { clearSeeded, recordSeeded, seededIdsFor } from './registry.js'

const SET_A = 'a-set'
const SET_B = 'another-set'
const ORGANISATION_A = 'org-1'
const ORGANISATION_B = 'org-2'

describe('the seed registry', () => {
  beforeEach(() => {
    clearSeeded(SET_A)
    clearSeeded(SET_B)
  })

  it('Should answer empty for a set and organisation nothing was recorded for', () => {
    expect(seededIdsFor(SET_A, ORGANISATION_A)).toEqual([])
  })

  it('Should read back what was recorded, keyed by both set and organisation', () => {
    recordSeeded(SET_A, ORGANISATION_A, ['ref-1', 'ref-2'])
    recordSeeded(SET_A, ORGANISATION_B, ['ref-3'])

    expect(seededIdsFor(SET_A, ORGANISATION_A)).toEqual(['ref-1', 'ref-2'])
    expect(seededIdsFor(SET_A, ORGANISATION_B)).toEqual(['ref-3'])
  })

  it('Should clear only the named set', () => {
    recordSeeded(SET_A, ORGANISATION_A, ['ref-1'])
    recordSeeded(SET_B, ORGANISATION_A, ['ref-2'])

    clearSeeded(SET_A)

    expect(seededIdsFor(SET_A, ORGANISATION_A)).toEqual([])
    expect(seededIdsFor(SET_B, ORGANISATION_A)).toEqual(['ref-2'])
  })
})
