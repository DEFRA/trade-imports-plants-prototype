import { beforeAll, describe, it, expect } from 'vitest'
import { configureReadyForCheckYourAnswers, makeScope } from '../engine/read.js'
import { rawInScope } from './scope.js'
import { evaluateAnswers } from './evaluation.js'
import {
  BRANCH_A,
  BRANCH_C,
  FLOW_ONLY_KEY,
  MODE_BRAVO,
  MODE_CHARLIE,
  SELECTOR_ALPHA,
  SELECTOR_CHARLIE,
  SELECTOR_ECHO,
  TAG_ONE,
  TOGGLE_NO,
  TOGGLE_YES,
  VALUE_ONE,
  VALUE_TWO,
  VARIANT_ONE,
  VARIANT_TWO
} from '../../../../test/fixtures/index.js'

// The scope projection, pinned against the fixture manifest: each gate scopes
// its obligation in/out as the manifest declares, positional keys project under
// multi-entry / multi-record answers, and makeScope returns the scope object
// the controllers consume.

// Pin readiness false through the test override seam.
beforeAll(() => configureReadyForCheckYourAnswers(() => false))

const resolveToggle = (answers) => ({
  statusToggle: TOGGLE_YES,
  statusFlipField: VALUE_TWO,
  ...answers
})

const FIRST_ENTRY_SELECTOR = 'itemCollection[0].itemSelector'

const entry = (selector, records) => ({
  itemSelector: selector,
  itemTags: [TAG_ONE],
  itemCount: String(records.length),
  nestedCollection: records
})

describe('scope bridge — per-gate scoping', () => {
  it('Should keep statusFlipField in scope whatever the toggle answers (retain-value)', () => {
    expect(
      makeScope(resolveToggle({ scalarField: VALUE_ONE })).has(
        'statusFlipField'
      )
    ).toBe(true)
    expect(
      makeScope({
        scalarField: VALUE_ONE,
        statusToggle: TOGGLE_NO,
        statusFlipField: VALUE_TWO
      }).has('statusFlipField')
    ).toBe(true)
    // Unanswered toggle — still in scope, optional.
    expect(makeScope({ scalarField: VALUE_ONE }).has('statusFlipField')).toBe(
      true
    )
  })

  it('Should scope branchAField only under branch A', () => {
    expect(
      makeScope(
        resolveToggle({
          branchSelector: BRANCH_A,
          branchAField: VALUE_ONE
        })
      ).has('branchAField')
    ).toBe(true)
    expect(
      makeScope(resolveToggle({ branchSelector: BRANCH_C })).has('branchAField')
    ).toBe(false)
  })

  it('Should scope the variant-one + listed-mode branch', () => {
    const scope = makeScope(
      resolveToggle({
        variantSelector: VARIANT_ONE,
        modeSelector: MODE_BRAVO,
        modeGatedList: [VALUE_ONE]
      })
    )
    expect(scope.has('variantOneBlock')).toBe(true)
    expect(scope.has('modeGatedList')).toBe(true)
  })

  it('Should scope the variant-two + unlisted-mode branch', () => {
    const scope = makeScope(
      resolveToggle({
        variantSelector: VARIANT_TWO,
        modeSelector: MODE_CHARLIE
      })
    )
    expect(scope.has('variantTwoBlock')).toBe(true)
    expect(scope.has('modeGatedList')).toBe(false)
  })

  it('Should project positional keys across multi-entry / multi-record answers', () => {
    const scope = makeScope(
      resolveToggle({
        itemCollection: [
          entry(SELECTOR_ALPHA, [
            { nestedGatedFieldA: 'A-111' },
            { nestedGatedFieldA: 'A-222' }
          ]),
          entry(SELECTOR_CHARLIE, [{ nestedGatedFieldC: 'C-111' }])
        ]
      })
    )
    expect(scope.has(FIRST_ENTRY_SELECTOR)).toBe(true)
    expect(scope.has('itemCollection[1].itemSelector')).toBe(true)
  })

  it('Should scope the nested fallback fields only where no typed selector matches', () => {
    const scope = makeScope(
      resolveToggle({
        itemCollection: [
          entry(SELECTOR_ALPHA, [{ nestedGatedFieldA: 'A-111' }]),
          entry(SELECTOR_ECHO, [{ nestedFallbackFieldA: 'fallback-111' }])
        ]
      })
    )
    expect(
      scope.has('itemCollection[0].nestedCollection[0].nestedGatedFieldA')
    ).toBe(true)
    expect(
      scope.has('itemCollection[0].nestedCollection[0].nestedFallbackFieldA')
    ).toBe(false)
    expect(
      scope.has('itemCollection[1].nestedCollection[0].nestedFallbackFieldA')
    ).toBe(true)
    expect(
      scope.has('itemCollection[1].nestedCollection[0].nestedGatedFieldA')
    ).toBe(false)
  })

  it('Should keep the group node in scope for an empty required collection', () => {
    const scope = makeScope(resolveToggle({ itemCollection: [] }))
    expect(scope.has('itemCollection')).toBe(true)
    expect(scope.has(FIRST_ENTRY_SELECTOR)).toBe(false)
  })

  it('Should layer the flow-only keys onto the full scope and not the raw evaluator scope', () => {
    const answers = resolveToggle({})
    expect(makeScope(answers).has(FLOW_ONLY_KEY)).toBe(true)
    expect(rawInScope(evaluateAnswers(answers)).has(FLOW_ONLY_KEY)).toBe(false)
  })
})
