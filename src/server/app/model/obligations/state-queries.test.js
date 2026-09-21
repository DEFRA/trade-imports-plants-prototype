import { describe, it, expect } from 'vitest'

import { allowListed } from './helpers/index.js'

import { groupInvariantErrors, leafSatisfied } from './state-queries.js'

// Synthetic obligations — the queries can be exercised in isolation,
// without the parent obligations manifest or evaluator.

const entry1Record1FulfilmentIndex = 'entry1.record1'
const entry1Record2FulfilmentIndex = 'entry1.record2'
const itemCollectionFloorErrorCode = 'obligation.itemCollection.atLeastOne'

// Convenience: build a state as the ObligationEvaluator would.
function state({ fulfilments = {}, obligations = {} } = {}) {
  return { fulfilments, obligations }
}

// Minimal implication builder: mimics what ObligationEvaluator returns
// for a given set of in-scope obligations + fulfilments.
function implications(entries) {
  return Object.fromEntries(
    entries.map((entry) => [entry.obligation.id, entry.implication])
  )
}

describe('groupInvariantErrors (requires.anyOf)', () => {
  // Depth-2 fan-out — every nested record must carry ≥ 1 filled leaf.
  // Mirrors the shape used by nestedCollection.requires in obligations.js.
  const nestedCollection = { id: 'nested-group', name: 'nestedCollection' }
  const nestedGatedFieldA = { id: 'nested-gated-a', name: 'nestedGatedFieldA' }
  const nestedGatedFieldB = { id: 'nested-gated-b', name: 'nestedGatedFieldB' }

  // Group carries the invariant.
  const groupWithRequires = {
    ...nestedCollection,
    requires: {
      anyOfIds: [nestedGatedFieldA.id, nestedGatedFieldB.id],
      errorCode: 'obligation.nestedCollection.oneFieldRequired'
    }
  }

  it('empty list when no group carries `requires`', () => {
    const groupNoRequires = { ...nestedCollection }
    const st = state({
      obligations: implications([
        {
          obligation: nestedCollection,
          implication: {
            inScope: true,
            fulfilmentIndexes: [entry1Record1FulfilmentIndex]
          }
        }
      ])
    })
    expect(groupInvariantErrors(groupNoRequires, st)).toEqual([])
  })

  it('empty list when the group is out of scope', () => {
    const st = state({
      obligations: implications([
        { obligation: nestedCollection, implication: { inScope: false } }
      ])
    })
    expect(groupInvariantErrors(groupWithRequires, st)).toEqual([])
  })

  it('empty list when no `requires.anyOf` leaf is in scope for this instance', () => {
    // A record whose parent selector opens NEITHER nestedGatedFieldA nor
    // nestedGatedFieldB has nothing to satisfy; treat as vacuous.
    const st = state({
      obligations: implications([
        {
          obligation: nestedCollection,
          implication: {
            inScope: true,
            fulfilmentIndexes: [entry1Record1FulfilmentIndex]
          }
        },
        { obligation: nestedGatedFieldA, implication: { inScope: false } },
        { obligation: nestedGatedFieldB, implication: { inScope: false } }
      ])
    })
    expect(groupInvariantErrors(groupWithRequires, st)).toEqual([])
  })

  it('one error per in-scope instance with all required leaves blank', () => {
    const st = state({
      // Two in-scope records on entry1; neither has a nestedGatedFieldA
      // or nestedGatedFieldB filled.
      obligations: implications([
        {
          obligation: nestedCollection,
          implication: {
            inScope: true,
            fulfilmentIndexes: [
              entry1Record1FulfilmentIndex,
              entry1Record2FulfilmentIndex
            ]
          }
        },
        {
          obligation: nestedGatedFieldA,
          implication: {
            inScope: true,
            status: 'optional',
            fulfilmentIndexes: [
              entry1Record1FulfilmentIndex,
              entry1Record2FulfilmentIndex
            ]
          }
        },
        {
          obligation: nestedGatedFieldB,
          implication: {
            inScope: true,
            status: 'optional',
            fulfilmentIndexes: [
              entry1Record1FulfilmentIndex,
              entry1Record2FulfilmentIndex
            ]
          }
        }
      ])
    })
    const errors = groupInvariantErrors(groupWithRequires, st)
    expect(errors).toHaveLength(2)
    expect(errors[0]).toEqual({
      code: 'obligation.nestedCollection.oneFieldRequired',
      groupId: nestedCollection.id,
      groupName: 'nestedCollection',
      fulfilmentIndex: entry1Record1FulfilmentIndex
    })
    expect(errors[1].fulfilmentIndex).toBe(entry1Record2FulfilmentIndex)
  })

  it('no error when at least one required leaf is filled', () => {
    const st = state({
      fulfilments: {
        [nestedGatedFieldA.id]: { [entry1Record1FulfilmentIndex]: 'valueOne' }
      },
      obligations: implications([
        {
          obligation: nestedCollection,
          implication: {
            inScope: true,
            fulfilmentIndexes: [entry1Record1FulfilmentIndex]
          }
        },
        {
          obligation: nestedGatedFieldA,
          implication: {
            inScope: true,
            status: 'optional',
            fulfilmentIndexes: [entry1Record1FulfilmentIndex]
          }
        },
        {
          obligation: nestedGatedFieldB,
          implication: {
            inScope: true,
            status: 'optional',
            fulfilmentIndexes: [entry1Record1FulfilmentIndex]
          }
        }
      ])
    })
    expect(groupInvariantErrors(groupWithRequires, st)).toEqual([])
  })

  it('treats an all-blank composite value as unfilled (uses isBlankValue)', () => {
    // A composite block value with all-empty parts must not "satisfy"
    // the invariant.
    const st = state({
      fulfilments: {
        [nestedGatedFieldA.id]: {
          [entry1Record1FulfilmentIndex]: {
            partOne: '',
            partTwo: '',
            partThree: '',
            partFour: ''
          }
        }
      },
      obligations: implications([
        {
          obligation: nestedCollection,
          implication: {
            inScope: true,
            fulfilmentIndexes: [entry1Record1FulfilmentIndex]
          }
        },
        {
          obligation: nestedGatedFieldA,
          implication: {
            inScope: true,
            status: 'optional',
            fulfilmentIndexes: [entry1Record1FulfilmentIndex]
          }
        }
      ])
    })
    expect(groupInvariantErrors(groupWithRequires, st)).toHaveLength(1)
  })
})

