/**
 * SYNTHETIC FIXTURE — owned by the tests, NOT journey content.
 *
 * This is the obligation manifest the engine's own tests run against. It
 * describes no journey, no industry and no product: every name says what
 * the thing IS to the engine (a scalar, a gate, a composite block, a
 * collection) rather than what it would mean to a user.
 *
 * Why it exists
 * -------------
 * The L2 obligation model and the engine above it are journey-agnostic —
 * they evaluate whatever set is configured. Wiring their tests to the
 * installed set (`src/server/app/sets/…`) makes those tests fail whenever
 * the set is empty, and couples generic behaviour to whichever journey
 * happens to be shipping. The tests configure this fixture instead, so
 * the engine suite is stable no matter what the real set declares.
 *
 * Nothing here may be treated as a requirement, an example of real
 * content, or a starting point for a journey. Requirements for the
 * installed set are anchored by the product owner, elsewhere.
 *
 * The shapes covered
 * ------------------
 *   plain scalar                    `scalarField`, `optionalScalarField`
 *   composite (opaque object) leaf  `compositeBlockOne`…`compositeBlockSix`
 *   equality gate, purge on flip    `branchAField`, `branchDField`
 *   inclusion gate, purge on flip   `branchBCField`, `branchBDField`
 *   equality gate, status flip only `statusFlipField` (value retained)
 *   mutually exclusive blocks       `variantOneBlock` / `variantTwoBlock`
 *   array-valued gated field        `modeGatedList`
 *   aggregate gate over a
 *     collection (`anyAllowListed`)  `aggregateGatedField`,
 *                                    `aggregateGatedToggle`
 *   collection with a floor          `itemCollection` (`minEntries`)
 *   same-level allowlist gate        `itemGatedField`
 *   nested collection inside a
 *     collection                     `nestedCollection`
 *   per-instance any-of invariant    `nestedCollection.requires.anyOfIds`
 *   record-count invariant           `nestedCollection.requires.fulfilmentIndexCountEquals`
 *   projected allowlist gate at
 *     depth 2                        `nestedGatedFieldA`…`nestedGatedFieldD`
 *   projected complement gate        `nestedFallbackFieldA` / `…B`
 *   collection with a manifest cap   `boundedCollection` (`maxEntries`)
 *   system-populated, page-less      `systemPopulatedField`
 *
 * Two further shapes live outside this file:
 *   value-linked write cap          `MAX_ENTRIES_FROM` in `./index.js`
 *   flow-only key (never a
 *     manifest obligation)          `flowOnlyKey` in `./flow.js`
 *
 * Invariant this fixture keeps deliberately: for every obligation the
 * exported binding name, the `name` property, the fulfilment binding
 * field and the stored answer key are all the SAME string. Real sets are
 * free to diverge; keeping them aligned here makes the fixture mechanical
 * to read and to apply across the suite.
 */

import {
  allowListed,
  anyAllowListed,
  equalsGate,
  includesGate,
  notInUnionOf
} from '../../src/server/app/model/obligations/helpers/index.js'
import {
  aggregateGatedFieldSelectors,
  aggregateGatedToggleSelectors,
  itemGatedFieldSelectors,
  nestedCompositeBlockSelectors,
  nestedGatedFieldASelectors,
  nestedGatedFieldBSelectors,
  nestedGatedFieldCSelectors,
  nestedGatedFieldDSelectors,
  typedNestedSelectorLists
} from './reference.js'
import {
  BRANCH_A,
  BRANCH_B,
  BRANCH_C,
  BRANCH_D,
  MODE_ALPHA,
  MODE_BRAVO,
  TOGGLE_YES,
  VARIANT_ONE,
  VARIANT_TWO
} from './values.js'

const MANDATORY = { inScope: true, status: 'mandatory' }
const OPTIONAL = { inScope: true, status: 'optional' }
const OUT_OF_SCOPE = { inScope: false }

const reason = (code) => ({
  code,
  explanation: `fixture reason: ${code}`
})

const mandatoryBecause = (code) => ({
  ...MANDATORY,
  reasons: [reason(code)]
})

// ---------------------------------------------------------------------------
// System-populated — declared, never presented by a page.
// ---------------------------------------------------------------------------

export const systemPopulatedField = {
  id: 'fac70000-0000-4000-8000-000000000001',
  name: 'systemPopulatedField',
  status: 'mandatory'
}

