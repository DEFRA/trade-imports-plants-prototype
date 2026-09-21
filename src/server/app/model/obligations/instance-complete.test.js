import { describe, it, expect, beforeAll, afterAll } from 'vitest'

import { configureObligationSet } from './manifest.js'
import { instanceComplete } from './instance-complete.js'

// Synthetic manifest — mirrors the shape of a two-level nested collection
// with per-instance invariants, so instanceComplete can be exercised
// without pulling in the installed set.

const itemGroup = { id: 'item-group', name: 'itemCollection' }
const nestedGroup = {
  id: 'nested-group',
  name: 'nestedCollection',
  within: itemGroup,
  requires: {
    anyOfIds: ['nested-gated-a', 'nested-gated-b'],
    errorCode: 'nestedCollection.oneFieldRequired'
  }
}
const nestedGatedFieldA = {
  id: 'nested-gated-a',
  name: 'nestedGatedFieldA',
  within: nestedGroup,
  status: 'optional'
}
const nestedGatedFieldB = {
  id: 'nested-gated-b',
  name: 'nestedGatedFieldB',
  within: nestedGroup,
  status: 'optional'
}
const itemSelector = {
  id: 'item-selector',
  name: 'itemSelector',
  within: itemGroup,
  status: 'mandatory'
}

const entry1FulfilmentIndex = 'entry1'
const entry1Record1FulfilmentIndex = 'entry1.record1'

const syntheticSet = {
  obligations: [
    itemGroup,
    nestedGroup,
    nestedGatedFieldA,
    nestedGatedFieldB,
    itemSelector
  ],
  groups: [itemGroup, nestedGroup]
}

const state = ({ fulfilments = {}, obligations = {} } = {}) => ({
  fulfilments,
  obligations
})

const implications = (entries) =>
  Object.fromEntries(entries.map((entry) => [entry.id, entry.implication]))

describe('#instanceComplete', () => {
  beforeAll(() => {
    configureObligationSet(syntheticSet)
  })

  afterAll(() => {
    // Vitest workers isolate module state per test file, so leaving the
    // configured set doesn't leak. Reset defensively anyway.
    configureObligationSet(undefined)
  })

  it('reads a fully-populated instance as complete', () => {
    const st = state({
      fulfilments: {
        [itemSelector.id]: { [entry1FulfilmentIndex]: 'selectorAlpha' },
        [nestedGatedFieldA.id]: { [entry1Record1FulfilmentIndex]: 'valueOne' }
      },
      obligations: implications([
        {
          id: itemGroup.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [entry1FulfilmentIndex]
          }
        },
        {
          id: nestedGroup.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [entry1Record1FulfilmentIndex]
          }
        },
        {
          id: itemSelector.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [entry1FulfilmentIndex]
          }
        },
        {
          id: nestedGatedFieldA.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [entry1Record1FulfilmentIndex]
          }
        },
        {
          id: nestedGatedFieldB.id,
          implication: { inScope: true, fulfilmentIndexes: [] }
        }
      ])
    })
    expect(
      instanceComplete(nestedGroup, entry1Record1FulfilmentIndex, st)
    ).toBe(true)
  })

  it('reads an instance missing a mandatory direct-child leaf as incomplete', () => {
    // itemSelector is a mandatory direct child of itemCollection but has
    // no record for entry1 — the direct-child requirement fires.
    const st = state({
      fulfilments: {},
      obligations: implications([
        {
          id: itemGroup.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [entry1FulfilmentIndex]
          }
        },
        {
          id: itemSelector.id,
          implication: { inScope: true, fulfilmentIndexes: [] }
        },
        {
          id: nestedGroup.id,
          implication: { inScope: true, fulfilmentIndexes: [] }
        },
        {
          id: nestedGatedFieldA.id,
          implication: { inScope: true, fulfilmentIndexes: [] }
        },
        {
          id: nestedGatedFieldB.id,
          implication: { inScope: true, fulfilmentIndexes: [] }
        }
      ])
    })
    expect(instanceComplete(itemGroup, entry1FulfilmentIndex, st)).toBe(false)
  })

  it('reads a nested record with no gated leaf stored as incomplete via anyOfIds', () => {
    const st = state({
      fulfilments: {
        [itemSelector.id]: { [entry1FulfilmentIndex]: 'selectorAlpha' }
      },
      obligations: implications([
        {
          id: itemGroup.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [entry1FulfilmentIndex]
          }
        },
        {
          id: nestedGroup.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [entry1Record1FulfilmentIndex]
          }
        },
        {
          id: itemSelector.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [entry1FulfilmentIndex]
          }
        },
        {
          id: nestedGatedFieldA.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [entry1Record1FulfilmentIndex]
          }
        },
        {
          id: nestedGatedFieldB.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [entry1Record1FulfilmentIndex]
          }
        }
      ])
    })
    expect(
      instanceComplete(nestedGroup, entry1Record1FulfilmentIndex, st)
    ).toBe(false)
  })

  it('reads a not-enumerated instance as vacuously complete', () => {
    // No records anywhere for entry2.record1 — outside the enumerated
    // set. No direct-child mandatory leaves under nestedCollection
    // either, so nothing blocks.
    const st = state({
      fulfilments: {},
      obligations: implications([
        {
          id: itemGroup.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [entry1FulfilmentIndex]
          }
        },
        {
          id: itemSelector.id,
          implication: { inScope: true, fulfilmentIndexes: [] }
        },
        {
          id: nestedGroup.id,
          implication: { inScope: true, fulfilmentIndexes: [] }
        },
        {
          id: nestedGatedFieldA.id,
          implication: { inScope: true, fulfilmentIndexes: [] }
        },
        {
          id: nestedGatedFieldB.id,
          implication: { inScope: true, fulfilmentIndexes: [] }
        }
      ])
    })
    expect(instanceComplete(nestedGroup, 'entry2.record1', st)).toBe(true)
  })

  it('does not block on out-of-scope leaves', () => {
    // itemSelector is out of scope — the direct-child requirement is
    // gated behind inScope, so the missing record is ignored.
    const st = state({
      fulfilments: {},
      obligations: implications([
        {
          id: itemGroup.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [entry1FulfilmentIndex]
          }
        },
        {
          id: itemSelector.id,
          implication: { inScope: false, fulfilmentIndexes: [] }
        },
        {
          id: nestedGroup.id,
          implication: { inScope: true, fulfilmentIndexes: [] }
        },
        {
          id: nestedGatedFieldA.id,
          implication: { inScope: true, fulfilmentIndexes: [] }
        },
        {
          id: nestedGatedFieldB.id,
          implication: { inScope: true, fulfilmentIndexes: [] }
        }
      ])
    })
    expect(instanceComplete(itemGroup, entry1FulfilmentIndex, st)).toBe(true)
  })
})
