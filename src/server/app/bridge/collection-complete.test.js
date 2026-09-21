import { describe, expect, it } from 'vitest'
import { collectionView } from '../engine/evaluate/collection-view.js'
import { collectionCapAt } from '../engine/evaluate/cardinality.js'
import { entryComplete } from './collection-complete.js'
import { valueAt } from '../lib/path.js'
import { evaluateAnswers } from './evaluation.js'
import {
  BOUNDED_MODE_ONE,
  BOUNDED_TYPE_ONE,
  CATEGORY_ONE,
  compositeBlockValue,
  dateValue,
  SELECTOR_ALPHA,
  SELECTOR_DELTA,
  TAG_ONE
} from '../../../../test/fixtures/index.js'

// Per-instance completeness (entryComplete), pinned against the fixture
// manifest. The two known structural divergences are pinned here so a
// regression fails loudly.

const block = compositeBlockValue('nested')

const completeEntry = {
  itemSelector: SELECTOR_ALPHA,
  itemTags: [TAG_ONE],
  itemCategory: CATEGORY_ONE,
  itemCount: '1',
  nestedCollection: [{ nestedGatedFieldA: 'A-1', nestedCompositeBlock: block }]
}

const partialEntry = { itemSelector: SELECTOR_ALPHA }

const emptyEntry = {}

const completeFlags = (answers, collectionPath) => {
  const entries = valueAt(answers, collectionPath) ?? []
  const evaluation = evaluateAnswers(answers)
  return entries.map((_entry, index) =>
    entryComplete(evaluation, collectionPath, index)
  )
}

describe('#entryComplete', () => {
  it('Should read a multi-entry state — full / partial / empty', () => {
    const answers = {
      itemCollection: [completeEntry, partialEntry, emptyEntry]
    }
    expect(completeFlags(answers, ['itemCollection'])).toEqual([
      true,
      false,
      false
    ])
  })

  it('Should read a multi-record nested state — full record complete', () => {
    const answers = {
      itemCollection: [
        {
          itemSelector: SELECTOR_DELTA,
          itemTags: [TAG_ONE],
          itemCount: '2',
          nestedCollection: [
            { nestedGatedFieldD: 'D-1', nestedCompositeBlock: block },
            { nestedGatedFieldD: 'D-2', nestedCompositeBlock: block }
          ]
        }
      ]
    }
    const path = ['itemCollection', 0, 'nestedCollection']
    expect(completeFlags(answers, path)).toEqual([true, true])
  })

  it('Should keep entries / index / path in positional storage', () => {
    const answers = { itemCollection: [completeEntry, emptyEntry] }
    const view = collectionView(
      answers,
      ['itemCollection'],
      evaluateAnswers(answers)
    )
    expect(
      view.map((r) => ({ index: r.index, path: r.path, entry: r.entry }))
    ).toEqual([
      { index: 0, path: ['itemCollection', 0], entry: completeEntry },
      { index: 1, path: ['itemCollection', 1], entry: emptyEntry }
    ])
    // entry is the SAME reference the store held, unchanged by the evaluator.
    expect(view[0].entry).toBe(completeEntry)
  })

  // Two known structural divergences, pinned (not repaired). The evaluator
  // scopes each concern precisely, so these read complete; a future change that
  // flips them fails loudly.

  it('Should read a record without the out-of-scope composite block as complete', () => {
    const answers = {
      itemCollection: [
        {
          itemSelector: SELECTOR_ALPHA,
          itemTags: [TAG_ONE],
          itemCategory: CATEGORY_ONE,
          itemCount: '1',
          nestedCollection: [{ nestedGatedFieldA: 'A-1' }]
        }
      ]
    }
    expect(completeFlags(answers, ['itemCollection'])).toEqual([true])
  })

  it('Should read a fully-empty nested record as complete (never enumerated)', () => {
    // The evaluator infers instances from leaf composite prefixes; a record
    // with no stored leaf is never enumerated, so its unmet at-least-one rule
    // cannot fire.
    const answers = {
      itemCollection: [
        {
          itemSelector: SELECTOR_ALPHA,
          itemTags: [TAG_ONE],
          itemCount: '1',
          nestedCollection: [{}]
        }
      ]
    }
    const path = ['itemCollection', 0, 'nestedCollection']
    expect(completeFlags(answers, path)).toEqual([true])
  })

  it('Should treat an optional-fields-only bounded entry as started but incomplete', () => {
    const answers = {
      boundedCollection: [
        { boundedItemUploadId: 'upload-001', boundedItemFilename: 'file-one' }
      ]
    }
    expect(completeFlags(answers, ['boundedCollection'])).toEqual([false])
  })

  it('Should not let optional fields block a complete bounded entry', () => {
    const completeBoundedEntry = {
      boundedItemType: BOUNDED_TYPE_ONE,
      boundedItemMode: BOUNDED_MODE_ONE,
      boundedItemReference: 'reference-one',
      boundedItemDate: dateValue({ day: '12', month: '12', year: '2025' })
    }
    const answers = {
      boundedCollection: [
        completeBoundedEntry,
        {
          ...completeBoundedEntry,
          boundedItemUploadId: 'upload-001',
          boundedItemFilename: 'file-one'
        }
      ]
    }
    expect(completeFlags(answers, ['boundedCollection'])).toEqual([true, true])
  })
})

describe('collectionCapAt reads from positional storage (maxEntriesFrom)', () => {
  it('returns the positional cardinality', () => {
    const answers = {
      itemCollection: [{ itemCount: '3', nestedCollection: [{}, {}] }]
    }
    const path = ['itemCollection', 0, 'nestedCollection']
    expect(collectionCapAt(answers, path)).toBe(3)
  })
})
