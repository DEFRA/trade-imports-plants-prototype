import { CONSIGNOR } from '../features/consignor-select/fields.js'
import * as addressBook from '../../../../../services/address-book/index.js'
import { organisationIdOf } from '../../../../../../common/helpers/organisation-id.js'
import { PLACE_OF_DESTINATION } from '../features/place-of-destination/fields.js'

/**
 * The notification answers that hold an address-book REFERENCE rather than the
 * address itself.
 *
 * A reference is an `{ addressId }` and nothing more: the details are resolved
 * from the book on every read, so a record the trader later corrects is
 * corrected on the notification too. That is what makes the reference able to
 * dangle, and it is why this list exists.
 *
 * An answer that holds a COPY of an address belongs nowhere near here. The copy
 * is the answer, so there is no reference to dangle and nothing to clear when
 * the record it was taken from is deleted. `contactAddress` is that answer in
 * this journey: the contact page commits `{ addressId, name, address }`, so it
 * stays off this list.
 */
export const REFERENCE_PARTIES = Object.freeze([
  PLACE_OF_DESTINATION,
  CONSIGNOR
])

/** A reference resolves only to a record the book still holds. A soft-deleted
 * record comes back with `deleted: true` and counts as gone — the UCD decision
 * to treat a deleted address as if it were never entered. An outage is NOT
 * that: the address book throws and the throw propagates, because an
 * unavailable service must never be indistinguishable from a deletion. */
const stillResolves = async (orgId, addressId) => {
  const record = await addressBook.party(orgId, addressId)
  return Boolean(record) && !record.deleted
}

/**
 * The answers with every dangling address-book reference dropped, so display,
 * fulfilment and evaluation agree that a deleted address is no answer at all.
 *
 * This is the set's own sanitiser, injected into the engine's read path through
 * `configureAnswersForRead` in `routes.js`. The engine calls it and never knows
 * what a party is: knowing that an `{ addressId }` points at the address book
 * is the set's business, and L2 importing `sets/**` is forbidden.
 *
 * Request-local. What was saved is left alone in the store — the next commit
 * that rebuilds from the current answers is what persists the clear — and the
 * engine keeps the stored answers beside the sanitised ones so a page can still
 * tell "answered, then deleted" from "never answered".
 *
 * Returns the answers unchanged, as the same object, when every reference still
 * resolves: the engine skips a re-evaluation when nothing moved.
 */
export const withoutUnresolvedPartyRefs = async (request, answers = {}) => {
  const referenced = REFERENCE_PARTIES.filter(
    (name) => answers[name]?.addressId
  )
  if (referenced.length === 0) {
    return answers
  }

  const orgId = organisationIdOf(request)
  const resolved = await Promise.all(
    referenced.map((name) => stillResolves(orgId, answers[name].addressId))
  )
  const dangling = referenced.filter((_name, index) => !resolved[index])
  if (dangling.length === 0) {
    return answers
  }

  const next = { ...answers }
  for (const name of dangling) {
    delete next[name]
  }
  return next
}
