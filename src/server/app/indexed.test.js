import { beforeAll, describe, expect, it } from 'vitest'
import { makeScope } from './engine/index.js'
import { evaluateAnswers } from './bridge/evaluation.js'
import { FULFILLED, IN_PROGRESS, OPTIONAL } from './bridge/status/index.js'
import {
  readyForCheckYourAnswers,
  sectionStatus
} from './flow/section-status.js'
import { walkObligations } from './bridge/obligation-source.js'
import { buildDispatch } from './flow/dispatch.js'
import {
  BOUNDED_MODE_ONE,
  BOUNDED_TYPE_ONE,
  BRANCH_A,
  CATEGORY_ONE,
  compositeBlockValue,
  dateValue,
  dispatchPages,
  FLOW_ONLY_KEY,
  LOOKUP_ONE,
  MODE_CHARLIE,
  OPTION_ONE,
  SELECTOR_ALPHA,
  sections,
  TAG_ONE,
  TOGGLE_NO,
  VALUE_ONE,
  VARIANT_ONE
} from '../../../test/fixtures/index.js'

const itemsSection = sections.find((section) => section.id === 'items')
const boundedSection = sections.find((section) => section.id === 'bounded')

const completeBoundedEntry = {
  boundedItemType: BOUNDED_TYPE_ONE,
  boundedItemMode: BOUNDED_MODE_ONE,
  boundedItemReference: 'reference-one',
  boundedItemDate: dateValue()
}

const completeItemEntry = {
  itemSelector: SELECTOR_ALPHA,
  itemCategory: CATEGORY_ONE,
  itemTags: [TAG_ONE],
  itemGatedField: '5',
  itemCount: '1',
  nestedCollection: [{ nestedGatedFieldA: 'A-1' }]
}

describe('indexed obligations are first-class', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
  })

  it('Should enumerate sub-obligations at every depth via walkObligations', () => {
    const addresses = [...walkObligations()].map((node) => node.templatePath)
    expect(addresses).toContain('itemCollection')
    expect(addresses).toContain('itemCollection.itemSelector')
    expect(addresses).toContain('itemCollection.itemCount')
    expect(addresses).toContain(
      'itemCollection.nestedCollection.nestedGatedFieldA'
    )
  })

  it('Should scope each stored entry instance path when the collection is in scope', () => {
    const { inScope } = makeScope({
      itemCollection: [
        { itemSelector: SELECTOR_ALPHA, itemCount: '25' },
        { itemSelector: SELECTOR_ALPHA, itemCount: '9' }
      ]
    })
    expect(inScope.has('itemCollection')).toBe(true)
    expect(inScope.has('itemCollection[0].itemSelector')).toBe(true)
    expect(inScope.has('itemCollection[0].itemCount')).toBe(true)
    expect(inScope.has('itemCollection[1].itemSelector')).toBe(true)
    expect(inScope.has('itemCollection[1].itemCount')).toBe(true)
  })

  it('Should treat an entry with a blank required sub-field as incomplete (per-item completeness)', () => {
    const complete = {
      scalarField: VALUE_ONE,
      statusToggle: TOGGLE_NO,
      enumScalarField: OPTION_ONE,
      branchSelector: BRANCH_A,
      branchAField: VALUE_ONE,
      aggregateGatedField: 'aggregate-one',
      itemCollection: [completeItemEntry],
      compositeBlockOne: compositeBlockValue('one'),
      compositeBlockTwo: compositeBlockValue('two'),
      compositeBlockThree: compositeBlockValue('three'),
      compositeBlockFour: compositeBlockValue('four'),
      compositeBlockFive: compositeBlockValue('five'),
      compositeBlockSix: compositeBlockValue('six'),
      lookupField: LOOKUP_ONE,
      dateField: dateValue({ day: '12', month: '12', year: '2026' }),
      modeSelector: MODE_CHARLIE,
      textFieldOne: 'text-one',
      textFieldTwo: 'text-two',
      variantSelector: VARIANT_ONE,
      variantOneBlock: compositeBlockValue('variant-one'),
      [FLOW_ONLY_KEY]: 'confirmed'
    }
    const incomplete = {
      ...complete,
      itemCollection: [{ itemSelector: SELECTOR_ALPHA }]
    }
    expect(
      readyForCheckYourAnswers(
        complete,
        makeScope(complete).inScope,
        evaluateAnswers(complete)
      )
    ).toBe(true)
    expect(
      readyForCheckYourAnswers(
        incomplete,
        makeScope(incomplete).inScope,
        evaluateAnswers(incomplete)
      )
    ).toBe(false)
  })

  it('Should read an untouched optional section as OPTIONAL (not Completed, does not count)', () => {
    const answers = {}
    expect(
      sectionStatus(
        boundedSection,
        answers,
        makeScope(answers).inScope,
        evaluateAnswers(answers)
      )
    ).toBe(OPTIONAL)
  })

  it('Should read an optional section with an incomplete entry as IN_PROGRESS', () => {
    const answers = {
      boundedCollection: [{ boundedItemType: BOUNDED_TYPE_ONE }]
    }
    expect(
      sectionStatus(
        boundedSection,
        answers,
        makeScope(answers).inScope,
        evaluateAnswers(answers)
      )
    ).toBe(IN_PROGRESS)
  })

  it('Should read an optional section with a complete entry as FULFILLED', () => {
    const answers = { boundedCollection: [completeBoundedEntry] }
    expect(
      sectionStatus(
        boundedSection,
        answers,
        makeScope(answers).inScope,
        evaluateAnswers(answers)
      )
    ).toBe(FULFILLED)
  })

  it('Should roll per-item completeness into the items section status', () => {
    const withIncompleteEntry = {
      itemCollection: [{ itemSelector: SELECTOR_ALPHA }]
    }
    const withCompleteEntry = { itemCollection: [completeItemEntry] }
    expect(
      sectionStatus(
        itemsSection,
        withIncompleteEntry,
        makeScope(withIncompleteEntry).inScope,
        evaluateAnswers(withIncompleteEntry)
      )
    ).toBe(IN_PROGRESS)
    expect(
      sectionStatus(
        itemsSection,
        withCompleteEntry,
        makeScope(withCompleteEntry).inScope,
        evaluateAnswers(withCompleteEntry)
      )
    ).toBe(FULFILLED)
  })
})
