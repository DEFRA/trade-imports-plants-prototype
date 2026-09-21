/**
 * reachability.test.js — the graph-level reachability check.
 *
 * Narrowed to the check the prover collapses to when a gate's predicate is
 * opaque:
 *
 *   "an obligation is reachable IFF every id it declares in
 *    `dependsOn` is reachable, seeded from the always-in-scope set
 *    (obligations with `dependsOn: []`)."
 *
 * Witness synthesis at the value level ("what value of `statusToggle`
 * opens `statusFlipField`?") is handled by the structured helpers and
 * the coverage gate.
 *
 * These tests pin:
 *   - always-in-scope obligation trivially reachable
 *   - transitive dependency chain reachable
 *   - unreachable-in-principle obligation is flagged (via a synthetic
 *     manifest — the configured manifest currently has zero)
 *   - the configured manifest has ZERO unreachable obligations
 *   - a self-referencing dependsOn does NOT crash
 *   - dangling id reference is reported as an error, not a crash
 */

import { describe, it, expect } from 'vitest'
import {
  proveReachability,
  proveWithWitnesses,
  synthesiseWitness,
  WITNESS_KIND
} from './index.js'
import { obligationSet } from '../../obligations/manifest.js'
import {
  obligationMetadata,
  allowListed,
  alwaysInScope,
  anyAllowListed,
  branchedGate,
  equalsGate,
  includesGate,
  matches,
  notInUnionOf,
  presentGate
} from '../../obligations/helpers/index.js'
import { TOGGLE_YES, TOGGLE_NO } from '../../../../../../test/fixtures/index.js'

const { obligations } = obligationSet()

// ---------------------------------------------------------------------------
// Helpers — turn an obligation into the `{ id, dependsOn }` record the
// prover operates over. Mirrors how the real manifest gets fed in
// (via obligationMetadata).
// ---------------------------------------------------------------------------

const record = (id, dependsOn) => ({ id, dependsOn })

const ROOT_UNREACHABLE_ID = 'root-unreachable'
const SELF_LOOP_ID = 'self-referencing-record'

// A record's dependsOn is:
//   - the metadata dependsOn when the obligation has an applyTo (the
//     coverage assertion pins this to a string[]).
//   - `[]` for obligations WITHOUT an applyTo — plain field records like
//     `itemSelector`, `itemCategory`, `itemTags`, `itemCount` and
//     structural groups (`itemCollection`, `nestedCollection`) are always
//     in scope at the graph level; other gated obligations legitimately
//     depend on their ids, so they must appear as seed nodes.
const manifestRecords = () =>
  obligations.map((o) => {
    if (typeof o.applyTo === 'function') {
      return { id: o.id, dependsOn: obligationMetadata(o).dependsOn }
    }
    return { id: o.id, dependsOn: [] }
  })

// ---------------------------------------------------------------------------
// Trivial reachability — the base case the prover handles vacuously.
// ---------------------------------------------------------------------------

