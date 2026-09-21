import { describe, it, expect, beforeEach } from 'vitest'
import { createObligationEvaluator } from './evaluator.js'
import { groupInvariantErrors } from './state-queries.js'
import { obligationSet } from './manifest.js'
import {
  BOUNDED_MODE_ONE,
  BOUNDED_TYPE_ONE,
  BRANCH_A,
  BRANCH_B,
  CATEGORY_ONE,
  compositeBlockValue,
  dateValue,
  MODE_ALPHA,
  MODE_BRAVO,
  MODE_CHARLIE,
  SELECTOR_ALPHA,
  SELECTOR_BRAVO,
  SELECTOR_CHARLIE,
  SELECTOR_DELTA,
  SELECTOR_ECHO,
  TAG_ONE,
  TAG_TWO,
  TOGGLE_NO,
  TOGGLE_YES,
  VALUE_ONE,
  VALUE_TWO,
  VARIANT_ONE,
  VARIANT_TWO
} from '../../../../../test/fixtures/index.js'

const {
  systemPopulatedField,
  scalarField,
  statusToggle,
  statusFlipField,
  branchSelector,
  branchAField,
  compositeBlockOne,
  compositeBlockTwo,
  compositeBlockThree,
  compositeBlockFour,
  compositeBlockFive,
  variantSelector,
  variantOneBlock,
  variantTwoBlock,
  modeSelector,
  textFieldOne,
  textFieldTwo,
  modeGatedList,
  dateField,
  lookupField,
  compositeBlockSix,
  optionalScalarField,
  enumScalarField,
  itemCollection,
  itemSelector,
  itemCategory,
  itemTags,
  itemCount,
  itemGatedField,
  aggregateGatedField,
  nestedCollection,
  nestedGatedFieldB,
  nestedGatedFieldD,
  nestedGatedFieldA,
  nestedGatedFieldC,
  nestedFallbackFieldA,
  nestedFallbackFieldB,
  nestedCompositeBlock,
  boundedCollection,
  boundedItemType,
  boundedItemMode,
  boundedItemReference,
  boundedItemDate,
  boundedItemUploadId,
  boundedItemFilename
} = obligationSet()

let evaluator
beforeEach(() => {
  evaluator = createObligationEvaluator()
})

const mandatory = { inScope: true, status: 'mandatory' }
const optional = { inScope: true, status: 'optional' }
const outOfScope = { inScope: false }

const outOfScopeWhenNoEntriesTitle =
  'is out of scope when no collection entries exist'

// The fixture set builds every reason the same way, so the tests can
// rebuild one from its code alone.
const fixtureReason = (code) => ({
  code,
  explanation: `fixture reason: ${code}`
})

const statusFlipFieldReason = fixtureReason(
  'fixture.statusFlipField.mandatory.becauseToggleYes'
)
const branchAFieldReason = fixtureReason(
  'fixture.branchAField.applicable.becauseBranchA'
)
const variantOneBlockReason = fixtureReason(
  'fixture.variantOneBlock.applicable.becauseVariantOne'
)
const variantTwoBlockReason = fixtureReason(
  'fixture.variantTwoBlock.applicable.becauseVariantTwo'
)
const modeGatedListReason = fixtureReason(
  'fixture.modeGatedList.applicable.becauseListedMode'
)
const itemGatedFieldReason = fixtureReason(
  'fixture.itemGatedField.applicable.becauseListedSelector'
)
const aggregateGatedFieldReason = fixtureReason(
  'fixture.aggregateGatedField.applicable.becauseAnyListedSelector'
)
const nestedGatedFieldAReason = fixtureReason(
  'fixture.nestedGatedFieldA.applicable.becauseSelectorAlpha'
)
const nestedGatedFieldBReason = fixtureReason(
  'fixture.nestedGatedFieldB.applicable.becauseSelectorBravo'
)
const nestedGatedFieldCReason = fixtureReason(
  'fixture.nestedGatedFieldC.applicable.becauseSelectorCharlie'
)
const nestedGatedFieldDReason = fixtureReason(
  'fixture.nestedGatedFieldD.applicable.becauseSelectorDelta'
)
const nestedFallbackFieldAReason = fixtureReason(
  'fixture.nestedFallbackFieldA.applicable.becauseNoTypedSelector'
)
const nestedCompositeBlockReason = fixtureReason(
  'fixture.nestedCompositeBlock.applicable.becauseSelectorDelta'
)

// Entry-instance-id mnemonics. Real orchestrator-generated ids are
// opaque ULIDs; the tests use readable constants named after the
// `itemSelector` value each entry carries, so intent is scannable.
const ENTRY_ALPHA = 'entry1' //   SELECTOR_ALPHA
const ENTRY_ALPHA_TWO = 'entry2' // a second SELECTOR_ALPHA entry
const ENTRY_BRAVO = 'entry3' //   SELECTOR_BRAVO
const ENTRY_CHARLIE = 'entry4' // SELECTOR_CHARLIE
const ENTRY_DELTA = 'entry5' //   SELECTOR_DELTA
const ENTRY_ECHO = 'entry6' //    SELECTOR_ECHO — in no allowlist
const ENTRY_ECHO_TWO = 'entry7' // a second SELECTOR_ECHO entry

// Nested-record-instance-id mnemonics for depth-2 composite keys
// (`entryId.recordId`).
const RECORD_1 = 'record1'
const RECORD_2 = 'record2'

// A representative composite value — the obligation model treats the
// whole block as one opaque value; part-level validation is out of
// scope.
const compositeValue = compositeBlockValue('block')

// ---------------------------------------------------------------------------
// Smoke — evaluator wires up against the configured manifest
// ---------------------------------------------------------------------------

