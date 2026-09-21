import { describe, it, expect } from 'vitest'
import { assembleFulfilments } from '../assemble-fulfilments.js'
import { projectAnswers } from './index.js'
import {
  BOUNDED_MODE_ONE,
  BOUNDED_TYPE_ONE,
  BOUNDED_TYPE_TWO,
  BRANCH_A,
  CATEGORY_ONE,
  CATEGORY_TWO,
  LOOKUP_ONE,
  MODE_BRAVO,
  OPTION_ONE,
  SELECTOR_ALPHA,
  SELECTOR_BRAVO,
  SELECTOR_CHARLIE,
  SELECTOR_DELTA,
  SELECTOR_ECHO,
  TAG_ONE,
  TAG_TWO,
  TOGGLE_YES,
  VALUE_ONE,
  VALUE_TWO,
  VARIANT_ONE,
  boundedItemDate,
  boundedItemFilename,
  boundedItemMode,
  boundedItemReference,
  boundedItemType,
  boundedItemUploadId,
  branchAField,
  branchSelector,
  compositeBlockValue,
  dateValue,
  enumScalarField,
  itemCategory,
  itemCount,
  itemSelector,
  itemTags,
  lookupField,
  modeGatedList,
  modeSelector,
  nestedGatedFieldA,
  scalarField,
  variantSelector
} from '../../../../../test/fixtures/index.js'

const blockValue = compositeBlockValue('two')

const UPLOAD_ID = 'upload-001'
const FILENAME = 'attachment.pdf'
const BOUNDED_REFERENCE = 'reference-001'

// ---------------------------------------------------------------------------
// Round-trip property — assembleFulfilments then projectAnswers
// recovers the original A answers (the count comes back as the number the
// model stores, pinned separately below).
// ---------------------------------------------------------------------------

describe('#fulfilments — round-trip A -> B -> A recovers the original', () => {
  it('Should recover top-level scalars on round-trip', () => {
    const answers = {
      scalarField: VALUE_ONE,
      statusToggle: TOGGLE_YES,
      statusFlipField: VALUE_TWO,
      branchSelector: BRANCH_A,
      branchAField: VALUE_ONE,
      modeSelector: MODE_BRAVO,
      variantSelector: VARIANT_ONE,
      lookupField: LOOKUP_ONE,
      modeGatedList: [VALUE_ONE, VALUE_TWO],
      enumScalarField: OPTION_ONE,
      compositeBlockTwo: blockValue
    }
    expect(projectAnswers(assembleFulfilments(answers))).toEqual(answers)
  })

  it('Should recover a multi-entry, multi-record collection on round-trip (counts as numbers)', () => {
    const answers = {
      itemCollection: [
        {
          itemSelector: SELECTOR_ALPHA,
          itemCount: '25',
          itemTags: [TAG_ONE],
          nestedCollection: [
            { nestedGatedFieldA: 'A' },
            { nestedGatedFieldA: 'B' }
          ]
        },
        {
          itemSelector: SELECTOR_CHARLIE,
          itemCount: '2',
          nestedCollection: [{ nestedGatedFieldC: 'C' }]
        }
      ]
    }
    const recovered = projectAnswers(assembleFulfilments(answers))
    expect(recovered).toEqual({
      itemCollection: [
        { ...answers.itemCollection[0], itemCount: 25 },
        { ...answers.itemCollection[1], itemCount: 2 }
      ]
    })
  })

  it('Should round-trip every selector value exactly', () => {
    for (const value of [
      SELECTOR_ALPHA,
      SELECTOR_BRAVO,
      SELECTOR_CHARLIE,
      SELECTOR_DELTA,
      SELECTOR_ECHO
    ]) {
      const answers = { itemCollection: [{ itemSelector: value }] }
      expect(projectAnswers(assembleFulfilments(answers))).toEqual(answers)
    }
  })

  it('Should keep a blank scalar value on round-trip (not dropped)', () => {
    const answers = { scalarField: '' }
    expect(projectAnswers(assembleFulfilments(answers))).toEqual(answers)
  })
})

// ---------------------------------------------------------------------------
// Shape — A positional path <-> B composite fulfilmentIndex, both directions.
// ---------------------------------------------------------------------------

