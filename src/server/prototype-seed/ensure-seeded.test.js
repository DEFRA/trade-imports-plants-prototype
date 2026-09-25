import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ensureSeeded } from './index.js'
import { seedHighRiskPlants } from './seed-high-risk-plants.js'
import { clearSeeded, seededIdsFor } from './registry.js'

const SET_ID = 'high-risk-plants'

/**
 * A seeder stand-in with an artificial delay, so two `ensureSeeded` calls
 * fired together both find a seed already in flight rather than one
 * finishing before the other starts. `seed-high-risk-plants.test.js` proves
 * the real seeder's own behaviour; this file proves `ensureSeeded` only ever
 * runs it once per set, however many first requests arrive together.
 */
vi.mock('./seed-high-risk-plants.js', () => ({
  EXAMPLE_DATA_AUTHOR_ID: 'prototype-example-data',
  seedHighRiskPlants: vi.fn(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10))
    return ['seeded-1', 'seeded-2']
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

    expect(seedHighRiskPlants).toHaveBeenCalledTimes(1)
    expect(seededIdsFor(SET_ID)).toEqual(['seeded-1', 'seeded-2'])
  })
})