describe('groupInvariantErrors — `requires.minEntries` collection floor', () => {
  // A group carrying a `minEntries` floor emits one collection-scoped
  // error when fulfilmentIndexes.length is below the floor, so an empty
  // collection is not vacuously satisfied.
  //
  // The floor is orthogonal to `requires.anyOf` (the per-instance rule):
  // a group may carry either, both, or neither. Errors from the two
  // rules coexist in the same list; consumers count them uniformly.
  const itemCollectionGroup = { id: 'item-collection', name: 'itemCollection' }

  const groupWithFloor = {
    ...itemCollectionGroup,
    requires: {
      minEntries: 1,
      errorCode: itemCollectionFloorErrorCode
    }
  }

  it('emits one collection-scoped MIN_ENTRIES error when fulfilmentIndexes.length is below the floor', () => {
    const st = state({
      obligations: implications([
        {
          obligation: itemCollectionGroup,
          implication: { inScope: true, fulfilmentIndexes: [] }
        }
      ])
    })
    expect(groupInvariantErrors(groupWithFloor, st)).toEqual([
      {
        code: 'MIN_ENTRIES',
        groupId: itemCollectionGroup.id,
        groupName: 'itemCollection',
        errorCode: itemCollectionFloorErrorCode,
        minEntries: 1,
        actual: 0
      }
    ])
  })

  it('emits no floor error when fulfilmentIndexes.length meets the floor', () => {
    const st = state({
      obligations: implications([
        {
          obligation: itemCollectionGroup,
          implication: { inScope: true, fulfilmentIndexes: ['entry1'] }
        }
      ])
    })
    expect(groupInvariantErrors(groupWithFloor, st)).toEqual([])
  })

  it('emits no floor error when the group is out of scope', () => {
    // A group whose `applyTo` returns inScope:false is not applicable
    // at all, so the floor doesn't apply either. Symmetric with the
    // `anyOf` early-return.
    const st = state({
      obligations: implications([
        {
          obligation: itemCollectionGroup,
          implication: { inScope: false }
        }
      ])
    })
    expect(groupInvariantErrors(groupWithFloor, st)).toEqual([])
  })

  it('composes with `requires.anyOf` — both a floor error and per-instance errors surface', () => {
    // A group carrying both a floor and an anyOf: with fewer
    // fulfilmentIndexes than the floor AND unfilled leaves on each
    // present instance, the two rules must co-emit. Here minEntries=2 but
    // only 1 fulfilmentIndex exists — expect one MIN_ENTRIES error plus
    // one anyOf error on the unfilled instance.
    const leafObl = { id: 'leaf', name: 'leaf' }
    const composite = {
      ...itemCollectionGroup,
      requires: {
        minEntries: 2,
        anyOfIds: [leafObl.id],
        errorCode: itemCollectionFloorErrorCode
      }
    }
    const st = state({
      obligations: implications([
        {
          obligation: itemCollectionGroup,
          implication: { inScope: true, fulfilmentIndexes: ['entry1'] }
        },
        {
          obligation: leafObl,
          implication: {
            inScope: true,
            status: 'optional',
            fulfilmentIndexes: ['entry1']
          }
        }
      ])
    })
    const errors = groupInvariantErrors(composite, st)
    expect(errors).toHaveLength(2)
    expect(errors.some((e) => e.code === 'MIN_ENTRIES')).toBe(true)
    expect(errors.some((e) => e.fulfilmentIndex === 'entry1')).toBe(true)
  })
})