describe('#fulfilments — storage shape translation', () => {
  it('Should store a top-level scalar directly under the UUID', () => {
    const fulfilments = assembleFulfilments({ scalarField: VALUE_ONE })
    expect(fulfilments).toEqual({ [scalarField.id]: VALUE_ONE })
    expect(projectAnswers(fulfilments)).toEqual({
      scalarField: VALUE_ONE
    })
  })

  it('Should translate a depth-1 positional array to a single-segment composite (item<i>)', () => {
    const answers = {
      itemCollection: [{ itemCount: '10' }, { itemCount: '20' }]
    }
    const fulfilments = assembleFulfilments(answers)
    // The count field is coerced to a NUMBER on the way in — the
    // model's fulfilmentIndexCountEquals invariant compares it strictly against
    // a record tally — and stays a number on the way out.
    expect(fulfilments[itemCount.id]).toEqual({
      item0: 10,
      item1: 20
    })
    expect(projectAnswers(fulfilments)).toEqual({
      itemCollection: [{ itemCount: 10 }, { itemCount: 20 }]
    })
  })

  it('Should translate a depth-2 nested array to a two-segment composite (item<i>.nested<j>)', () => {
    const answers = {
      itemCollection: [
        {
          nestedCollection: [
            { nestedGatedFieldA: 'first' },
            { nestedGatedFieldA: 'second' }
          ]
        }
      ]
    }
    const fulfilments = assembleFulfilments(answers)
    expect(fulfilments[nestedGatedFieldA.id]).toEqual({
      'item0.nested0': 'first',
      'item0.nested1': 'second'
    })
    expect(projectAnswers(fulfilments)).toEqual(answers)
  })

  it('Should not represent an empty collection (documented)', () => {
    // The evaluator infers group instances from descendant storage, so a
    // group with no answered leaves is invisible — a known blind spot.
    expect(assembleFulfilments({ itemCollection: [] })).toEqual({})
    expect(assembleFulfilments({ itemCollection: [{}] })).toEqual({})
  })

  it('Should treat a missing scalar as absent, not null', () => {
    expect(assembleFulfilments({})).toEqual({})
    expect(projectAnswers({})).toEqual({})
  })
})

describe('#fulfilments — page projection validation and ordering', () => {
  it.each([
    {
      name: 'deeper',
      fulfilments: {
        [itemSelector.id]: { 'item0.nested0': SELECTOR_ALPHA }
      }
    },
    {
      name: 'shallower',
      fulfilments: {
        [nestedGatedFieldA.id]: { item0: 'A-111' }
      }
    }
  ])(
    'Should reject a $name composite id than its within chain',
    ({ fulfilments }) => {
      expect(() => projectAnswers(fulfilments)).toThrow(
        /within chain requires depth/
      )
    }
  )

  it('Should reject a segment without a trailing numeric index', () => {
    expect(() =>
      projectAnswers({
        [nestedGatedFieldA.id]: {
          'item0.nested-unknown': 'A-111'
        }
      })
    ).toThrow(/trailing numeric index/)
  })

  it('Should accept out-of-order records and canonicalise arrays by numeric index', () => {
    const fulfilments = {
      [itemSelector.id]: { item1: SELECTOR_CHARLIE, item0: SELECTOR_ALPHA },
      [itemCategory.id]: { item1: CATEGORY_TWO, item0: CATEGORY_ONE },
      [nestedGatedFieldA.id]: {
        'item1.nested1': 'second-entry-second',
        'item0.nested0': 'first-entry-first',
        'item1.nested0': 'second-entry-first'
      }
    }
    const before = structuredClone(fulfilments)

    expect(projectAnswers(fulfilments)).toEqual({
      itemCollection: [
        {
          itemSelector: SELECTOR_ALPHA,
          itemCategory: CATEGORY_ONE,
          nestedCollection: [{ nestedGatedFieldA: 'first-entry-first' }]
        },
        {
          itemSelector: SELECTOR_CHARLIE,
          itemCategory: CATEGORY_TWO,
          nestedCollection: [
            { nestedGatedFieldA: 'second-entry-first' },
            { nestedGatedFieldA: 'second-entry-second' }
          ]
        }
      ]
    })
    expect(fulfilments).toEqual(before)
  })

  it.each([
    {
      name: 'top-level collection',
      fulfilments: {
        [itemSelector.id]: { item0: SELECTOR_ALPHA, item2: SELECTOR_CHARLIE }
      }
    },
    {
      name: 'nested collection',
      fulfilments: {
        [itemSelector.id]: { item0: SELECTOR_ALPHA },
        [nestedGatedFieldA.id]: {
          'item0.nested0': 'first',
          'item0.nested2': 'third'
        }
      }
    }
  ])('Should reject a sparse $name', ({ fulfilments }) => {
    expect(() => projectAnswers(fulfilments)).toThrow(/sparse indices/)
  })

  it('Should determine density across partial leaves, not per obligation records-map', () => {
    expect(
      projectAnswers({
        [itemSelector.id]: { item0: SELECTOR_ALPHA },
        [itemCategory.id]: { item1: CATEGORY_TWO }
      })
    ).toEqual({
      itemCollection: [
        { itemSelector: SELECTOR_ALPHA },
        { itemCategory: CATEGORY_TWO }
      ]
    })
  })
})

// ---------------------------------------------------------------------------
// Stored vocabulary passes through unchanged — the manifest's gates compare
// the same values the pages store. The count is the one coercion.
// ---------------------------------------------------------------------------

