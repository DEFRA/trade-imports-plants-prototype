import { describe, expect, it } from 'vitest'

import {
  hasBeenSeeded,
  recordSeeded,
  seededExamples,
  seededIds,
  seedingPending
} from './seed-link.js'

const RELEASE = 'plants-seed-link-test'
const LATE_EXAMPLE = 'GBN-HRP-26-LATE01'

describe('seed link', () => {
  it('Should hand restored examples to the real seeder and read them back', () => {
    const examples = [{ slug: 'late', journeyId: LATE_EXAMPLE }]

    expect(hasBeenSeeded(RELEASE)).toBe(false)

    recordSeeded(RELEASE, [LATE_EXAMPLE], examples)

    expect(hasBeenSeeded(RELEASE)).toBe(true)
    expect(seededIds(RELEASE)).toEqual([LATE_EXAMPLE])
    expect(seededExamples(RELEASE)).toEqual(examples)
  })

  it('Should never wait on a set that has no examples to make', () => {
    expect(seedingPending('plants-seed-link-no-examples')).toBe(false)
  })
})
