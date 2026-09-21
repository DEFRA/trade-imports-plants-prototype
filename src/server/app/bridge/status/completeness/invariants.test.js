import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { configureObligationSet } from '../../../model/obligations/manifest.js'
import {
  allowListed,
  equalsGate
} from '../../../model/obligations/helpers/index.js'
import { emptyCollectionSatisfiesFloor } from './invariants.js'

const LISTED_SELECTOR = 'selector-a'
const UNLISTED_SELECTOR = 'selector-c'

// Synthetic manifest — a collection entry holding a nested group whose
// floor is an `anyOfIds` rule, so the floor can be exercised without pulling
// in the installed set.

const line = { id: 'item-group', name: 'itemCollection' }

const itemSelector = {
  id: 'item-selector',
  name: 'itemSelector',
  within: line,
  status: 'mandatory'
}

// The shape the identifier leaves really carry: an allowlist read of the
// entry's selector, fanned onto the nested group.
const allowListedLeaf = {
  id: 'allow-listed-leaf',
  name: 'allowListedLeaf',
  status: 'optional',
  applyTo: allowListed(itemSelector, [LISTED_SELECTOR], { id: 'nested-group' })
}

// A shape `gateAdmits` cannot read: no `values`, no gated parent group.
const equalsGateLeaf = {
  id: 'equals-gate-leaf',
  name: 'equalsGateLeaf',
  status: 'optional',
  applyTo: equalsGate(
    itemSelector,
    LISTED_SELECTOR,
    { inScope: true },
    { inScope: false }
  )
}

// An allowlist gate fanned onto some other group: read against this group's
// parent index it would be answering a different question.
const fannedElsewhereLeaf = {
  id: 'elsewhere-leaf',
  name: 'elsewhereLeaf',
  status: 'optional',
  applyTo: allowListed(itemSelector, [LISTED_SELECTOR], { id: 'other-group' })
}

const nestedGroupWith = (anyOfIds) => ({
  id: 'nested-group',
  name: 'nestedCollection',
  within: line,
  requires: { anyOfIds, errorCode: 'unit.identifierRequired' }
})

const collection = { requiredAtLeastOne: true }

const ENTRY_1 = 'entry1'

const stateWithSelector = (value) => ({
  fulfilments: { [itemSelector.id]: { [ENTRY_1]: value } }
})

describe('#emptyCollectionSatisfiesFloor', () => {
  beforeAll(() => {
    configureObligationSet({
      obligations: [
        itemSelector,
        allowListedLeaf,
        equalsGateLeaf,
        fannedElsewhereLeaf
      ],
      groups: [line]
    })
  })

  afterAll(() => {
    configureObligationSet(undefined)
  })

  it('Should hold the floor open where the collection asks for no entry at all', () => {
    expect(
      emptyCollectionSatisfiesFloor(
        { requiredAtLeastOne: false },
        nestedGroupWith([allowListedLeaf.id]),
        ENTRY_1,
        stateWithSelector(LISTED_SELECTOR)
      )
    ).toBe(true)
  })

  it('Should bite where a readable gate admits the parent — the line is asked for a record', () => {
    expect(
      emptyCollectionSatisfiesFloor(
        collection,
        nestedGroupWith([allowListedLeaf.id]),
        ENTRY_1,
        stateWithSelector(LISTED_SELECTOR)
      )
    ).toBe(false)
  })

  it('Should go vacuous where a readable gate admits nothing on this parent', () => {
    expect(
      emptyCollectionSatisfiesFloor(
        collection,
        nestedGroupWith([allowListedLeaf.id]),
        ENTRY_1,
        stateWithSelector(UNLISTED_SELECTOR)
      )
    ).toBe(true)
  })

  // `gateAdmits` reads `metadata.values`, which only the allowlist shapes
  // define. Judged by that alone an equals/present/includes/branched gate
  // looks like a leaf that can never apply, and the mandatory floor would
  // silently go vacuous — an empty collection reported satisfied and the
  // notification submittable. A shape this helper cannot read must keep the
  // floor biting instead.
  it('Should keep the floor biting for a leaf gated by a shape it cannot read', () => {
    expect(
      emptyCollectionSatisfiesFloor(
        collection,
        nestedGroupWith([equalsGateLeaf.id]),
        ENTRY_1,
        stateWithSelector(UNLISTED_SELECTOR)
      )
    ).toBe(false)
  })

  // The same guard covers a gate fanned onto some other group.
  it('Should keep the floor biting for a gate fanned onto a different group', () => {
    expect(
      emptyCollectionSatisfiesFloor(
        collection,
        nestedGroupWith([fannedElsewhereLeaf.id]),
        ENTRY_1,
        stateWithSelector(UNLISTED_SELECTOR)
      )
    ).toBe(false)
  })
})