describe('smoke — evaluator wires up against the configured manifest', () => {
  it('returns { fulfilments, obligations } shape for an empty input', () => {
    const result = evaluator.evaluate({})
    expect(result.fulfilments).toEqual({})
    expect(result.obligations[scalarField.id]).toEqual(mandatory)
    expect(result.obligations[statusToggle.id]).toEqual(mandatory)
    // Retain-value pattern: statusFlipField is always in scope —
    // optional until the toggle is 'yes'.
    expect(result.obligations[statusFlipField.id]).toEqual(optional)
  })

  it('unrecognised obligation ids are dropped (tolerate-and-amend)', () => {
    const result = evaluator.evaluate({ 'not-an-obligation-id': 'anything' })
    expect(result.fulfilments).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// Always-mandatory top-level singles — batched
// ---------------------------------------------------------------------------

describe('always-mandatory top-level singles', () => {
  // Note: aggregateGatedToggle is NOT in this list — it is gated on the
  // collection entries, so it is out of scope until a matching entry is
  // added. Covered separately below.
  it.each([
    ['scalarField', scalarField],
    ['statusToggle', statusToggle],
    ['branchSelector', branchSelector],
    ['variantSelector', variantSelector],
    ['modeSelector', modeSelector],
    ['textFieldOne', textFieldOne],
    ['textFieldTwo', textFieldTwo],
    ['dateField', dateField],
    ['lookupField', lookupField],
    ['enumScalarField', enumScalarField]
  ])('%s is mandatory in-scope on empty input', (_name, obligation) => {
    const result = evaluator.evaluate({})
    expect(result.obligations[obligation.id]).toEqual(mandatory)
  })
})

// ---------------------------------------------------------------------------
// scalarField (representative single) — round-trip
// ---------------------------------------------------------------------------

describe('scalarField round-trip', () => {
  it('stored value passes through and remains mandatory in-scope', () => {
    const result = evaluator.evaluate({ [scalarField.id]: VALUE_ONE })
    expect(result.fulfilments[scalarField.id]).toBe(VALUE_ONE)
    expect(result.obligations[scalarField.id]).toEqual(mandatory)
  })
})

// ---------------------------------------------------------------------------
// statusFlipField conditional gate (retain-value pattern)
// ---------------------------------------------------------------------------

describe('statusFlipField conditional gate (retain-value)', () => {
  it('is optional in-scope when statusToggle is absent', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[statusFlipField.id]).toEqual(optional)
  })

  it('is optional in-scope when statusToggle is no', () => {
    const result = evaluator.evaluate({
      [statusToggle.id]: TOGGLE_NO
    })
    expect(result.obligations[statusFlipField.id]).toEqual(optional)
  })

  it('is mandatory in-scope when statusToggle is yes', () => {
    const result = evaluator.evaluate({
      [statusToggle.id]: TOGGLE_YES
    })
    expect(result.obligations[statusFlipField.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [statusFlipFieldReason]
    })
  })

  // Retain-value: the toggle flipping off demotes statusFlipField to
  // optional but keeps it in scope — the stored value survives.
  it('retains a stored statusFlipField value when the toggle flips from yes to no', () => {
    const stored = {
      [statusToggle.id]: TOGGLE_NO,
      [statusFlipField.id]: VALUE_TWO
    }
    const result = evaluator.evaluate(stored)
    expect(result.fulfilments[statusFlipField.id]).toBe(VALUE_TWO)
    expect(result.obligations[statusFlipField.id]).toEqual(optional)
  })
})

// ---------------------------------------------------------------------------
// optionalScalarField (always-optional)
// ---------------------------------------------------------------------------

describe('optionalScalarField (always optional)', () => {
  it('is optional in-scope on empty input', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[optionalScalarField.id]).toEqual(optional)
  })

  it('round-trips a stored value and remains optional in-scope', () => {
    const result = evaluator.evaluate({
      [optionalScalarField.id]: VALUE_ONE
    })
    expect(result.fulfilments[optionalScalarField.id]).toBe(VALUE_ONE)
    expect(result.obligations[optionalScalarField.id]).toEqual(optional)
  })
})

// ---------------------------------------------------------------------------
// branchAField conditional gate (purge-on-flip pattern)
// ---------------------------------------------------------------------------

