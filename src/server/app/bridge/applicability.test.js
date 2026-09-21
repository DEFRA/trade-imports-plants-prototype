import { describe, expect, it } from 'vitest'
import { appliesForCommodity, gateAdmits } from './applicability.js'
import {
  SELECTOR_ALPHA,
  SELECTOR_BRAVO,
  SELECTOR_CHARLIE,
  SELECTOR_DELTA,
  SELECTOR_ECHO
} from '../../../../test/fixtures/index.js'

const LISTED_SELECTOR = 'selector-a'

// State-free applicability, pinned against the fixture manifest's gate
// metadata: an allowlist gate applies inside its list, a complement gate
// applies outside the derived union, and an ungated obligation never
// applies here.

describe('#appliesForCommodity', () => {
  it('Should apply an allowListed obligation for a value in its list', () => {
    expect(appliesForCommodity('nestedGatedFieldC', SELECTOR_CHARLIE)).toBe(
      true
    )
    expect(appliesForCommodity('nestedGatedFieldA', SELECTOR_ALPHA)).toBe(true)
    expect(appliesForCommodity('nestedCompositeBlock', SELECTOR_DELTA)).toBe(
      true
    )
  })

  it('Should not apply an allowListed obligation for a value outside its list', () => {
    expect(appliesForCommodity('nestedGatedFieldC', SELECTOR_ALPHA)).toBe(false)
    expect(appliesForCommodity('nestedCompositeBlock', SELECTOR_ALPHA)).toBe(
      false
    )
  })

  it('Should apply an anyAllowListed obligation per its allowlist', () => {
    expect(appliesForCommodity('aggregateGatedToggle', SELECTOR_BRAVO)).toBe(
      true
    )
    expect(appliesForCommodity('aggregateGatedField', SELECTOR_BRAVO)).toBe(
      false
    )
  })

  it('Should invert for notInUnionOf obligations — the fallback fields apply only outside the typed union', () => {
    expect(appliesForCommodity('nestedFallbackFieldA', SELECTOR_ECHO)).toBe(
      true
    )
    expect(appliesForCommodity('nestedFallbackFieldB', SELECTOR_ECHO)).toBe(
      true
    )
    expect(appliesForCommodity('nestedFallbackFieldA', SELECTOR_ALPHA)).toBe(
      false
    )
  })

  it('Should treat an unknown value as outside every allowlist', () => {
    expect(appliesForCommodity('nestedGatedFieldC', 'no-such-value')).toBe(
      false
    )
    expect(appliesForCommodity('nestedFallbackFieldA', 'no-such-value')).toBe(
      true
    )
  })

  it('Should never apply for an obligation with no gate', () => {
    expect(appliesForCommodity('scalarField', SELECTOR_ALPHA)).toBe(false)
    expect(appliesForCommodity('no-such-obligation', SELECTOR_ALPHA)).toBe(
      false
    )
  })
})

// The manifest carries no complement gate today, so the inversion is pinned
// against the metadata shape directly rather than through a named obligation.
describe('#gateAdmits', () => {
  it('Should admit a value its allowlist holds', () => {
    expect(
      gateAdmits(
        { gateType: 'allowListed', values: [LISTED_SELECTOR] },
        LISTED_SELECTOR
      )
    ).toBe(true)
    expect(
      gateAdmits(
        { gateType: 'allowListed', values: [LISTED_SELECTOR] },
        'selector-c'
      )
    ).toBe(false)
  })

  it('Should invert for a notInUnionOf complement gate', () => {
    const gate = { gateType: 'notInUnionOf', values: [LISTED_SELECTOR] }
    expect(gateAdmits(gate, 'selector-c')).toBe(true)
    expect(gateAdmits(gate, LISTED_SELECTOR)).toBe(false)
  })

  it('Should admit nothing without gate metadata', () => {
    expect(gateAdmits(undefined, LISTED_SELECTOR)).toBe(false)
    expect(gateAdmits({}, LISTED_SELECTOR)).toBe(false)
  })
})
