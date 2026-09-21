import { describe, it, expect, beforeAll, afterAll } from 'vitest'

import { configureObligationSet } from './manifest.js'
import {
  ancestorChain,
  isGroup,
  leavesUnder,
  groupsFrom
} from './manifest-graph.js'

// Synthetic manifest — two-level nested collection with a scalar
// sibling, exercised without pulling in the installed set.

const itemGroup = { id: 'item-group', name: 'itemCollection' }
const nestedGroup = {
  id: 'nested-group',
  name: 'nestedCollection',
  within: itemGroup
}
const nestedGatedFieldA = {
  id: 'nested-gated-a',
  name: 'nestedGatedFieldA',
  within: nestedGroup
}
const itemSelector = {
  id: 'item-selector',
  name: 'itemSelector',
  within: itemGroup
}
const topLevelUnindexed = { id: 'branch-selector', name: 'branchSelector' }

const syntheticSet = {
  obligations: [
    itemGroup,
    nestedGroup,
    nestedGatedFieldA,
    itemSelector,
    topLevelUnindexed
  ],
  groups: [itemGroup, nestedGroup]
}

describe('#manifest-graph', () => {
  beforeAll(() => {
    configureObligationSet(syntheticSet)
  })

  afterAll(() => {
    configureObligationSet(undefined)
  })

  describe('#ancestorChain', () => {
    it('returns an empty chain for a top-level obligation', () => {
      expect(ancestorChain(topLevelUnindexed)).toEqual([])
    })

    it('returns the parent group for a direct child', () => {
      expect(ancestorChain(itemSelector)).toEqual([itemGroup])
    })

    it('returns root-to-parent order for a nested leaf', () => {
      expect(ancestorChain(nestedGatedFieldA)).toEqual([itemGroup, nestedGroup])
    })
  })

  describe('#isGroup', () => {
    it('is true for a group referenced by others via within', () => {
      expect(isGroup(itemGroup)).toBe(true)
      expect(isGroup(nestedGroup)).toBe(true)
    })

    it('is false for a leaf', () => {
      expect(isGroup(nestedGatedFieldA)).toBe(false)
      expect(isGroup(itemSelector)).toBe(false)
      expect(isGroup(topLevelUnindexed)).toBe(false)
    })
  })

  describe('#leavesUnder', () => {
    it('collects leaves at every depth beneath the group', () => {
      expect(leavesUnder(itemGroup)).toEqual([nestedGatedFieldA, itemSelector])
    })

    it('collects only leaves whose chain includes the given group', () => {
      expect(leavesUnder(nestedGroup)).toEqual([nestedGatedFieldA])
    })
  })

  describe('#groupsFrom', () => {
    it('includes the group itself plus every nested group', () => {
      expect(groupsFrom(itemGroup)).toEqual([itemGroup, nestedGroup])
    })

    it('includes only the group itself when nothing nests beneath it', () => {
      expect(groupsFrom(nestedGroup)).toEqual([nestedGroup])
    })
  })
})