describe('branchAField conditional gate', () => {
  it('is out of scope when branchSelector is absent', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[branchAField.id]).toEqual(outOfScope)
  })

  it('is out of scope when branchSelector is not BRANCH_A', () => {
    const result = evaluator.evaluate({
      [branchSelector.id]: BRANCH_B
    })
    expect(result.obligations[branchAField.id]).toEqual(outOfScope)
  })

  it('is mandatory in-scope when branchSelector is BRANCH_A', () => {
    const result = evaluator.evaluate({
      [branchSelector.id]: BRANCH_A
    })
    expect(result.obligations[branchAField.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [branchAFieldReason]
    })
  })

  it('purges a stored value when branchSelector flips away from BRANCH_A', () => {
    const result = evaluator.evaluate({
      [branchSelector.id]: BRANCH_B,
      [branchAField.id]: VALUE_ONE
    })
    expect(result.fulfilments[branchAField.id]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// variantSelector → variantOneBlock vs variantTwoBlock mutual exclusion
// ---------------------------------------------------------------------------

describe('variantSelector → variantOneBlock vs variantTwoBlock mutual exclusion', () => {
  it('both blocks are out of scope when variantSelector is absent', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[variantOneBlock.id]).toEqual(outOfScope)
    expect(result.obligations[variantTwoBlock.id]).toEqual(outOfScope)
  })

  it('variantOne in-scope, variantTwo out-of-scope when the selector is VARIANT_ONE', () => {
    const result = evaluator.evaluate({
      [variantSelector.id]: VARIANT_ONE
    })
    expect(result.obligations[variantOneBlock.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [variantOneBlockReason]
    })
    expect(result.obligations[variantTwoBlock.id]).toEqual(outOfScope)
  })

  it('variantTwo in-scope, variantOne out-of-scope when the selector is VARIANT_TWO', () => {
    const result = evaluator.evaluate({
      [variantSelector.id]: VARIANT_TWO
    })
    expect(result.obligations[variantOneBlock.id]).toEqual(outOfScope)
    expect(result.obligations[variantTwoBlock.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [variantTwoBlockReason]
    })
  })

  it('purges a stored variantOneBlock value when the selector flips to VARIANT_TWO', () => {
    const result = evaluator.evaluate({
      [variantSelector.id]: VARIANT_TWO,
      [variantOneBlock.id]: compositeValue
    })
    expect(result.fulfilments[variantOneBlock.id]).toBeUndefined()
  })

  it('purges a stored variantTwoBlock value when the selector flips to VARIANT_ONE', () => {
    const result = evaluator.evaluate({
      [variantSelector.id]: VARIANT_ONE,
      [variantTwoBlock.id]: compositeValue
    })
    expect(result.fulfilments[variantTwoBlock.id]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// modeSelector → modeGatedList multi-select gate
// ---------------------------------------------------------------------------

describe('modeGatedList conditional gate', () => {
  it('is out of scope when modeSelector is absent', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[modeGatedList.id]).toEqual(outOfScope)
  })

  it('is out of scope when modeSelector is MODE_CHARLIE (unlisted)', () => {
    const result = evaluator.evaluate({
      [modeSelector.id]: MODE_CHARLIE
    })
    expect(result.obligations[modeGatedList.id]).toEqual(outOfScope)
  })

  it('is mandatory in-scope when modeSelector is MODE_BRAVO', () => {
    const result = evaluator.evaluate({
      [modeSelector.id]: MODE_BRAVO
    })
    expect(result.obligations[modeGatedList.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [modeGatedListReason]
    })
  })

  it('is mandatory in-scope when modeSelector is MODE_ALPHA', () => {
    const result = evaluator.evaluate({
      [modeSelector.id]: MODE_ALPHA
    })
    expect(result.obligations[modeGatedList.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [modeGatedListReason]
    })
  })

  it('purges a stored modeGatedList when modeSelector flips to MODE_CHARLIE', () => {
    const result = evaluator.evaluate({
      [modeSelector.id]: MODE_CHARLIE,
      [modeGatedList.id]: [VALUE_ONE, VALUE_TWO]
    })
    expect(result.fulfilments[modeGatedList.id]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Composite blocks — opaque-object value round-trip
// ---------------------------------------------------------------------------

describe('composite blocks (opaque value round-trip)', () => {
  it.each([
    ['compositeBlockOne', compositeBlockOne],
    ['compositeBlockTwo', compositeBlockTwo],
    ['compositeBlockThree', compositeBlockThree],
    ['compositeBlockFour', compositeBlockFour],
    ['compositeBlockFive', compositeBlockFive],
    ['compositeBlockSix', compositeBlockSix]
  ])('%s stores and returns a composite value', (_name, obligation) => {
    const result = evaluator.evaluate({
      [obligation.id]: compositeValue
    })
    expect(result.fulfilments[obligation.id]).toEqual(compositeValue)
    expect(result.obligations[obligation.id]).toEqual(mandatory)
  })
})

// ---------------------------------------------------------------------------
// itemCollection — user-driven indexed group semantics
// ---------------------------------------------------------------------------

describe('itemCollection group semantics', () => {
  it('has no records when no entries exist', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[itemCollection.id]).toEqual({
      inScope: true,
      fulfilmentIndexes: []
    })
  })

  it('infers a group fulfilmentIndex per entry from itemSelector composite-key prefixes', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: {
        [ENTRY_BRAVO]: SELECTOR_BRAVO,
        [ENTRY_DELTA]: SELECTOR_DELTA
      }
    })
    const ids = new Set(result.obligations[itemCollection.id].fulfilmentIndexes)
    expect(ids).toEqual(new Set([ENTRY_BRAVO, ENTRY_DELTA]))
  })

  it('unions fulfilmentIndexes across any descendant field record', () => {
    // Only itemCount is answered on the second entry — the entry's
    // presence is still inferred (no dedicated itemSelector entry required).
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_BRAVO]: SELECTOR_BRAVO },
      [itemCount.id]: { [ENTRY_DELTA]: 42 }
    })
    const ids = new Set(result.obligations[itemCollection.id].fulfilmentIndexes)
    expect(ids).toEqual(new Set([ENTRY_BRAVO, ENTRY_DELTA]))
  })
})

// ---------------------------------------------------------------------------
// itemCollection field records — per-entry round-trip
// ---------------------------------------------------------------------------

describe('itemCollection field records (round-trip)', () => {
  it('itemSelector stores one value per entry', () => {
    const stored = {
      [ENTRY_ECHO]: SELECTOR_ECHO,
      [ENTRY_BRAVO]: SELECTOR_BRAVO,
      [ENTRY_DELTA]: SELECTOR_DELTA
    }
    const result = evaluator.evaluate({ [itemSelector.id]: stored })
    expect(result.fulfilments[itemSelector.id]).toEqual(stored)
  })

  it('itemCategory stores one value per entry', () => {
    const result = evaluator.evaluate({
      [itemCategory.id]: {
        [ENTRY_BRAVO]: CATEGORY_ONE,
        [ENTRY_DELTA]: CATEGORY_ONE
      }
    })
    expect(result.fulfilments[itemCategory.id]).toEqual({
      [ENTRY_BRAVO]: CATEGORY_ONE,
      [ENTRY_DELTA]: CATEGORY_ONE
    })
  })

  it('itemCount stores one whole-number value per entry', () => {
    const result = evaluator.evaluate({
      [itemCount.id]: { [ENTRY_BRAVO]: 250, [ENTRY_DELTA]: 12 }
    })
    expect(result.fulfilments[itemCount.id]).toEqual({
      [ENTRY_BRAVO]: 250,
      [ENTRY_DELTA]: 12
    })
  })

  it('itemTags stores an array of tag strings per entry', () => {
    const result = evaluator.evaluate({
      [itemTags.id]: {
        [ENTRY_ECHO]: [TAG_ONE],
        [ENTRY_ALPHA]: [TAG_ONE, TAG_TWO]
      }
    })
    expect(result.fulfilments[itemTags.id]).toEqual({
      [ENTRY_ECHO]: [TAG_ONE],
      [ENTRY_ALPHA]: [TAG_ONE, TAG_TWO]
    })
  })
})

// ---------------------------------------------------------------------------
// itemGatedField — derived-leaf reuse (selector-gated per entry)
// ---------------------------------------------------------------------------