// ---------------------------------------------------------------------------
// Plain top-level scalars.
// ---------------------------------------------------------------------------

export const scalarField = {
  id: 'fac70000-0000-4000-8000-000000000002',
  name: 'scalarField',
  status: 'mandatory'
}

export const optionalScalarField = {
  id: 'fac70000-0000-4000-8000-000000000003',
  name: 'optionalScalarField',
  status: 'optional'
}

export const enumScalarField = {
  id: 'fac70000-0000-4000-8000-000000000004',
  name: 'enumScalarField',
  status: 'mandatory'
}

export const textFieldOne = {
  id: 'fac70000-0000-4000-8000-000000000005',
  name: 'textFieldOne',
  status: 'mandatory'
}

export const textFieldTwo = {
  id: 'fac70000-0000-4000-8000-000000000006',
  name: 'textFieldTwo',
  status: 'mandatory'
}

export const dateField = {
  id: 'fac70000-0000-4000-8000-000000000007',
  name: 'dateField',
  status: 'mandatory'
}

export const lookupField = {
  id: 'fac70000-0000-4000-8000-000000000008',
  name: 'lookupField',
  status: 'mandatory'
}

// ---------------------------------------------------------------------------
// Status-flip gate — always in scope, mandate flips, stored value retained
// across a flip.
// ---------------------------------------------------------------------------

export const statusToggle = {
  id: 'fac70000-0000-4000-8000-000000000009',
  name: 'statusToggle',
  status: 'mandatory'
}

export const statusFlipField = {
  id: 'fac70000-0000-4000-8000-00000000000a',
  name: 'statusFlipField',
  applyTo: equalsGate(
    statusToggle,
    TOGGLE_YES,
    mandatoryBecause('fixture.statusFlipField.mandatory.becauseToggleYes'),
    OPTIONAL
  )
}

// ---------------------------------------------------------------------------
// Branch gate — one selector, four dependants, two gate shapes. Every
// dependant is purged on a flip that puts it out of scope.
// ---------------------------------------------------------------------------

export const branchSelector = {
  id: 'fac70000-0000-4000-8000-00000000000b',
  name: 'branchSelector',
  status: 'mandatory'
}

export const branchAField = {
  id: 'fac70000-0000-4000-8000-00000000000c',
  name: 'branchAField',
  applyTo: equalsGate(
    branchSelector,
    BRANCH_A,
    mandatoryBecause('fixture.branchAField.applicable.becauseBranchA'),
    OUT_OF_SCOPE
  )
}

export const branchBCField = {
  id: 'fac70000-0000-4000-8000-00000000000d',
  name: 'branchBCField',
  applyTo: includesGate(
    branchSelector,
    [BRANCH_B, BRANCH_C],
    mandatoryBecause('fixture.branchBCField.applicable.becauseBranchBOrC'),
    OUT_OF_SCOPE
  )
}

export const branchBDField = {
  id: 'fac70000-0000-4000-8000-00000000000e',
  name: 'branchBDField',
  applyTo: includesGate(
    branchSelector,
    [BRANCH_B, BRANCH_D],
    mandatoryBecause('fixture.branchBDField.applicable.becauseBranchBOrD'),
    OUT_OF_SCOPE
  )
}

export const branchDField = {
  id: 'fac70000-0000-4000-8000-00000000000f',
  name: 'branchDField',
  applyTo: equalsGate(
    branchSelector,
    BRANCH_D,
    mandatoryBecause('fixture.branchDField.applicable.becauseBranchD'),
    OUT_OF_SCOPE
  )
}

// ---------------------------------------------------------------------------
// Composite blocks — single-cardinality obligations whose stored value is
// an opaque object. Six identical shapes so a test can vary one without
// disturbing the others.
// ---------------------------------------------------------------------------

export const compositeBlockOne = {
  id: 'fac70000-0000-4000-8000-000000000010',
  name: 'compositeBlockOne',
  status: 'mandatory'
}

export const compositeBlockTwo = {
  id: 'fac70000-0000-4000-8000-000000000011',
  name: 'compositeBlockTwo',
  status: 'mandatory'
}

export const compositeBlockThree = {
  id: 'fac70000-0000-4000-8000-000000000012',
  name: 'compositeBlockThree',
  status: 'mandatory'
}

