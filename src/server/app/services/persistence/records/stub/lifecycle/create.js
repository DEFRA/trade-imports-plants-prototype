import {
  DRAFT,
  AMEND,
  SUBMITTED
} from '../../../../../engine/persistence/records.js'
import { copiesBySourceAndKey, journeys } from '../store/state.js'
import { mintReferenceNumber } from '../reference-number.js'
import { marshal } from '../marshal/document.js'

// The actor's organisationId is stored so a caller can later ask for one
// organisation's documents alone (see `mutate.js`'s `clear`) — the same
// actor `real/lifecycle/create.js` already sends the backend, just not
// previously kept by this stub.
export const create = async (actor) => {
  const document = {
    id: mintReferenceNumber(),
    status: DRAFT,
    createdAt: new Date().toISOString(),
    submittedAt: null,
    fulfilment: [],
    organisationId: actor?.organisationId ?? null
  }
  journeys().set(document.id, document)
  return structuredClone(marshal(document))
}

export const copy = async (journeyId, idempotencyKey) => {
  const dedupeKey = `${journeyId}\u0000${idempotencyKey}`
  const existingCopyId = copiesBySourceAndKey().get(dedupeKey)
  if (existingCopyId) {
    return structuredClone(marshal(journeys().get(existingCopyId)))
  }

  const source = journeys().get(journeyId)
  if (!source) {
    throw new Error(`Unknown journey "${journeyId}"`)
  }
  if (
    source.status !== DRAFT &&
    source.status !== SUBMITTED &&
    source.status !== AMEND
  ) {
    throw new Error(`Journey "${journeyId}" is ${source.status} — cannot copy`)
  }

  const document = {
    id: mintReferenceNumber(),
    status: DRAFT,
    createdAt: new Date().toISOString(),
    submittedAt: null,
    fulfilment: structuredClone(source.fulfilment),
    // A copy keeps its source's organisation — copying a notification is not
    // a change of ownership.
    organisationId: source.organisationId ?? null
  }
  journeys().set(document.id, document)
  copiesBySourceAndKey().set(dedupeKey, document.id)
  return structuredClone(marshal(document))
}
