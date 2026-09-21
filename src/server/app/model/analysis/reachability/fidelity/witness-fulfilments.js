import { INDEX_DELIMITER } from '../../../obligations/index-delimiter.js'

// The `{ fulfilments, fulfilmentIndexesByObligationId }` pair that feeds
// the real `applyTo` closure for a fidelity check. Depth-N gates
// (allowListed with a projection group — a leaf in a nested collection
// gated on a value held one level up) need a synthetic instance path seeded
// in `fulfilmentIndexesByObligationId` or `runGate` returns
// `fulfilmentIndexes: []` regardless of the value. Depth-1 `allowListed` /
// `notInUnionOf` still read as a map; every other helper accepts a plain
// scalar.
export const witnessFulfilments = (obligation, witness) => {
  const fulfilmentIndexesByObligationId = new Map()
  if (witness.gatedParentGroupId) {
    fulfilmentIndexesByObligationId.set(witness.gatedParentGroupId, [
      ['line1', 'unit1'].join(INDEX_DELIMITER)
    ])
    return {
      fulfilments: { [witness.obligationId]: { line1: witness.value } },
      fulfilmentIndexesByObligationId
    }
  }
  const gateType = obligation.applyTo.metadata?.gateType
  if (gateType === 'allowListed' || gateType === 'notInUnionOf') {
    return {
      fulfilments: { [witness.obligationId]: { line1: witness.value } },
      fulfilmentIndexesByObligationId
    }
  }
  return {
    fulfilments: { [witness.obligationId]: witness.value },
    fulfilmentIndexesByObligationId
  }
}