export const compositeBlockFour = {
  id: 'fac70000-0000-4000-8000-000000000013',
  name: 'compositeBlockFour',
  status: 'mandatory'
}

export const compositeBlockFive = {
  id: 'fac70000-0000-4000-8000-000000000014',
  name: 'compositeBlockFive',
  status: 'mandatory'
}

export const compositeBlockSix = {
  id: 'fac70000-0000-4000-8000-000000000015',
  name: 'compositeBlockSix',
  status: 'mandatory'
}

// ---------------------------------------------------------------------------
// Variant gate — two mutually exclusive composite blocks.
// ---------------------------------------------------------------------------

export const variantSelector = {
  id: 'fac70000-0000-4000-8000-000000000016',
  name: 'variantSelector',
  status: 'mandatory'
}

export const variantOneBlock = {
  id: 'fac70000-0000-4000-8000-000000000017',
  name: 'variantOneBlock',
  applyTo: equalsGate(
    variantSelector,
    VARIANT_ONE,
    mandatoryBecause('fixture.variantOneBlock.applicable.becauseVariantOne'),
    OUT_OF_SCOPE
  )
}

export const variantTwoBlock = {
  id: 'fac70000-0000-4000-8000-000000000018',
  name: 'variantTwoBlock',
  applyTo: equalsGate(
    variantSelector,
    VARIANT_TWO,
    mandatoryBecause('fixture.variantTwoBlock.applicable.becauseVariantTwo'),
    OUT_OF_SCOPE
  )
}

// ---------------------------------------------------------------------------
// Mode gate — an array-valued field, in scope only for some modes.
// ---------------------------------------------------------------------------

export const modeSelector = {
  id: 'fac70000-0000-4000-8000-000000000019',
  name: 'modeSelector',
  status: 'mandatory'
}

export const modeGatedList = {
  id: 'fac70000-0000-4000-8000-00000000001a',
  name: 'modeGatedList',
  applyTo: includesGate(
    modeSelector,
    [MODE_ALPHA, MODE_BRAVO],
    mandatoryBecause('fixture.modeGatedList.applicable.becauseListedMode'),
    OUT_OF_SCOPE
  )
}

// ---------------------------------------------------------------------------
// Collection — user-driven, floored at one entry. Instance ids are opaque
// to the model; the engine addresses entries positionally.
// ---------------------------------------------------------------------------

export const itemCollection = {
  id: 'fac70000-0000-4000-8000-00000000001b',
  name: 'itemCollection',
  requires: {
    minEntries: 1,
    errorCode: 'fixture.itemCollection.atLeastOne'
  }
}

export const itemSelector = {
  id: 'fac70000-0000-4000-8000-00000000001c',
  name: 'itemSelector',
  within: itemCollection,
  status: 'mandatory'
}

export const itemCategory = {
  id: 'fac70000-0000-4000-8000-00000000001d',
  name: 'itemCategory',
  within: itemCollection,
  status: 'mandatory'
}

export const itemTags = {
  id: 'fac70000-0000-4000-8000-00000000001e',
  name: 'itemTags',
  within: itemCollection,
  status: 'mandatory'
}

export const itemCount = {
  id: 'fac70000-0000-4000-8000-00000000001f',
  name: 'itemCount',
  within: itemCollection,
  status: 'mandatory'
}

// Same-level allowlist gate: gate and gated are both `within
// itemCollection`, so the projection group is null.
export const itemGatedField = {
  id: 'fac70000-0000-4000-8000-000000000020',
  name: 'itemGatedField',
  within: itemCollection,
  status: 'optional',
  applyTo: allowListed(itemSelector, itemGatedFieldSelectors, null, [
    reason('fixture.itemGatedField.applicable.becauseListedSelector')
  ])
}

// ---------------------------------------------------------------------------
// Nested collection — a collection inside a collection. Carries two
// per-instance invariants: at least one of its gated leaves filled, and a
// record count equal to the parent entry's `itemCount`.
//
// `anyOfIds` names ids as literals rather than object references so the
// declaration does not depend on member declaration order.
// ---------------------------------------------------------------------------