describe('#fulfilments — stored values pass through', () => {
  it('Should store the picked value for a collection entry selector', () => {
    const fulfilments = assembleFulfilments({
      itemCollection: [{ itemSelector: SELECTOR_ALPHA }]
    })
    expect(fulfilments[itemSelector.id]).toEqual({ item0: SELECTOR_ALPHA })
  })

  it('Should store branchSelector, variantSelector and lookupField as the pages submit them', () => {
    const fulfilments = assembleFulfilments({
      branchSelector: BRANCH_A,
      variantSelector: VARIANT_ONE,
      lookupField: LOOKUP_ONE
    })
    expect(fulfilments[branchSelector.id]).toBe(BRANCH_A)
    expect(fulfilments[variantSelector.id]).toBe(VARIANT_ONE)
    expect(fulfilments[lookupField.id]).toBe(LOOKUP_ONE)
  })

  it('Should leave every other field untouched', () => {
    const answers = {
      branchAField: VALUE_ONE,
      enumScalarField: OPTION_ONE,
      modeSelector: MODE_BRAVO,
      modeGatedList: [VALUE_ONE, VALUE_TWO],
      itemCollection: [{ itemTags: [TAG_ONE, TAG_TWO] }]
    }
    const fulfilments = assembleFulfilments(answers)
    expect(fulfilments[branchAField.id]).toBe(VALUE_ONE)
    expect(fulfilments[enumScalarField.id]).toBe(OPTION_ONE)
    expect(fulfilments[modeSelector.id]).toBe(MODE_BRAVO)
    expect(fulfilments[modeGatedList.id]).toEqual([VALUE_ONE, VALUE_TWO])
    expect(fulfilments[itemTags.id]).toEqual({ item0: [TAG_ONE, TAG_TWO] })
  })

  it('Should keep an unparseable count raw for controller-side validation', () => {
    const fulfilments = assembleFulfilments({
      itemCollection: [{ itemCount: 'not-a-number' }]
    })
    expect(fulfilments[itemCount.id]).toEqual({ item0: 'not-a-number' })
  })
})

// ---------------------------------------------------------------------------
// Bounded collection — the answers' repeatable collection maps to the
// model's `boundedCollection`. Both model the same nested topology, so it
// bridges as an ordinary collection <-> collection mapping (like
// itemCollection).
// ---------------------------------------------------------------------------

describe('#fulfilments — bounded collection topology (answers collection <-> model collection)', () => {
  const answers = {
    boundedCollection: [
      {
        boundedItemType: BOUNDED_TYPE_ONE,
        boundedItemMode: BOUNDED_MODE_ONE,
        boundedItemReference: BOUNDED_REFERENCE,
        boundedItemDate: dateValue({
          day: '12',
          month: '12',
          year: '2025'
        }),
        boundedItemUploadId: UPLOAD_ID,
        boundedItemFilename: FILENAME
      },
      { boundedItemType: BOUNDED_TYPE_TWO }
    ]
  }

  it('Should map each bounded field to a records-map keyed by entry instance', () => {
    const fulfilments = assembleFulfilments(answers)
    expect(fulfilments[boundedItemType.id]).toEqual({
      bounded0: BOUNDED_TYPE_ONE,
      bounded1: BOUNDED_TYPE_TWO
    })
    expect(fulfilments[boundedItemMode.id]).toEqual({
      bounded0: BOUNDED_MODE_ONE
    })
    expect(fulfilments[boundedItemReference.id]).toEqual({
      bounded0: BOUNDED_REFERENCE
    })
    expect(fulfilments[boundedItemDate.id]).toEqual({
      bounded0: { day: '12', month: '12', year: '2025' }
    })
    expect(fulfilments[boundedItemUploadId.id]).toEqual({
      bounded0: UPLOAD_ID
    })
    expect(fulfilments[boundedItemFilename.id]).toEqual({
      bounded0: FILENAME
    })
  })

  it('Should round-trip the upload id and filename across a MULTI-entry collection answers->fulfilments->answers', () => {
    const recovered = projectAnswers(assembleFulfilments(answers))
    expect(recovered.boundedCollection).toHaveLength(2)
    expect(recovered.boundedCollection[0]).toEqual({
      boundedItemType: BOUNDED_TYPE_ONE,
      boundedItemMode: BOUNDED_MODE_ONE,
      boundedItemReference: BOUNDED_REFERENCE,
      boundedItemDate: {
        day: '12',
        month: '12',
        year: '2025'
      },
      boundedItemUploadId: UPLOAD_ID,
      boundedItemFilename: FILENAME
    })
    expect(recovered.boundedCollection[1]).toEqual({
      boundedItemType: BOUNDED_TYPE_TWO
    })
  })
})