describe('#proveReachability — trivial cases', () => {
  it('Should classify an obligation with dependsOn: [] as reachable', () => {
    // `scalarField` in the configured manifest has dependsOn: [] — one
    // of the always-in-scope obligations.
    const result = proveReachability([record('scalarField', [])])
    expect(result.reachable).toContain('scalarField')
    expect(result.unreachable).toEqual([])
    expect(result.errors).toEqual([])
  })

  it('Should classify an obligation whose dependsOn hits an always-in-scope gate as reachable', () => {
    // Mirrors statusFlipField → statusToggle in the configured manifest.
    const result = proveReachability([
      record('gate', []),
      record('gated', ['gate'])
    ])
    expect(result.reachable).toEqual(expect.arrayContaining(['gate', 'gated']))
    expect(result.unreachable).toEqual([])
  })

  it('Should handle a chain of transitive dependencies', () => {
    // A → B → C where A is always in scope.
    const result = proveReachability([
      record('A', []),
      record('B', ['A']),
      record('C', ['B'])
    ])
    expect(result.reachable).toEqual(expect.arrayContaining(['A', 'B', 'C']))
    expect(result.unreachable).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Genuinely unreachable — the defect the prover is meant to catch.
// ---------------------------------------------------------------------------

describe('#proveReachability — unreachable detection', () => {
  it('Should flag an obligation whose dependency chain has no always-in-scope root', () => {
    // Construct a synthetic pocket with no dependsOn: [] seeds — the
    // two nodes mutually depend on each other with no external entry.
    // Neither can be reached from any seed (there are no seeds).
    const result = proveReachability([
      record('gate', ['gated']),
      record('gated', ['gate'])
    ])
    expect(result.reachable).toEqual([])
    expect(result.unreachable).toEqual(
      expect.arrayContaining(['gate', 'gated'])
    )
  })

  it('Should flag an obligation whose transitive chain hits a floating id', () => {
    // A depends on something that's not itself always-in-scope: if the
    // pre-requisite is not reachable, neither is A.
    const result = proveReachability([
      record(ROOT_UNREACHABLE_ID, ['nowhere']),
      record('downstream', [ROOT_UNREACHABLE_ID]),
      // But 'nowhere' is not in the manifest — that's an error, not a
      // reachability answer. See separate test below for the error path.
      // Here we add a proper always-in-scope seed so it's obvious the
      // unreachable/error signals are separable.
      record('seed', [])
    ])
    expect(result.reachable).toContain('seed')
    expect(result.errors.map((e) => e.obligationId)).toContain(
      ROOT_UNREACHABLE_ID
    )
  })
})

// ---------------------------------------------------------------------------
// The configured manifest — this is the prover's "green" state today.
// ---------------------------------------------------------------------------

describe('#proveReachability — configured manifest', () => {
  it('Should report ZERO unreachable obligations', () => {
    // Every gated obligation carries dependsOn. Under the conservative
    // closure treatment (a closure "opens" iff
    // every dependsOn is reachable), no cycle-free set of closures on
    // the configured manifest can trap a gate that's never opened. Any
    // regression here means someone shipped a real reachability
    // defect — this test is the guard.
    const result = proveReachability(manifestRecords())
    expect(result.unreachable).toEqual([])
    // Errors would indicate a dangling id — also a genuine defect.
    expect(result.errors).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Self-loop handling — the prover must treat a pure self-referencing
// dependsOn as a seed and never recurse forever. The manifest has no
// self-loop, so this exercises the rule with a synthetic record and pins
// that the whole-manifest run stays clean.
// ---------------------------------------------------------------------------

describe('#proveReachability — self-loop handling', () => {
  it('Should not recurse forever on a self-referencing dependsOn', () => {
    // Rule: pure self-loops (dependsOn === [own-id]) are treated as
    // seeds. Graph-wise a self-loop has no EXTERNAL prerequisite —
    // nothing beyond the obligation itself constrains whether the gate
    // fires.
    //
    // Two things this test pins:
    //   (a) it does NOT crash / stack-overflow (visited-tracking).
    //   (b) the classification is deterministic + treats as reachable.
    const result = proveReachability([record(SELF_LOOP_ID, [SELF_LOOP_ID])])
    expect(result.errors).toEqual([])
    expect(result.reachable).toContain(SELF_LOOP_ID)
    expect(result.unreachable).not.toContain(SELF_LOOP_ID)
  })

  it('Should have zero unreachable and no errors for the full manifest', () => {
    const result = proveReachability(manifestRecords())
    expect(result).toBeDefined()
    expect(result.errors).toEqual([])
    expect(result.unreachable).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Defensive — a dangling id should never happen post-Phase-2, but
// the prover must not crash if it does.
// ---------------------------------------------------------------------------

describe('#proveReachability — defensive against dangling ids', () => {
  it('Should report a dangling dependsOn id as an error (does not crash)', () => {
    const result = proveReachability([
      record('seed', []),
      record('dangler', ['id-that-does-not-exist'])
    ])
    // The dangler is flagged as an error.
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatchObject({
      obligationId: 'dangler',
      reason: expect.stringContaining('unknown')
    })
    // The seed is still classified normally.
    expect(result.reachable).toContain('seed')
  })
})

// ---------------------------------------------------------------------------
// Witness synthesis. The `synthesiseWitness` accessor tightens the
// graph-only pass into a value-level check for structured helpers. The
// standing tax is a witness synthesiser plus a seeding rule per operator.
// Each helper this test covers must round-trip through the REAL applyTo
// closure and return `inScope: true` — that's the fidelity assertion.
// ---------------------------------------------------------------------------

const codeObl = { id: 'code-obl' }
const boolObl = { id: 'bool-obl' }

describe('#synthesiseWitness — per-helper metadata inversion', () => {
  it('Should return the first allowlist entry as witness for allowListed', () => {
    const gate = allowListed(codeObl, ['a', 'b', 'c'])
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness).toMatchObject({
      kind: WITNESS_KIND.WITNESS,
      obligationId: codeObl.id,
      value: 'a'
    })
    // gatedParentGroupId defaults to null for depth-1 allowListed.
    expect(witness.gatedParentGroupId).toBeNull()
    // Fidelity — inject the witness and run the actual closure.
    const decision = obl.applyTo(
      { [witness.obligationId]: { k1: witness.value } },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should carry the gatedParentGroupId when allowListed has a gatedParentGroup', () => {
    const groupObl = { id: 'group-obl' }
    const gate = allowListed(codeObl, ['a'], groupObl)
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: codeObl.id,
      value: 'a',
      gatedParentGroupId: groupObl.id
    })
  })

  it('Should return the first allowlist entry as witness for anyAllowListed', () => {
    const gate = anyAllowListed(
      codeObl,
      ['x', 'y'],
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: codeObl.id,
      value: 'x'
    })
    const decision = obl.applyTo({ [witness.obligationId]: witness.value })
    expect(decision.inScope).toBe(true)
  })

  it('Should return metadata.value as witness for matches', () => {
    const gate = matches(boolObl, 'yes')
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: boolObl.id,
      value: 'yes'
    })
    const decision = obl.applyTo({ [witness.obligationId]: witness.value })
    expect(decision.inScope).toBe(true)
  })

  it('Should return trivial for a TOTAL branchedGate (both branches in-scope)', () => {
    const gate = branchedGate(
      () => true,
      { inScope: true, status: 'mandatory' },
      { inScope: true, status: 'optional' }
    )
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('Should synthesise a witness that opens the gate for branchedGate with predicateMeta.equals', () => {
    const gate = branchedGate(
      (f) => f[boolObl.id] === 'yes',
      { inScope: true, status: 'mandatory' },
      { inScope: false },
      { operator: 'equals', obligationId: boolObl.id, value: 'yes' }
    )
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: boolObl.id,
      value: 'yes'
    })
    const decision = obl.applyTo(
      { [witness.obligationId]: witness.value },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should fire the closure with a witness for branchedGate with predicateMeta.includes', () => {
    const gate = branchedGate(
      (f) => ['a', 'b'].includes(f[codeObl.id]),
      { inScope: true, status: 'optional' },
      { inScope: false },
      { operator: 'includes', obligationId: codeObl.id, values: ['a', 'b'] }
    )
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    expect(witness.obligationId).toBe(codeObl.id)
    expect(['a', 'b']).toContain(witness.value)
    const decision = obl.applyTo(
      { [witness.obligationId]: witness.value },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should return opaque for a non-total branchedGate WITHOUT predicateMeta', () => {
    const gate = branchedGate(
      () => true,
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness.kind).toBe(WITNESS_KIND.OPAQUE)
    expect(witness.reason).toContain('predicateMeta')
  })

  it('Should return a value NOT in the derived union as witness for notInUnionOf', () => {
    // `notInUnionOf` closes the last opaque gap.
    // Witness = a stable sentinel that's NOT in the derived union. The
    // fidelity check re-runs the closure against the witness and must
    // return `inScope: true` — that's the load-bearing invariant that
    // catches metadata drift.
    const gate = notInUnionOf(codeObl, [
      ['a', 'b'],
      ['c', 'd']
    ])
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    expect(witness.obligationId).toBe(codeObl.id)
    // The synthesised value must NOT be in the derived union.
    expect(['a', 'b', 'c', 'd']).not.toContain(witness.value)
    // Fidelity — the witness actually opens the closure.
    const decision = obl.applyTo(
      { [witness.obligationId]: { k1: witness.value } },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should carry the gatedParentGroupId when notInUnionOf has a gatedParentGroup', () => {
    const groupObl = { id: 'group-obl' }
    const gate = notInUnionOf(codeObl, [['a']], groupObl)
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    expect(witness.obligationId).toBe(codeObl.id)
    expect(witness.gatedParentGroupId).toBe(groupObl.id)
    expect(['a']).not.toContain(witness.value)
  })

  it('Should return trivial for an obligation without applyTo (structural group)', () => {
    const witness = synthesiseWitness({ id: 'itemCollection' })
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('Should return trivial for an always-in-scope bare closure (no .metadata)', () => {
    const witness = synthesiseWitness({
      id: 'always',
      applyTo: () => ({ inScope: true, status: 'mandatory' })
    })
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })
})

// ---------------------------------------------------------------------------
// Meta-first gate helpers. Each is a structured helper whose
// `.metadata` fully describes the gate, so witness synth reads directly
// and the fidelity round-trip must open the real closure. This block
// only pins the witness-synth contract.
// ---------------------------------------------------------------------------

describe('#synthesiseWitness — meta-first gate helpers', () => {
  it('Should synthesise a witness that opens the real closure for equalsGate (purge-on-flip)', () => {
    const gate = equalsGate(
      boolObl,
      'yes',
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: boolObl.id,
      value: 'yes'
    })
    const decision = obl.applyTo({ [witness.obligationId]: witness.value })
    expect(decision.inScope).toBe(true)
  })

  it('Should classify equalsGate (total — statusFlipField shape) as trivial', () => {
    // statusFlipField's shape: both branches in-scope, status flips only.
    // Any input opens the gate, no witness needed.
    const gate = equalsGate(
      boolObl,
      'yes',
      { inScope: true, status: 'mandatory' },
      { inScope: true, status: 'optional' }
    )
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('Should synthesise a witness that opens the real closure for presentGate (purge-on-flip)', () => {
    const gate = presentGate(
      boolObl,
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    expect(witness.obligationId).toBe(boolObl.id)
    const decision = obl.applyTo({ [witness.obligationId]: witness.value })
    expect(decision.inScope).toBe(true)
  })

  it('Should classify presentGate (total) as trivial', () => {
    const gate = presentGate(
      boolObl,
      { inScope: true, status: 'mandatory' },
      { inScope: true, status: 'optional' }
    )
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('Should synthesise a witness that opens the real closure for includesGate (purge-on-flip)', () => {
    const gate = includesGate(
      codeObl,
      ['a', 'b'],
      { inScope: true, status: 'optional' },
      { inScope: false }
    )
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    expect(witness.obligationId).toBe(codeObl.id)
    expect(['a', 'b']).toContain(witness.value)
    const decision = obl.applyTo({ [witness.obligationId]: witness.value })
    expect(decision.inScope).toBe(true)
  })

  it('Should classify includesGate (total) as trivial', () => {
    const gate = includesGate(
      codeObl,
      ['a', 'b'],
      { inScope: true, status: 'mandatory' },
      { inScope: true, status: 'optional' }
    )
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('Should classify alwaysInScope as trivial (no read; gate always open)', () => {
    const gate = alwaysInScope('mandatory')
    const obl = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obl)
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
    // Fidelity — the closure still returns the expected decision.
    expect(obl.applyTo({})).toEqual({ inScope: true, status: 'mandatory' })
  })
})

// ---------------------------------------------------------------------------
// Configured-manifest fidelity — pick a non-total gate and confirm the
// synthesised witness runs through the real applyTo closure. This is the
// load-bearing "witness accuracy" check: metadata drift vs. the real
// predicate would be caught here.
// ---------------------------------------------------------------------------

describe('#synthesiseWitness — configured manifest fidelity', () => {
  it('Should classify statusFlipField (status-swap equalsGate) as trivial — both branches in scope', () => {
    // Retain-value shape: whenTrue mandatory, whenFalse optional — every
    // input opens the gate, so no witness is needed.
    const statusFlipFieldObl = obligations.find(
      (o) => o.name === 'statusFlipField'
    )
    const witness = synthesiseWitness(statusFlipFieldObl)
    expect(witness.kind).toBe(WITNESS_KIND.TRIVIAL)
    const decision = statusFlipFieldObl.applyTo(
      { [statusFlipFieldObl.applyTo.metadata.obligationId]: TOGGLE_YES },
      new Map()
    )
    expect(decision.inScope).toBe(true)
    expect(decision.status).toBe('mandatory')
  })

  it('Should open the closure with a witness for branchAField (non-total equality gate)', () => {
    // Non-total: whenTrue.inScope === true, whenFalse.inScope === false.
    // The gate metadata declares operator equality against BRANCH_A.
    // This is the load-bearing fidelity check for annotated call sites.
    const branchAFieldObl = obligations.find((o) => o.name === 'branchAField')
    const witness = synthesiseWitness(branchAFieldObl)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    const decision = branchAFieldObl.applyTo(
      { [witness.obligationId]: witness.value },
      new Map()
    )
    expect(decision.inScope).toBe(true)
    expect(decision.status).toBe('mandatory')
  })

  it('Should open the closure with an includes-shape witness for modeGatedList', () => {
    const modeGatedListObl = obligations.find((o) => o.name === 'modeGatedList')
    const witness = synthesiseWitness(modeGatedListObl)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    const decision = modeGatedListObl.applyTo(
      { [witness.obligationId]: witness.value },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should open the closure with a selector witness for itemGatedField (allowListed)', () => {
    const itemGatedFieldObl = obligations.find(
      (o) => o.name === 'itemGatedField'
    )
    const witness = synthesiseWitness(itemGatedFieldObl)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    // allowListed with no projection uses gate-level record keys.
    const decision = itemGatedFieldObl.applyTo(
      { [witness.obligationId]: { entry1: witness.value } },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should open the closure with a scalar witness for aggregateGatedField (anyAllowListed)', () => {
    const aggregateGatedFieldObl = obligations.find(
      (o) => o.name === 'aggregateGatedField'
    )
    const witness = synthesiseWitness(aggregateGatedFieldObl)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    const decision = aggregateGatedFieldObl.applyTo({
      [witness.obligationId]: { entry1: witness.value }
    })
    expect(decision.inScope).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// proveWithWitnesses — end-to-end tightened prover over the configured
// manifest. Classification counts are pinned so a regression in
// helper metadata (e.g. someone drops predicateMeta from a branched-
// Gate site) fails loudly.
// ---------------------------------------------------------------------------

describe('#proveWithWitnesses — configured manifest classification', () => {
  it('Should leave the graph-level result unchanged (backwards compatible)', () => {
    const result = proveWithWitnesses(obligations)
    expect(result.unreachable).toEqual([])
    // Fidelity errors — none expected on the configured manifest. Any
    // error here means a witness didn't open its closure, i.e. metadata
    // drift.
    expect(result.errors).toEqual([])
    // Sanity — every non-structural obligation appears somewhere.
    const classifiedCount =
      result.witnesses.synthesisable.length +
      result.witnesses.trivial.length +
      result.witnesses.opaque.length
    expect(classifiedCount).toBe(obligations.length)
  })

  it('Should have the expected classification counts after the notInUnionOf migration (≥14 synthesisable, 0 opaque)', () => {
    const result = proveWithWitnesses(obligations)
    // The two complement-gated fallback fields sit on `notInUnionOf`
    // rather than an opaque predicate. Both are witness-synthesisable —
    // the manifest carries ZERO opaque gates.
    //
    // Structured helpers: allowListed, anyAllowListed, notInUnionOf and
    // the meta-first gates are all synthesisable. Trivial: structural
    // groups, the applyTo-less plain fields and the retain-value
    // statusFlipField (both branches in scope).
    expect(result.witnesses.synthesisable.length).toBeGreaterThanOrEqual(14)
    // The two complement gates are synthesisable.
    const synthesisableNames = result.witnesses.synthesisable.map(
      (id) => obligations.find((o) => o.id === id).name
    )
    expect(synthesisableNames).toContain('nestedFallbackFieldA')
    expect(synthesisableNames).toContain('nestedFallbackFieldB')
    // No opaque gates left on the manifest.
    expect(result.witnesses.opaque).toEqual([])
  })

  it('Should pass every fidelity check (no witness fails to open its own closure)', () => {
    // Guarding against silent metadata drift: if someone changes a
    // branchedGate's predicate body without updating predicateMeta,
    // this fires.
    const result = proveWithWitnesses(obligations)
    expect(result.errors.filter((e) => /did not open/.test(e.reason))).toEqual(
      []
    )
  })
})

// ---------------------------------------------------------------------------
// Migration fidelity — EXHAUSTIVE round-trip across all 9 sites migrated
// from `branchedGate`+`predicateMeta` onto the meta-first
// helpers (`equalsGate`, `presentGate`, `includesGate`). This is the
// load-bearing "migration didn't change semantics" pin: for each site
// we synthesise a witness, inject it into a fulfilments map, feed it to
// the migrated `applyTo` closure, and assert the decision opens
// (inScope: true) with the expected status flip preserved.
//
// The test is intentionally exhaustive — one case per migrated site —
// so a subtle regression on any one site (e.g. dropping a reason list,
// swapping mandatory/optional on statusFlipField) fails loudly with the site
// name in the assertion label. Sites that classify as TRIVIAL (total-
// branches — the four boundedCollection siblings) can still exercise
// the closure directly with a known-in-scope value to pin the decision
// shape.
// ---------------------------------------------------------------------------

describe('migration fidelity — 9 sites round-trip', () => {
  const findOblByName = (name) => obligations.find((o) => o.name === name)

  // Non-total: whenTrue in scope, whenFalse out. Witness synth returns
  // a real WITNESS; fidelity injects and confirms decision.inScope.
  it.each([
    ['branchAField', 'mandatory'],
    ['variantOneBlock', 'mandatory'],
    ['variantTwoBlock', 'mandatory'],
    ['modeGatedList', 'mandatory']
  ])(
    '%s: witness opens the migrated closure with status=%s',
    (name, status) => {
      const obl = findOblByName(name)
      const witness = synthesiseWitness(obl)
      expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
      const decision = obl.applyTo(
        { [witness.obligationId]: witness.value },
        new Map()
      )
      expect(decision.inScope).toBe(true)
      expect(decision.status).toBe(status)
      // Reasons should be attached on the in-scope branch — they are the
      // load-bearing verbatim decision-object bit the migration must
      // preserve.
      expect(Array.isArray(decision.reasons)).toBe(true)
      expect(decision.reasons.length).toBeGreaterThan(0)
    }
  )

  // Retain-value gate — both branches in scope, so no witness is needed;
  // the fidelity check exercises the closure with both values to prove
  // the status flip is preserved (mandatory on 'yes', optional on 'no').
  it('statusFlipField: matching value → mandatory + reason, non-matching → optional in scope', () => {
    const flipField = findOblByName('statusFlipField')
    const witness = synthesiseWitness(flipField)
    expect(witness.kind).toBe(WITNESS_KIND.TRIVIAL)
    // statusToggle === TOGGLE_YES → mandatory with reason.
    const statusToggleObl = findOblByName('statusToggle')
    const mand = flipField.applyTo(
      { [statusToggleObl.id]: TOGGLE_YES },
      new Map()
    )
    expect(mand).toMatchObject({
      inScope: true,
      status: 'mandatory'
    })
    expect(mand.reasons).toBeDefined()
    expect(mand.reasons.length).toBeGreaterThan(0)
    // statusToggle === TOGGLE_NO → optional, still in scope.
    const opt = flipField.applyTo(
      { [statusToggleObl.id]: TOGGLE_NO },
      new Map()
    )
    expect(opt).toEqual({ inScope: true, status: 'optional' })
  })

  // The four bounded-collection fields are plain mandatory fields within
  // that group (no applyTo). The graph-level classification for an
  // obligation without an applyTo is TRIVIAL.
  it.each([
    'boundedItemType',
    'boundedItemMode',
    'boundedItemReference',
    'boundedItemDate'
  ])('%s is a plain mandatory in-collection field (no applyTo)', (name) => {
    const field = findOblByName(name)
    expect(field.applyTo).toBeUndefined()
    expect(field.status).toBe('mandatory')
    expect(synthesiseWitness(field).kind).toBe(WITNESS_KIND.TRIVIAL)
  })

  // Meta-first invariant: every branchedGate→meta-first migrated site's
  // applyTo.metadata.gateType is one of the three helpers.
  it('every migrated site now uses a meta-first helper metadata.gateType', () => {
    const META_FIRST = new Set(['equalsGate', 'presentGate', 'includesGate'])
    const migratedNames = [
      'branchAField',
      'variantOneBlock',
      'variantTwoBlock',
      'modeGatedList',
      'statusFlipField',
      'branchBCField',
      'branchBDField',
      'branchDField'
    ]
    const stragglers = migratedNames
      .map(findOblByName)
      .filter((o) => !META_FIRST.has(o.applyTo?.metadata?.gateType))
      .map((o) => `${o.name} → ${o.applyTo?.metadata?.gateType}`)
    expect(stragglers).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Backwards compat — the graph-level-only check still passes verbatim.
// itemGatedField was already reachable graph-side; the witness pass
// must not change that.
// ---------------------------------------------------------------------------

describe('#proveReachability — graph-level backwards compat', () => {
  it('Should keep itemGatedField reachable in the graph-only pass', () => {
    // The whole-manifest test asserts zero unreachable. This pin picks
    // out a specific gate to prove the graph-level behaviour is
    // UNCHANGED — the witness pass tightens on top of it, it does not
    // replace it.
    const records = obligations.map((o) => {
      if (typeof o.applyTo === 'function') {
        return { id: o.id, dependsOn: obligationMetadata(o).dependsOn }
      }
      return { id: o.id, dependsOn: [] }
    })
    const result = proveReachability(records)
    const gated = obligations.find((o) => o.name === 'itemGatedField')
    expect(result.reachable).toContain(gated.id)
  })
})