export const nestedCollection = {
  id: 'fac70000-0000-4000-8000-000000000021',
  name: 'nestedCollection',
  within: itemCollection,
  requires: {
    anyOfIds: [
      'fac70000-0000-4000-8000-000000000022', // nestedGatedFieldA
      'fac70000-0000-4000-8000-000000000023', // nestedGatedFieldB
      'fac70000-0000-4000-8000-000000000024', // nestedGatedFieldC
      'fac70000-0000-4000-8000-000000000025', // nestedGatedFieldD
      'fac70000-0000-4000-8000-000000000026', // nestedFallbackFieldA
      'fac70000-0000-4000-8000-000000000027' // nestedFallbackFieldB
    ],
    errorCode: 'fixture.nestedCollection.oneFieldRequired',
    fulfilmentIndexCountEquals: {
      fieldId: itemCount.id,
      errorCode: 'fixture.nestedCollection.countMustMatchItemCount'
    }
  }
}

const projectedGate = (values, code) =>
  allowListed(itemSelector, values, nestedCollection, [reason(code)])

export const nestedGatedFieldA = {
  id: 'fac70000-0000-4000-8000-000000000022',
  name: 'nestedGatedFieldA',
  within: nestedCollection,
  status: 'optional',
  applyTo: projectedGate(
    nestedGatedFieldASelectors,
    'fixture.nestedGatedFieldA.applicable.becauseSelectorAlpha'
  )
}

export const nestedGatedFieldB = {
  id: 'fac70000-0000-4000-8000-000000000023',
  name: 'nestedGatedFieldB',
  within: nestedCollection,
  status: 'optional',
  applyTo: projectedGate(
    nestedGatedFieldBSelectors,
    'fixture.nestedGatedFieldB.applicable.becauseSelectorBravo'
  )
}

export const nestedGatedFieldC = {
  id: 'fac70000-0000-4000-8000-000000000024',
  name: 'nestedGatedFieldC',
  within: nestedCollection,
  status: 'optional',
  applyTo: projectedGate(
    nestedGatedFieldCSelectors,
    'fixture.nestedGatedFieldC.applicable.becauseSelectorCharlie'
  )
}

export const nestedGatedFieldD = {
  id: 'fac70000-0000-4000-8000-000000000025',
  name: 'nestedGatedFieldD',
  within: nestedCollection,
  status: 'optional',
  applyTo: projectedGate(
    nestedGatedFieldDSelectors,
    'fixture.nestedGatedFieldD.applicable.becauseSelectorDelta'
  )
}

// Complement gate — in scope on entries whose selector is in NONE of the
// four typed allowlists. The union is derived, so widening a typed list
// narrows the fallback automatically.
const fallbackGate = (code) =>
  notInUnionOf(itemSelector, typedNestedSelectorLists, nestedCollection, [
    reason(code)
  ])

export const nestedFallbackFieldA = {
  id: 'fac70000-0000-4000-8000-000000000026',
  name: 'nestedFallbackFieldA',
  within: nestedCollection,
  status: 'optional',
  applyTo: fallbackGate(
    'fixture.nestedFallbackFieldA.applicable.becauseNoTypedSelector'
  )
}

export const nestedFallbackFieldB = {
  id: 'fac70000-0000-4000-8000-000000000027',
  name: 'nestedFallbackFieldB',
  within: nestedCollection,
  status: 'optional',
  applyTo: fallbackGate(
    'fixture.nestedFallbackFieldB.applicable.becauseNoTypedSelector'
  )
}

// A composite leaf inside the nested collection. Deliberately outside the
// `anyOfIds` set, so filling it alone does not satisfy the invariant.
export const nestedCompositeBlock = {
  id: 'fac70000-0000-4000-8000-000000000028',
  name: 'nestedCompositeBlock',
  within: nestedCollection,
  status: 'optional',
  applyTo: projectedGate(
    nestedCompositeBlockSelectors,
    'fixture.nestedCompositeBlock.applicable.becauseSelectorDelta'
  )
}

// ---------------------------------------------------------------------------
// Aggregate gates — top-level scalars whose scope is decided by ANY entry
// in `itemCollection`. Declared after `itemSelector` because the closures
// capture it.
// ---------------------------------------------------------------------------

export const aggregateGatedField = {
  id: 'fac70000-0000-4000-8000-000000000029',
  name: 'aggregateGatedField',
  applyTo: anyAllowListed(
    itemSelector,
    aggregateGatedFieldSelectors,
    mandatoryBecause(
      'fixture.aggregateGatedField.applicable.becauseAnyListedSelector'
    ),
    OUT_OF_SCOPE
  )
}