describe('itemGatedField (derived-leaf, selector-gated)', () => {
  it(outOfScopeWhenNoEntriesTitle, () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[itemGatedField.id]).toEqual(outOfScope)
  })

  it('is out of scope when no entry has a listed selector', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_ECHO]: SELECTOR_ECHO }
    })
    expect(result.obligations[itemGatedField.id]).toEqual(outOfScope)
  })

  it('is in scope with reason on a matching entry', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_BRAVO]: SELECTOR_BRAVO }
    })
    expect(result.obligations[itemGatedField.id]).toEqual({
      inScope: true,
      reasons: [itemGatedFieldReason],
      status: 'optional',
      fulfilmentIndexes: [ENTRY_BRAVO]
    })
  })

  it('records list contains only matching entry ids (mixed manifest)', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: {
        [ENTRY_ECHO]: SELECTOR_ECHO,
        [ENTRY_BRAVO]: SELECTOR_BRAVO,
        [ENTRY_ALPHA]: SELECTOR_ALPHA
      }
    })
    const ids = result.obligations[itemGatedField.id].fulfilmentIndexes
    expect(new Set(ids)).toEqual(new Set([ENTRY_BRAVO, ENTRY_ALPHA]))
  })

  it('keeps a stored value on a matching entry (round-trip)', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_BRAVO]: SELECTOR_BRAVO },
      [itemGatedField.id]: { [ENTRY_BRAVO]: 3 }
    })
    expect(result.fulfilments[itemGatedField.id]).toEqual({
      [ENTRY_BRAVO]: 3
    })
  })

  it('purges a stored value on a non-matching entry', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_ECHO]: SELECTOR_ECHO },
      [itemGatedField.id]: { [ENTRY_ECHO]: 7 }
    })
    expect(result.fulfilments[itemGatedField.id]).toBeUndefined()
  })

  it('keeps matching-entry values, purges non-matching-entry values (mixed)', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: {
        [ENTRY_ECHO]: SELECTOR_ECHO,
        [ENTRY_BRAVO]: SELECTOR_BRAVO,
        [ENTRY_ALPHA]: SELECTOR_ALPHA
      },
      [itemGatedField.id]: {
        [ENTRY_ECHO]: 7, // should be purged
        [ENTRY_BRAVO]: 3 // should survive
        // ENTRY_ALPHA unanswered
      }
    })
    expect(result.fulfilments[itemGatedField.id]).toEqual({
      [ENTRY_BRAVO]: 3
    })
  })

  // Identity comes from entry-instance-id, not the selector value — a
  // value-keyed shape would collapse here.
  it('supports two entries sharing the same matching selector', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: {
        [ENTRY_ALPHA]: SELECTOR_ALPHA,
        [ENTRY_ALPHA_TWO]: SELECTOR_ALPHA // both entries: the same selector
      },
      [itemGatedField.id]: {
        [ENTRY_ALPHA]: 3,
        [ENTRY_ALPHA_TWO]: 5
      }
    })
    expect(result.fulfilments[itemGatedField.id]).toEqual({
      [ENTRY_ALPHA]: 3,
      [ENTRY_ALPHA_TWO]: 5
    })
    const ids = result.obligations[itemGatedField.id].fulfilmentIndexes
    expect(new Set(ids)).toEqual(new Set([ENTRY_ALPHA, ENTRY_ALPHA_TWO]))
  })
})

// ---------------------------------------------------------------------------
// aggregateGatedField — top-level single reading nested storage
// ---------------------------------------------------------------------------

describe('aggregateGatedField (top-level, reads itemSelector storage)', () => {
  it(outOfScopeWhenNoEntriesTitle, () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[aggregateGatedField.id]).toEqual(outOfScope)
  })

  it('is out of scope when no entry has a listed selector', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: {
        [ENTRY_BRAVO]: SELECTOR_BRAVO,
        [ENTRY_DELTA]: SELECTOR_DELTA
      }
    })
    expect(result.obligations[aggregateGatedField.id]).toEqual(outOfScope)
  })

  it('is mandatory in-scope when at least one entry has a listed selector', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: {
        [ENTRY_BRAVO]: SELECTOR_BRAVO, // not listed for this gate
        [ENTRY_ALPHA]: SELECTOR_ALPHA //  listed
      }
    })
    expect(result.obligations[aggregateGatedField.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [aggregateGatedFieldReason]
    })
  })

  it('keeps a stored aggregateGatedField value when a listed selector is present', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_ALPHA]: SELECTOR_ALPHA },
      [aggregateGatedField.id]: VALUE_ONE
    })
    expect(result.fulfilments[aggregateGatedField.id]).toBe(VALUE_ONE)
  })

  it('purges a stored aggregateGatedField value when no entry has a listed selector', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_BRAVO]: SELECTOR_BRAVO },
      [aggregateGatedField.id]: VALUE_ONE
    })
    expect(result.fulfilments[aggregateGatedField.id]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Interlock — one SELECTOR_ALPHA entry trips both the per-entry and the
// aggregate gate
// ---------------------------------------------------------------------------

describe('a SELECTOR_ALPHA entry trips both the per-entry and the aggregate gate', () => {
  it('activates itemGatedField (per-entry) and aggregateGatedField (top-level) simultaneously', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_ALPHA]: SELECTOR_ALPHA }
    })
    expect(result.obligations[itemGatedField.id].fulfilmentIndexes).toEqual([
      ENTRY_ALPHA
    ])
    expect(result.obligations[aggregateGatedField.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [aggregateGatedFieldReason]
    })
  })
})

// ---------------------------------------------------------------------------
// nestedCollection — nested user-driven indexed group inside itemCollection
// (depth-2). Instance-ids inferred from descendant field-record composite-
// key prefixes.
// ---------------------------------------------------------------------------

describe('nestedCollection group semantics', () => {
  it('has no records when no nested-level obligations have storage', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_ALPHA]: SELECTOR_ALPHA }
    })
    expect(result.obligations[nestedCollection.id]).toEqual({
      inScope: true,
      fulfilmentIndexes: []
    })
  })

  it('infers nested-instance paths from a per-record leaf storage', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_ALPHA]: SELECTOR_ALPHA },
      [nestedGatedFieldA.id]: {
        [`${ENTRY_ALPHA}.${RECORD_1}`]: VALUE_ONE,
        [`${ENTRY_ALPHA}.${RECORD_2}`]: VALUE_TWO
      }
    })
    const ids = new Set(
      result.obligations[nestedCollection.id].fulfilmentIndexes
    )
    expect(ids).toEqual(
      new Set([`${ENTRY_ALPHA}.${RECORD_1}`, `${ENTRY_ALPHA}.${RECORD_2}`])
    )
  })

  it('unions nested-instance paths across multiple leaf storages', () => {
    // Both fallback leaves are in scope on an unlisted-selector entry,
    // so one entry can carry two different leaf storages.
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_ECHO]: SELECTOR_ECHO },
      [nestedFallbackFieldA.id]: {
        [`${ENTRY_ECHO}.${RECORD_1}`]: VALUE_ONE
      },
      [nestedFallbackFieldB.id]: {
        [`${ENTRY_ECHO}.${RECORD_2}`]: VALUE_TWO
      }
    })
    const ids = new Set(
      result.obligations[nestedCollection.id].fulfilmentIndexes
    )
    expect(ids).toEqual(
      new Set([`${ENTRY_ECHO}.${RECORD_1}`, `${ENTRY_ECHO}.${RECORD_2}`])
    )
  })
})

// ---------------------------------------------------------------------------
// nestedGatedFieldB — selector-gated per-record leaf (allowListed, depth-2)
// ---------------------------------------------------------------------------