describe('#leafSatisfied', () => {
  const leaf = { id: 'nested-gated-a', name: 'nestedGatedFieldA' }

  it('returns true when the stored value at the fulfilmentIndex is non-blank', () => {
    const st = state({
      fulfilments: { [leaf.id]: { [entry1Record1FulfilmentIndex]: 'valueOne' } }
    })
    expect(leafSatisfied(leaf, entry1Record1FulfilmentIndex, st)).toBe(true)
  })

  it('returns false when the stored value at the fulfilmentIndex is blank', () => {
    const st = state({
      fulfilments: { [leaf.id]: { [entry1Record1FulfilmentIndex]: '' } }
    })
    expect(leafSatisfied(leaf, entry1Record1FulfilmentIndex, st)).toBe(false)
  })

  it('returns false when the fulfilmentIndex has no stored value', () => {
    const st = state({ fulfilments: { [leaf.id]: {} } })
    expect(leafSatisfied(leaf, entry1Record1FulfilmentIndex, st)).toBe(false)
  })

  it('returns false when the obligation has no storage entry at all', () => {
    const st = state({ fulfilments: {} })
    expect(leafSatisfied(leaf, entry1Record1FulfilmentIndex, st)).toBe(false)
  })

  it('returns false when the storage entry is a scalar (not a records map)', () => {
    // Top-level scalars store a value directly; leafSatisfied is defined only
    // for grouped leaves, so a scalar storage shape reads as false.
    const scalar = {
      id: 'branch-a-field',
      name: 'branchAField'
    }
    const st = state({ fulfilments: { [scalar.id]: 'valueOne' } })
    expect(leafSatisfied(scalar, entry1Record1FulfilmentIndex, st)).toBe(false)
  })
})

