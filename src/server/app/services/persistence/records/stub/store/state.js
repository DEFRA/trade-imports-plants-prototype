/**
 * The stub's in-memory store, one per set.
 *
 * Two sets may be wired to this same shipped stub, and module-level Maps would
 * put both sets' drafts in one place: each set would list the other's
 * notifications and load them by id. Keying on the active set is what keeps a
 * draft started in one set invisible to the other, the way two backends would.
 */
import { currentSetId } from '../../../../../shared/set-context.js'

const bySet = new Map()

const storeFor = () => {
  const setId = currentSetId()
  let store = bySet.get(setId)
  if (!store) {
    store = { journeys: new Map(), copiesBySourceAndKey: new Map() }
    bySet.set(setId, store)
  }
  return store
}

/** The active set's journeys, by journey id. */
export const journeys = () => storeFor().journeys

/** The active set's copy results, by source-and-idempotency-key. */
export const copiesBySourceAndKey = () => storeFor().copiesBySourceAndKey