describe('nestedGatedFieldB (allowListed(itemSelector, [SELECTOR_BRAVO]))', () => {
  it(outOfScopeWhenNoEntriesTitle, () => {
    expect(evaluator.evaluate({}).obligations[nestedGatedFieldB.id]).toEqual({
      inScope: false
    })
  })

  it('is out of scope for entries with an unlisted selector', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_ECHO]: SELECTOR_ECHO }
    })
    expect(result.obligations[nestedGatedFieldB.id]).toEqual({ inScope: false })
  })

  it('is in scope with one record per nested record under a listed entry', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_BRAVO]: SELECTOR_BRAVO },
      [nestedGatedFieldB.id]: {
        [`${ENTRY_BRAVO}.${RECORD_1}`]: VALUE_ONE,
        [`${ENTRY_BRAVO}.${RECORD_2}`]: VALUE_TWO
      }
    })
    expect(result.obligations[nestedGatedFieldB.id].inScope).toBe(true)
    expect(result.obligations[nestedGatedFieldB.id].reasons).toEqual([
      nestedGatedFieldBReason
    ])
    const ids = new Set(
      result.obligations[nestedGatedFieldB.id].fulfilmentIndexes
    )
    expect(ids).toEqual(
      new Set([`${ENTRY_BRAVO}.${RECORD_1}`, `${ENTRY_BRAVO}.${RECORD_2}`])
    )
  })

  it('keeps a stored value on a matching-entry record (round-trip)', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_BRAVO]: SELECTOR_BRAVO },
      [nestedGatedFieldB.id]: { [`${ENTRY_BRAVO}.${RECORD_1}`]: VALUE_ONE }
    })
    expect(result.fulfilments[nestedGatedFieldB.id]).toEqual({
      [`${ENTRY_BRAVO}.${RECORD_1}`]: VALUE_ONE
    })
  })

  it('purges a stored value on a non-matching-entry record', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_ECHO]: SELECTOR_ECHO },
      [nestedGatedFieldB.id]: { [`${ENTRY_ECHO}.${RECORD_1}`]: VALUE_ONE }
    })
    expect(result.fulfilments[nestedGatedFieldB.id]).toBeUndefined()
  })

  it('keeps matching-entry values, purges non-matching (mixed entries)', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: {
        [ENTRY_ECHO]: SELECTOR_ECHO,
        [ENTRY_BRAVO]: SELECTOR_BRAVO
      },
      [nestedGatedFieldB.id]: {
        [`${ENTRY_ECHO}.${RECORD_1}`]: VALUE_TWO,
        [`${ENTRY_BRAVO}.${RECORD_1}`]: VALUE_ONE
      }
    })
    expect(result.fulfilments[nestedGatedFieldB.id]).toEqual({
      [`${ENTRY_BRAVO}.${RECORD_1}`]: VALUE_ONE
    })
  })
})

// ---------------------------------------------------------------------------
// nestedGatedFieldD / nestedGatedFieldA / nestedGatedFieldC — same
// allowListed shape, different allowlists
// ---------------------------------------------------------------------------

describe('nestedGatedFieldD (allowListed(itemSelector, [SELECTOR_DELTA]))', () => {
  it('is in scope for a SELECTOR_DELTA entry', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_DELTA]: SELECTOR_DELTA },
      [nestedGatedFieldD.id]: { [`${ENTRY_DELTA}.${RECORD_1}`]: VALUE_ONE }
    })
    expect(result.obligations[nestedGatedFieldD.id].inScope).toBe(true)
    expect(result.obligations[nestedGatedFieldD.id].reasons).toEqual([
      nestedGatedFieldDReason
    ])
  })

  it('is out of scope for SELECTOR_CHARLIE (not in the allowlist)', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_CHARLIE]: SELECTOR_CHARLIE }
    })
    expect(result.obligations[nestedGatedFieldD.id]).toEqual({ inScope: false })
  })
})

describe('nestedGatedFieldA (allowListed(itemSelector, [SELECTOR_ALPHA]))', () => {
  it('is in scope across two SELECTOR_ALPHA entries', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: {
        [ENTRY_ALPHA]: SELECTOR_ALPHA,
        [ENTRY_ALPHA_TWO]: SELECTOR_ALPHA
      },
      [nestedGatedFieldA.id]: {
        [`${ENTRY_ALPHA}.${RECORD_1}`]: VALUE_ONE,
        [`${ENTRY_ALPHA_TWO}.${RECORD_1}`]: VALUE_TWO
      }
    })
    expect(result.obligations[nestedGatedFieldA.id].inScope).toBe(true)
    expect(result.obligations[nestedGatedFieldA.id].reasons).toEqual([
      nestedGatedFieldAReason
    ])
    const ids = new Set(
      result.obligations[nestedGatedFieldA.id].fulfilmentIndexes
    )
    expect(ids).toEqual(
      new Set([`${ENTRY_ALPHA}.${RECORD_1}`, `${ENTRY_ALPHA_TWO}.${RECORD_1}`])
    )
  })

  it('is out of scope for SELECTOR_DELTA (not in the allowlist)', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_DELTA]: SELECTOR_DELTA }
    })
    expect(result.obligations[nestedGatedFieldA.id]).toEqual({ inScope: false })
  })
})

describe('nestedGatedFieldC (allowListed(itemSelector, [SELECTOR_CHARLIE]))', () => {
  it('is in scope only for a SELECTOR_CHARLIE entry', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_CHARLIE]: SELECTOR_CHARLIE },
      [nestedGatedFieldC.id]: { [`${ENTRY_CHARLIE}.${RECORD_1}`]: VALUE_ONE }
    })
    expect(result.obligations[nestedGatedFieldC.id].inScope).toBe(true)
    expect(result.obligations[nestedGatedFieldC.id].reasons).toEqual([
      nestedGatedFieldCReason
    ])
  })

  it('is out of scope for SELECTOR_ALPHA', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_ALPHA]: SELECTOR_ALPHA }
    })
    expect(result.obligations[nestedGatedFieldC.id]).toEqual({ inScope: false })
  })
})

// ---------------------------------------------------------------------------
// nestedFallbackFieldA / nestedFallbackFieldB — complement gate (in scope
// only where no typed allowlist applies)
// ---------------------------------------------------------------------------

