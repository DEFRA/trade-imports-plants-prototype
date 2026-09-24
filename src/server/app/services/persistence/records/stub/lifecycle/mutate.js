import { encodeEvaluatorFulfilments } from '../../fulfilment-codec/index.js'
import { marshal } from '../marshal/document.js'
import { loadWritable } from '../store/writable.js'
import { copiesBySourceAndKey, journeys } from '../store/state.js'

export const replaceFulfilment = async (journeyId, fulfilment) => {
  const journey = loadWritable(journeyId)
  journey.fulfilment = structuredClone(
    encodeEvaluatorFulfilments(fulfilment ?? {})
  )
  return structuredClone(marshal(journey))
}

/**
 * Clears the active set's stub records — every organisation's, unless one is
 * named, in which case only that organisation's are removed and every other
 * organisation's are left untouched.
 *
 * Every existing caller clears everything between test cases and keeps
 * relying on that: `organisationId` is additive, not a behaviour change for
 * them.
 *
 * @param {string} [organisationId]
 */
export const clear = async (organisationId) => {
  if (organisationId === undefined) {
    journeys().clear()
    copiesBySourceAndKey().clear()
    return
  }
  for (const [id, document] of journeys()) {
    if (document.organisationId === organisationId) {
      journeys().delete(id)
    }
  }
  for (const [dedupeKey, copyId] of copiesBySourceAndKey()) {
    if (!journeys().has(copyId)) {
      copiesBySourceAndKey().delete(dedupeKey)
    }
  }
}