export const aggregateGatedToggle = {
  id: 'fac70000-0000-4000-8000-00000000002a',
  name: 'aggregateGatedToggle',
  applyTo: anyAllowListed(
    itemSelector,
    aggregateGatedToggleSelectors,
    mandatoryBecause(
      'fixture.aggregateGatedToggle.applicable.becauseAnyListedSelector'
    ),
    OUT_OF_SCOPE
  )
}

// ---------------------------------------------------------------------------
// Bounded collection — a top-level collection capped by a manifest
// invariant rather than by a sibling field's value.
// ---------------------------------------------------------------------------

export const boundedCollection = {
  id: 'fac70000-0000-4000-8000-00000000002b',
  name: 'boundedCollection',
  requires: {
    maxEntries: 10,
    maxEntriesErrorCode: 'fixture.boundedCollection.tooMany'
  }
}

export const boundedItemType = {
  id: 'fac70000-0000-4000-8000-00000000002c',
  name: 'boundedItemType',
  within: boundedCollection,
  status: 'mandatory'
}

export const boundedItemMode = {
  id: 'fac70000-0000-4000-8000-00000000002d',
  name: 'boundedItemMode',
  within: boundedCollection,
  status: 'mandatory'
}

export const boundedItemReference = {
  id: 'fac70000-0000-4000-8000-00000000002e',
  name: 'boundedItemReference',
  within: boundedCollection,
  status: 'mandatory'
}

export const boundedItemDate = {
  id: 'fac70000-0000-4000-8000-00000000002f',
  name: 'boundedItemDate',
  within: boundedCollection,
  status: 'mandatory'
}

export const boundedItemUploadId = {
  id: 'fac70000-0000-4000-8000-000000000030',
  name: 'boundedItemUploadId',
  within: boundedCollection,
  status: 'optional'
}

export const boundedItemFilename = {
  id: 'fac70000-0000-4000-8000-000000000031',
  name: 'boundedItemFilename',
  within: boundedCollection,
  status: 'optional'
}

// ---------------------------------------------------------------------------
// Manifest — order does not affect evaluation; the evaluator builds the
// group hierarchy from `within` back-references.
// ---------------------------------------------------------------------------

export const obligations = [
  systemPopulatedField,
  scalarField,
  optionalScalarField,
  enumScalarField,
  textFieldOne,
  textFieldTwo,
  dateField,
  lookupField,
  statusToggle,
  statusFlipField,
  branchSelector,
  branchAField,
  branchBCField,
  branchBDField,
  branchDField,
  compositeBlockOne,
  compositeBlockTwo,
  compositeBlockThree,
  compositeBlockFour,
  compositeBlockFive,
  compositeBlockSix,
  variantSelector,
  variantOneBlock,
  variantTwoBlock,
  modeSelector,
  modeGatedList,
  itemCollection,
  itemSelector,
  itemCategory,
  itemTags,
  itemCount,
  itemGatedField,
  nestedCollection,
  nestedGatedFieldA,
  nestedGatedFieldB,
  nestedGatedFieldC,
  nestedGatedFieldD,
  nestedFallbackFieldA,
  nestedFallbackFieldB,
  nestedCompositeBlock,
  aggregateGatedField,
  aggregateGatedToggle,
  boundedCollection,
  boundedItemType,
  boundedItemMode,
  boundedItemReference,
  boundedItemDate,
  boundedItemUploadId,
  boundedItemFilename
]

export const groups = obligations.filter((obligation) =>
  obligations.some((other) => other.within === obligation)
)

// Container back-refs for `requires.allOrNothingOfIds` carriers. The
// fixture declares none today; the loop is the general primitive, kept so
// adding a carrier is a one-line change rather than a wiring exercise.
const attachContainerBackRef = (member, container) => {
  if (!member) {
    return
  }
  const existing = member.containers ?? []
  if (
    existing.some((existingContainer) => existingContainer.id === container.id)
  ) {
    return
  }
  member.containers = existing.concat(container)
}

for (const container of obligations) {
  if (!container?.requires?.allOrNothingOfIds) {
    continue
  }
  for (const memberId of container.requires.allOrNothingOfIds) {
    attachContainerBackRef(
      obligations.find((candidate) => candidate.id === memberId),
      container
    )
  }
}
