import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ensureSeeded } from './index.js'
import { seedSet } from './seed-set.js'
import { clearSeeded, seededExamplesFor, seededIdsFor } from './registry.js'

const SET_ID = 'high-risk-plants'

const made = (slug, journeyId, extra = {}) => ({
  slug,
  label: slug,
  status: 'draft',
  organisationId: null,
  journeyId,
  href: `/${SET_ID}/notifications/${journeyId}/hub`,
  stopAt: 'hub',
  ...extra
})

/**
 * A seeder stand-in with an artificial delay, so two `ensureSeeded` calls
 * fired together both find a seed already in flight rather than one
 * finishing before the other starts. `seed-set.test.js` proves the real
 * seeder's own behaviour; this file proves `ensureSeeded` only ever runs it
 * once per set, however many first requests arrive together, and records what
 * it made.
 */
vi.mock('./seed-set.js', () => ({
  EXAMPLE_DATA_AUTHOR_ID: 'prototype-example-data',
  seedSet: vi.fn(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10))
    return [
      made('first', 'seeded-1'),
      made('second', 'seeded-2'),
      made('gone', 'seeded-3', { status: 'deleted' }),
      made('theirs', 'seeded-4', { organisationId: 'org-b' })
    ]
  })
}))

describe('guarding concurrent first requests to the same set', () => {
  // PROTOTYPE_SEED is unset by default in this process; every test here wants
  // seeding on, so this is belt and braces against a stray override leaking
  // in from another test file.
  beforeEach(() => {
    delete process.env.PROTOTYPE_SEED
  })

  afterEach(() => {
    clearSeeded(SET_ID)
    vi.clearAllMocks()
  })

  it('Should seed the set once, with no duplicate notifications, whichever caller reads the result', async () => {
    const fakeServer = {}

    await Promise.all([
      ensureSeeded(fakeServer, SET_ID),
      ensureSeeded(fakeServer, SET_ID)
    ])

    expect(seedSet).toHaveBeenCalledTimes(1)
    expect(seededIdsFor(SET_ID)).toEqual(['seeded-1', 'seeded-2'])
    expect(seededExamplesFor(SET_ID).map((example) => example.slug)).toEqual([
      'first',
      'second',
      'gone',
      'theirs'
    ])
  })

  it('Should not seed a set that has no examples', async () => {
    await ensureSeeded({}, 'sample-journey')

    expect(seedSet).not.toHaveBeenCalled()
  })
})