describe('nestedFallbackFieldA (complement gate — no typed allowlist applies)', () => {
  it('is in scope for SELECTOR_ECHO (in no typed allowlist)', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_ECHO]: SELECTOR_ECHO },
      [nestedFallbackFieldA.id]: {
        [`${ENTRY_ECHO}.${RECORD_1}`]: VALUE_ONE
      }
    })
    expect(result.obligations[nestedFallbackFieldA.id].inScope).toBe(true)
    expect(result.obligations[nestedFallbackFieldA.id].reasons).toEqual([
      nestedFallbackFieldAReason
    ])
  })

  it('is out of scope for SELECTOR_ALPHA (nestedGatedFieldA applies)', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_ALPHA]: SELECTOR_ALPHA }
    })
    expect(result.obligations[nestedFallbackFieldA.id]).toEqual({
      inScope: false
    })
  })

  it('is out of scope for SELECTOR_CHARLIE (nestedGatedFieldC applies)', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_CHARLIE]: SELECTOR_CHARLIE }
    })
    expect(result.obligations[nestedFallbackFieldA.id]).toEqual({
      inScope: false
    })
  })

  it('is out of scope for SELECTOR_DELTA (nestedGatedFieldD applies)', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_DELTA]: SELECTOR_DELTA }
    })
    expect(result.obligations[nestedFallbackFieldA.id]).toEqual({
      inScope: false
    })
  })

  it('purges a stored fallback value on a typed-allowlist entry', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_ALPHA]: SELECTOR_ALPHA },
      [nestedFallbackFieldA.id]: {
        [`${ENTRY_ALPHA}.${RECORD_1}`]: VALUE_ONE
      }
    })
    expect(result.fulfilments[nestedFallbackFieldA.id]).toBeUndefined()
  })
})

describe('nestedFallbackFieldB (same complement gate as nestedFallbackFieldA)', () => {
  it('is in scope for SELECTOR_ECHO, out of scope for SELECTOR_ALPHA', () => {
    const echo = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_ECHO]: SELECTOR_ECHO }
    })
    const alpha = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_ALPHA]: SELECTOR_ALPHA }
    })
    // With no nested storage the inScope flag reflects "any path in
    // scope" → for SELECTOR_ECHO, the enumerated paths at nested level
    // are empty, so technically no records are in scope even though the
    // gate would permit them. Add a stored record to make it concrete.
    const echoWithRecord = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_ECHO]: SELECTOR_ECHO },
      [nestedFallbackFieldB.id]: { [`${ENTRY_ECHO}.${RECORD_1}`]: VALUE_ONE }
    })
    expect(echoWithRecord.obligations[nestedFallbackFieldB.id].inScope).toBe(
      true
    )
    expect(alpha.obligations[nestedFallbackFieldB.id]).toEqual({
      inScope: false
    })
    expect(echo.obligations[nestedFallbackFieldB.id]).toEqual({
      inScope: false
    })
  })
})

// ---------------------------------------------------------------------------
// nestedCompositeBlock — depth-2 composite leaf, selector-gated
// ---------------------------------------------------------------------------

