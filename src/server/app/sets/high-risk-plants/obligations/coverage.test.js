/**
 * Set-owned manifest checks.
 *
 * Read the manifest directly rather than through `model/obligations/manifest`:
 * the Vitest global setup configures the journey-neutral fixture set, so the
 * configured seam would answer for the fixture and mask whatever this set
 * actually declares.
 */

import { describe, expect, it } from 'vitest'

import { ENFORCED_AT_CONTINUE } from '../../../bridge/obligation-source.js'
import { obligationMetadata } from '../../../model/obligations/helpers/index.js'
import { groups, obligations } from './index.js'

// Guard against a self-loop or a cycle hanging `buildAncestorGroups`' `while
// (cur) cur = cur.within` walk forever. A real chain is a handful of levels
// deep, so only a genuine cycle reaches this ceiling.
const MAX_WITHIN_CHAIN_DEPTH = 100

const COMMODITY_TYPE = 'commodityType'
const COUNTRY_OF_ORIGIN = 'countryOfOrigin'

const nameOf = (obligation) => obligation.name

// Reports every key seen more than once, so a failure names the offenders
// rather than just the count.
const duplicatesOf = (items, keyFn) =>
  Object.entries(Object.groupBy(items, keyFn))
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => `${key} (x${group.length})`)

const withinChainProblem = (obligation) => {
  const seen = new Set()
  let cur = obligation.within
  let depth = 0
  while (cur) {
    if (seen.has(cur.id)) {
      return `${obligation.name} -> cycle at ${cur.name}`
    }
    seen.add(cur.id)
    cur = cur.within
    depth += 1
    if (depth > MAX_WITHIN_CHAIN_DEPTH) {
      return `${obligation.name} -> chain deeper than ${MAX_WITHIN_CHAIN_DEPTH} (likely cycle)`
    }
  }
  return null
}

// What `groups` must be: the obligations another obligation's `within` points
// at, compared by identity rather than by shape.
const groupsByWithinReference = () =>
  obligations.filter((obligation) =>
    obligations.some((other) => other.within === obligation)
  )

describe('the manifest these checks read', () => {
  it('Should hold obligations, so every check below runs against real data', () => {
    // Without this the identity, chain, group and dependsOn checks below all
    // pass on an empty or half-built manifest and prove nothing.
    expect(obligations).not.toHaveLength(0)
    expect(obligations.map(nameOf)).toContain(COMMODITY_TYPE)
  })
})

describe('uniqueness — every obligation has a distinct id and name', () => {
  it('Should hold no duplicate ids in the manifest', () => {
    // Duplicate ids collide in every id-keyed structure the evaluator builds;
    // one wins and the loser is silently invisible.
    expect(duplicatesOf(obligations, (obligation) => obligation.id)).toEqual([])
  })

  it('Should hold no duplicate names in the manifest', () => {
    // Duplicate names corrupt every name-keyed lookup downstream: the
    // dictionary shows the obligation twice and a name lookup returns
    // whichever entry matches first.
    expect(duplicatesOf(obligations, nameOf)).toEqual([])
  })
})

describe('structural integrity — no cycles in `within` references', () => {
  it('Should terminate every within-chain in null', () => {
    const problems = obligations
      .map(withinChainProblem)
      .filter((problem) => problem !== null)
    expect(problems).toEqual([])
  })
})

describe('groups stay derived, never hand-maintained', () => {
  it('Should hold exactly the obligations another obligation is `within`', () => {
    // Identity, not shape: a hand-written copy of a group object would pass a
    // structural comparison and then fail every `within === group` test the
    // evaluator makes. The check is live: `commodityLine` is derived from the
    // `within` reference that category, quantity and the eight gated per-line
    // fields carry, so a hand-written stand-in for it would fail here.
    const derived = groupsByWithinReference()
    expect(groups).toHaveLength(derived.length)
    for (const [index, group] of derived.entries()) {
      expect(groups[index]).toBe(group)
    }
  })
})

describe('coverage — every gated obligation carries (or derives) dependsOn', () => {
  it('Should resolve a dependsOn array for every obligation with an applyTo', () => {
    // Closures are opaque to the reachability prover, so a gate must declare
    // the ids it reads — explicitly, or derivably through its helper
    // metadata. `obligationMetadata` resolves either; this pins that the
    // resolution terminates in an array. It runs against the eight
    // category-gated per-line fields `gatedOnCategory` builds.
    const missing = obligations
      .filter((obligation) => typeof obligation.applyTo === 'function')
      .filter(
        (obligation) => !Array.isArray(obligationMetadata(obligation).dependsOn)
      )
      .map(nameOf)
    expect(missing).toEqual([])
  })
})

describe('continue-enforced prerequisites', () => {
  it('Should enforce commodityType when the user continues', () => {
    // A contains check, never an equality one: the test fixtures merge their
    // own entries into this module-level Set at setup.
    expect(ENFORCED_AT_CONTINUE).toContain(COMMODITY_TYPE)
  })

  it('Should enforce countryOfOrigin when the user continues', () => {
    expect(ENFORCED_AT_CONTINUE).toContain(COUNTRY_OF_ORIGIN)
  })
})