describe('groupInvariantErrors — `requires.allOrNothingOfIds` unindexed field-block', () => {
  // A field-block invariant over three sibling unindexed obligations —
  // whichever container the manifest attaches it to. The rule fires once
  // for the whole group when the block is partially filled; it stays
  // silent when the block is fully blank or fully filled.
  const container = { id: 'composite-block', name: 'compositeBlock' }
  const partOneId = 'partOne'
  const partTwoId = 'partTwo'
  const partThreeId = 'partThree'
  const errorCode = 'fixture.compositeBlock.allOrNothing'

  const blockValue = 'value one'

  const groupWithBlock = {
    ...container,
    requires: {
      allOrNothingOfIds: [partOneId, partTwoId, partThreeId],
      errorCode
    }
  }

  const inScopeGroupState = (fulfilments) =>
    state({
      fulfilments,
      obligations: implications([
        {
          obligation: container,
          implication: { inScope: true, fulfilmentIndexes: [] }
        }
      ])
    })

  it('emits no error when every member of the block is blank (nothing filled)', () => {
    expect(groupInvariantErrors(groupWithBlock, inScopeGroupState({}))).toEqual(
      []
    )
  })

  it('emits no error when every member of the block is filled (all filled)', () => {
    const st = inScopeGroupState({
      [partOneId]: blockValue,
      [partTwoId]: 'Bristol',
      [partThreeId]: 'BS1 1AA'
    })
    expect(groupInvariantErrors(groupWithBlock, st)).toEqual([])
  })

  it('emits exactly one error naming every missing member id when partially filled', () => {
    // partTwo blank string, partThree missing entirely — both count as blank.
    const st = inScopeGroupState({
      [partOneId]: blockValue,
      [partTwoId]: ''
    })
    expect(groupInvariantErrors(groupWithBlock, st)).toEqual([
      {
        code: errorCode,
        groupId: container.id,
        groupName: container.name,
        missingIds: [partTwoId, partThreeId]
      }
    ])
  })

  it('composes with anyOf on the same group without interfering', () => {
    // A group that has both an anyOfIds rule (unused because no fulfilmentIndexes
    // in scope) and an allOrNothing rule — allOrNothing still fires.
    const combined = {
      ...container,
      requires: {
        allOrNothingOfIds: [partOneId, partTwoId, partThreeId],
        anyOfIds: ['someLeaf'],
        errorCode
      }
    }
    const st = inScopeGroupState({
      [partOneId]: blockValue
    })
    const errors = groupInvariantErrors(combined, st)
    expect(errors).toHaveLength(1)
    expect(errors[0].code).toBe(errorCode)
    expect(errors[0].missingIds).toEqual([partTwoId, partThreeId])
  })
})

describe('count invariant parent applicability', () => {
  const COUNT_MISMATCH = 'fixture.countMismatch'
  const parent = { id: 'parent', name: 'parent' }
  const selector = { id: 'selector', within: parent }
  const count = { id: 'count', within: parent }
  const group = {
    id: 'children',
    name: 'children',
    within: parent,
    requires: {
      fulfilmentIndexCountEquals: {
        fieldId: count.id,
        errorCode: COUNT_MISMATCH,
        applyToParent: allowListed(selector, ['listed'], null)
      }
    }
  }
  const snapshot = (value) => ({
    fulfilments: { selector: { entry1: value }, count: { entry1: 2 } },
    obligations: {
      parent: { inScope: true, fulfilmentIndexes: ['entry1'] },
      children: { inScope: true, fulfilmentIndexes: [] }
    }
  })

  it('requires children for an admitted parent with no child fulfilments', () => {
    expect(groupInvariantErrors(group, snapshot('listed'))).toEqual([
      {
        code: COUNT_MISMATCH,
        groupId: group.id,
        groupName: group.name,
        fulfilmentIndex: 'entry1',
        expected: 2,
        actual: 0
      }
    ])
  })

  it('asks nothing of a parent excluded by the count gate', () => {
    expect(groupInvariantErrors(group, snapshot('unlisted'))).toEqual([])
  })

  it('retains the unconditional count contract when no parent gate is supplied', () => {
    const unconditional = {
      ...group,
      requires: {
        fulfilmentIndexCountEquals: {
          fieldId: count.id,
          errorCode: COUNT_MISMATCH
        }
      }
    }
    expect(
      groupInvariantErrors(unconditional, snapshot('unlisted'))
    ).toHaveLength(1)
  })
})