describe('nestedCompositeBlock (allowListed(itemSelector, [SELECTOR_DELTA]))', () => {
  const nestedValue = compositeBlockValue('nested')

  it('is in scope for SELECTOR_DELTA with a composite value', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_DELTA]: SELECTOR_DELTA },
      [nestedCompositeBlock.id]: {
        [`${ENTRY_DELTA}.${RECORD_1}`]: nestedValue
      }
    })
    expect(result.obligations[nestedCompositeBlock.id].inScope).toBe(true)
    expect(result.obligations[nestedCompositeBlock.id].reasons).toEqual([
      nestedCompositeBlockReason
    ])
    expect(
      result.obligations[nestedCompositeBlock.id].fulfilmentIndexes
    ).toEqual([`${ENTRY_DELTA}.${RECORD_1}`])
    expect(result.fulfilments[nestedCompositeBlock.id]).toEqual({
      [`${ENTRY_DELTA}.${RECORD_1}`]: nestedValue
    })
  })

  it('is out of scope for SELECTOR_ALPHA', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_ALPHA]: SELECTOR_ALPHA }
    })
    expect(result.obligations[nestedCompositeBlock.id]).toEqual({
      inScope: false
    })
  })

  it('purges a stored nestedCompositeBlock on an unlisted-selector entry', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: { [ENTRY_ALPHA]: SELECTOR_ALPHA },
      [nestedCompositeBlock.id]: {
        [`${ENTRY_ALPHA}.${RECORD_1}`]: nestedValue
      }
    })
    expect(result.fulfilments[nestedCompositeBlock.id]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Mixed-entry interlock — different selectors drive different leaves per
// nested record on the same evaluation
// ---------------------------------------------------------------------------

describe('mixed entries drive per-entry leaf gating', () => {
  it('the fallback leaf applies to both unlisted entries, nestedGatedFieldA only to the alpha entry, nestedGatedFieldC only to the charlie entry', () => {
    const result = evaluator.evaluate({
      [itemSelector.id]: {
        [ENTRY_ECHO]: SELECTOR_ECHO,
        [ENTRY_ECHO_TWO]: SELECTOR_ECHO,
        [ENTRY_ALPHA]: SELECTOR_ALPHA,
        [ENTRY_CHARLIE]: SELECTOR_CHARLIE
      },
      [nestedFallbackFieldA.id]: {
        [`${ENTRY_ECHO}.${RECORD_1}`]: VALUE_ONE,
        [`${ENTRY_ECHO_TWO}.${RECORD_1}`]: VALUE_TWO
      },
      [nestedGatedFieldA.id]: { [`${ENTRY_ALPHA}.${RECORD_1}`]: VALUE_ONE },
      [nestedGatedFieldC.id]: { [`${ENTRY_CHARLIE}.${RECORD_1}`]: VALUE_ONE }
    })
    const fallbackIds = new Set(
      result.obligations[nestedFallbackFieldA.id].fulfilmentIndexes
    )
    expect(fallbackIds).toEqual(
      new Set([`${ENTRY_ECHO}.${RECORD_1}`, `${ENTRY_ECHO_TWO}.${RECORD_1}`])
    )

    const gatedAIds = new Set(
      result.obligations[nestedGatedFieldA.id].fulfilmentIndexes
    )
    expect(gatedAIds).toEqual(new Set([`${ENTRY_ALPHA}.${RECORD_1}`]))

    const gatedCIds = new Set(
      result.obligations[nestedGatedFieldC.id].fulfilmentIndexes
    )
    expect(gatedCIds).toEqual(new Set([`${ENTRY_CHARLIE}.${RECORD_1}`]))
  })
})

// ---------------------------------------------------------------------------
// boundedCollection — 0..10 user-driven indexed group. The four metadata
// fields are plain `status: 'mandatory'` within the group; the two
// upload-return fields are optional. The cap rides `requires.maxEntries`
// via `groupInvariantErrors`.
// ---------------------------------------------------------------------------

const boundedMandatoryFields = [
  ['Type', boundedItemType],
  ['Mode', boundedItemMode],
  ['Reference', boundedItemReference],
  ['Date', boundedItemDate]
]

const boundedOptionalFields = [
  ['UploadId', boundedItemUploadId],
  ['Filename', boundedItemFilename]
]

describe('boundedCollection: no entries at all', () => {
  it.each([
    ['boundedCollection group', boundedCollection],
    ...boundedMandatoryFields,
    ...boundedOptionalFields
  ])('%s is in scope with no records', (_name, obligation) => {
    const result = evaluator.evaluate({})
    expect(result.obligations[obligation.id]).toEqual({
      inScope: true,
      ...(obligation.status ? { status: obligation.status } : {}),
      fulfilmentIndexes: []
    })
  })
})

describe('boundedCollection: the upload-return fields are optional obligations', () => {
  const uploadOnly = {
    [boundedItemUploadId.id]: { d0: 'uploadOne' },
    [boundedItemFilename.id]: { d0: 'fileOne' }
  }

  it('an upload-only record is a visible group instance', () => {
    const result = evaluator.evaluate(uploadOnly)
    expect(result.obligations[boundedCollection.id]).toEqual({
      inScope: true,
      fulfilmentIndexes: ['d0']
    })
  })

  it.each(boundedOptionalFields)(
    '%s is optional and its value round-trips',
    (_name, obligation) => {
      const result = evaluator.evaluate(uploadOnly)
      expect(result.obligations[obligation.id]).toEqual({
        inScope: true,
        status: 'optional',
        fulfilmentIndexes: ['d0']
      })
      expect(result.fulfilments[obligation.id]).toEqual(
        uploadOnly[obligation.id]
      )
    }
  )

  it.each(boundedMandatoryFields)(
    '%s remains mandatory on an upload-only record',
    (_name, obligation) => {
      const result = evaluator.evaluate(uploadOnly)
      expect(result.obligations[obligation.id]).toEqual({
        inScope: true,
        status: 'mandatory',
        fulfilmentIndexes: ['d0']
      })
    }
  )
})

describe('boundedCollection: four metadata fields are mandatory per record', () => {
  const withType = {
    [boundedItemType.id]: { d0: BOUNDED_TYPE_ONE }
  }

  it('a record appears once any of its fields is stored', () => {
    const result = evaluator.evaluate(withType)
    expect(result.obligations[boundedCollection.id]).toEqual({
      inScope: true,
      fulfilmentIndexes: ['d0']
    })
  })

  it.each(boundedMandatoryFields)(
    '%s is mandatory on an existing record',
    (_name, obligation) => {
      const result = evaluator.evaluate(withType)
      expect(result.obligations[obligation.id]).toEqual({
        inScope: true,
        status: 'mandatory',
        fulfilmentIndexes: ['d0']
      })
    }
  )
})

describe('boundedCollection: all four filled on one record', () => {
  const stored = {
    [boundedItemType.id]: { d0: BOUNDED_TYPE_ONE },
    [boundedItemMode.id]: { d0: BOUNDED_MODE_ONE },
    [boundedItemReference.id]: { d0: 'referenceOne' },
    [boundedItemDate.id]: { d0: dateValue() }
  }

  it.each(boundedMandatoryFields)(
    '%s is mandatory and its value round-trips',
    (_name, obligation) => {
      const result = evaluator.evaluate(stored)
      expect(result.obligations[obligation.id]).toEqual({
        inScope: true,
        status: 'mandatory',
        fulfilmentIndexes: ['d0']
      })
      expect(result.fulfilments[obligation.id]).toEqual(stored[obligation.id])
    }
  )
})

describe('boundedCollection: a partial record keeps every field owed', () => {
  it('a record with only a Reference keeps its other fields mandatory (nothing purged)', () => {
    const result = evaluator.evaluate({
      [boundedItemType.id]: { d0: BOUNDED_TYPE_ONE },
      [boundedItemReference.id]: { d0: 'referenceOne', d1: 'referenceTwo' }
    })
    expect(result.obligations[boundedItemReference.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      fulfilmentIndexes: ['d0', 'd1']
    })
    expect(result.fulfilments[boundedItemReference.id]).toEqual({
      d0: 'referenceOne',
      d1: 'referenceTwo'
    })
  })
})

describe('boundedCollection: the 0..10 cap', () => {
  const recordsOf = (count) =>
    Object.fromEntries(
      Array.from({ length: count }, (_, i) => [`d${i}`, 'uploadValue'])
    )

  it('ten inferred upload-only instances raise no invariant error', () => {
    const state = evaluator.evaluate({
      [boundedItemUploadId.id]: recordsOf(10)
    })
    expect(groupInvariantErrors(boundedCollection, state)).toEqual([])
  })

  it('an eleventh inferred upload-only instance trips MAX_ENTRIES', () => {
    const state = evaluator.evaluate({
      [boundedItemUploadId.id]: recordsOf(11)
    })
    expect(groupInvariantErrors(boundedCollection, state)).toEqual([
      {
        code: 'MAX_ENTRIES',
        groupId: boundedCollection.id,
        groupName: 'boundedCollection',
        errorCode: 'fixture.boundedCollection.tooMany',
        maxEntries: 10,
        actual: 11
      }
    ])
  })
})

// ---------------------------------------------------------------------------
// applyTo runs on the post-purge view (two-hop cascade)
// ---------------------------------------------------------------------------
//
// Within a single evaluate() call, an obligation's applyTo must read from
// the post-purge fulfilments, not the pre-purge `recognisedFulfilments`.
// Otherwise a value that this same evaluate call purges via one gate can
// still drive OTHER gates in the same call — the D2 in "G1 gates D; D
// gates D2".
//
// The scenario is unnatural in the configured manifest (no live G-D-D2
// chain of purge-on-flip singles) so we exercise it via a synthetic
// three-obligation manifest driven through the full pipeline.
describe('evaluator — applyTo evaluates on the post-purge view (two-hop cascade)', () => {
  const g1 = {
    id: 'g1',
    name: 'g1',
    applyTo: () => ({ inScope: true, status: 'mandatory' })
  }
  const dependent = {
    id: 'd',
    name: 'd',
    applyTo: (fulfilments) =>
      fulfilments[g1.id] === 'open'
        ? { inScope: true, status: 'mandatory' }
        : { inScope: false }
  }
  const d2 = {
    id: 'd2',
    name: 'd2',
    applyTo: (fulfilments) =>
      fulfilments[dependent.id] === 'yes'
        ? { inScope: true, status: 'mandatory' }
        : { inScope: false }
  }
  const unrelated = {
    id: 'unrelated',
    name: 'unrelated',
    applyTo: () => ({ inScope: true, status: 'optional' })
  }
  const cascadeManifest = [g1, dependent, d2, unrelated]

  it('two-hop cascade: closing G1 purges D AND takes D2 out of scope in the same call', () => {
    const cascadeEvaluator = createObligationEvaluator({
      obligations: cascadeManifest
    })
    // Seed: gate open, dependent answered, downstream gated on the
    // dependent also answered.
    const result = cascadeEvaluator.evaluate({
      [g1.id]: 'closed',
      [dependent.id]: 'yes',
      [d2.id]: 'anything'
    })
    // D goes out of scope because G1 is closed — its value is purged.
    expect(result.fulfilments[dependent.id]).toBeUndefined()
    // Load-bearing: D2's applyTo reads D. With pre-purge evaluation,
    // D2's applyTo sees the stale `d: 'yes'` and D2 stays in scope —
    // its value survives the purge. With post-purge evaluation, D2's
    // applyTo sees `d: undefined` and D2 is out of scope, purging its
    // value too.
    expect(result.obligations[d2.id]).toEqual({ inScope: false })
    expect(result.fulfilments[d2.id]).toBeUndefined()
  })

  it('baseline: obligations whose applyTo does not depend on any purged value are unaffected', () => {
    const cascadeEvaluator = createObligationEvaluator({
      obligations: cascadeManifest
    })
    // Same seed as the cascade test — `unrelated` should stay in scope
    // regardless of the purge fan-out. Guards against the reorder
    // accidentally dropping obligations whose applyTo is a constant.
    const result = cascadeEvaluator.evaluate({
      [g1.id]: 'closed',
      [dependent.id]: 'yes',
      [d2.id]: 'anything',
      [unrelated.id]: 'kept'
    })
    expect(result.obligations[unrelated.id]).toEqual({
      inScope: true,
      status: 'optional'
    })
    expect(result.fulfilments[unrelated.id]).toBe('kept')
  })
})

// ---------------------------------------------------------------------------
// Trivial `applyTo` drop fidelity.
//
// 18 always-in-scope obligations use the data-only shape
// `{ id, name, status: '<literal>' }` with no `applyTo` closure and no
// `dependsOn`. The `within.id` deref guard makes them routable through
// the evaluator's `field` classifier (evaluator.js buildImplication →
// the "top-level scalar with intrinsic status" branch returns
// `{ inScope: true, status: obligation.status }`).
//
// The fidelity contract this block pins: for every one of the 18
// obligations, `evaluator.evaluate({})` returns EXACTLY the decision
// object shape `{ inScope: true, status: '<literal>' }`. Any regression
// here means the classifier didn't route the obligation to the `field`
// category or the field branch produced a different shape.
//
// Expected split: 17 mandatory + 1 optional (`optionalScalarField`).
// ---------------------------------------------------------------------------

describe('trivial applyTo drop fidelity (18 always-in-scope obligations)', () => {
  const trivialAlwaysMandatoryObligations = [
    ['systemPopulatedField', systemPopulatedField],
    ['scalarField', scalarField],
    ['statusToggle', statusToggle],
    ['branchSelector', branchSelector],
    ['compositeBlockOne', compositeBlockOne],
    ['compositeBlockTwo', compositeBlockTwo],
    ['compositeBlockThree', compositeBlockThree],
    ['compositeBlockFour', compositeBlockFour],
    ['compositeBlockFive', compositeBlockFive],
    ['variantSelector', variantSelector],
    ['modeSelector', modeSelector],
    ['textFieldOne', textFieldOne],
    ['textFieldTwo', textFieldTwo],
    ['dateField', dateField],
    ['lookupField', lookupField],
    ['compositeBlockSix', compositeBlockSix],
    ['enumScalarField', enumScalarField]
  ]

  it.each(trivialAlwaysMandatoryObligations)(
    '%s evaluates as { inScope: true, status: "mandatory" } on empty input (post-drop)',
    (_name, obligation) => {
      const result = evaluator.evaluate({})
      expect(result.obligations[obligation.id]).toEqual(mandatory)
    }
  )

  it('optionalScalarField evaluates as { inScope: true, status: "optional" } on empty input (post-drop)', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[optionalScalarField.id]).toEqual(optional)
  })

  it('none of the 18 obligations carry an applyTo closure any more (data-only shape)', () => {
    // Load-bearing invariant — the whole point is that these
    // obligations are pure metadata. If someone re-adds an
    // `applyTo: () => (...)` to any of them, this fires.
    const stragglers = [
      systemPopulatedField,
      scalarField,
      statusToggle,
      branchSelector,
      compositeBlockOne,
      compositeBlockTwo,
      compositeBlockThree,
      compositeBlockFour,
      compositeBlockFive,
      variantSelector,
      modeSelector,
      textFieldOne,
      textFieldTwo,
      dateField,
      lookupField,
      compositeBlockSix,
      optionalScalarField,
      enumScalarField
    ].filter((o) => typeof o.applyTo === 'function')
    expect(stragglers).toEqual([])
  })

  it('none of the 18 obligations carry a dependsOn key any more (derivable from no-applyTo)', () => {
    // Same shape guard as above — `dependsOn: []` was redundant with
    // "no gate = no dependencies". A future author reintroducing it
    // without an applyTo would drift the schema.
    const stragglers = [
      systemPopulatedField,
      scalarField,
      statusToggle,
      branchSelector,
      compositeBlockOne,
      compositeBlockTwo,
      compositeBlockThree,
      compositeBlockFour,
      compositeBlockFive,
      variantSelector,
      modeSelector,
      textFieldOne,
      textFieldTwo,
      dateField,
      lookupField,
      compositeBlockSix,
      optionalScalarField,
      enumScalarField
    ].filter((o) => o.dependsOn !== undefined)
    expect(stragglers).toEqual([])
  })
})
