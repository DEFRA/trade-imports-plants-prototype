import { describe, expect, it } from 'vitest'
import { createObligationEvaluator } from './evaluator.js'
import { allowListed } from './helpers/index.js'

// A gate that itself sits at depth >= 2 and projects a deeper obligation must
// match its fulfilmentIndexes by full-prefix, not by the first segment.
// When a projection fulfilmentIndex is sliced at its first delimiter,
// `runGate` only ever matches a gate whose indexedFulfilments keys
// are one segment long, so a deeper gate matches nothing, reports
// `inScope: false`, and `purgeStorage`'s apply-to-derived branch then deletes
// the user's stored entries — silent data loss. The fix tests each passing
// key as a real prefix
// (`key === '' || path === key || path.startsWith(`${key}.`)`); the
// empty-key case matters because `runGate` uses `''` as the key for
// an unindexed (non-indexedFulfilments) gate.
describe('a gate at depth >= 2 that projects', () => {
  // Three nested groups, one segment of composite key each:
  //
  //   groupDepth1   depth 1   keys 'entry1'
  //   groupDepth2   depth 2   keys 'entry1.record1'
  //   groupDepth3   depth 3   keys 'entry1.record1.sub1'
  //
  // `depth2Gate` is the gate. It is `within: groupDepth2`, so its stored
  // keys are two segments ('entry1.record1'). `depth3Leaf` is gated on it
  // and projects onto `groupDepth3`, whose paths are three segments.
  const buildManifest = () => {
    const groupDepth1 = { id: 'groupDepth1' }
    const groupDepth2 = { id: 'groupDepth2', within: groupDepth1 }
    const groupDepth3 = { id: 'groupDepth3', within: groupDepth2 }
    const depth2Gate = {
      id: 'depth2Gate',
      within: groupDepth2,
      status: 'mandatory'
    }
    const depth3Leaf = {
      id: 'depth3Leaf',
      within: groupDepth3,
      status: 'mandatory',
      applyTo: allowListed(depth2Gate, ['yes'], groupDepth3)
    }
    return [groupDepth1, groupDepth2, groupDepth3, depth2Gate, depth3Leaf]
  }

  // The gate says 'yes' on the only depth-2 record, so the depth-3 record
  // below it is in scope and its value must survive the purge.
  const fulfilments = {
    depth2Gate: { 'entry1.record1': 'yes' },
    depth3Leaf: { 'entry1.record1.sub1': 'the user typed this' }
  }

  const evaluateFixture = () => {
    const evaluator = createObligationEvaluator({
      obligations: buildManifest()
    })
    return evaluator.evaluate(fulfilments)
  }

  it('Should keep the stored entry of a gated-in leaf below a depth-2 gate', () => {
    const result = evaluateFixture()

    expect(result.fulfilments.depth3Leaf).toEqual({
      'entry1.record1.sub1': 'the user typed this'
    })
  })

  it('Should report the leaf in scope on the fulfilmentIndex its depth-2 gate admits', () => {
    const result = evaluateFixture()

    expect(result.obligations.depth3Leaf).toMatchObject({
      inScope: true,
      status: 'mandatory',
      fulfilmentIndexes: ['entry1.record1.sub1']
    })
  })

  it('Should still purge the entry when the depth-2 gate does not admit it', () => {
    const evaluator = createObligationEvaluator({
      obligations: buildManifest()
    })

    // The negative case passes even with the prefix bug — for the wrong reason.
    // It is here so the fix cannot buy the two tests above by making the gate
    // admit everything.
    const result = evaluator.evaluate({
      ...fulfilments,
      depth2Gate: { 'entry1.record1': 'no' }
    })

    expect(result.fulfilments.depth3Leaf).toBeUndefined()
    expect(result.obligations.depth3Leaf).toEqual({ inScope: false })
  })
})
