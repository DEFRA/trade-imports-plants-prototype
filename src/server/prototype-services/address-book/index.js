import { STUB_BOOK } from '../../app/services/address-book/stub/index.js'
import { withExtraParties } from '../../prototype-data/index.js'
import { createFakeStore } from '../lib/fake-store.js'
import { idFromName, PAGE_SIZE, searchRecords } from '../lib/search-page.js'

/**
 * FAKE SERVICE: an address book a design release can change.
 *
 * Belongs to another service. The real address book is read-only in
 * plants-frontend (`src/server/app/services/address-book/`): adding,
 * changing and removing addresses is the Import Notification Service
 * frontend's job, the only writer. This fake lets a design release show
 * address book pages (a list, add an address by hand, "are you sure?" before
 * deleting one) and have the journey's pickers see the change. Every hand-off
 * that uses it must say so.
 *
 * It answers exactly as the real seam does: `search(orgId, { query, page })`
 * and `party(orgId, id)`, so a release swaps one import in each file that
 * reads the address book and nothing else changes.
 *
 * Starter addresses are the stub address book's rows plus the set's extra
 * parties (`src/server/prototype-data/`), seen by every organisation.
 * Addresses people add are kept per set and per organisation; deleting a
 * starter hides it for that organisation. Reset brings everything back.
 */
export const SERVICE = Object.freeze({
  name: 'address-book',
  needsARealService:
    'Adding and deleting addresses: the Import Notification Service frontend owns the address book and is its only writer. Plants-frontend only reads it.'
})

export { PAGE_SIZE }

/** Fields `addAddress` needs, in the order a form asks for them. */
export const REQUIRED_FIELDS = Object.freeze([
  'name',
  'addressLine1',
  'townOrCity',
  'country'
])

/** Every field an added address can have, in the order a form asks for them. */
export const ADDRESS_FIELDS = Object.freeze([
  'addressLine1',
  'addressLine2',
  'townOrCity',
  'postalOrZipCode',
  'country',
  'telephoneNumber',
  'emailAddress'
])

const store = createFakeStore({
  ...SERVICE,
  starters: withExtraParties(STUB_BOOK)
})

const searchable = (record) => [record.name, record.address]

/**
 * Free-text search over an organisation's address book, one page at a time,
 * in the real address book's shape.
 *
 * @param {string} orgId - the signed-in organisation (`organisationIdOf(request)`).
 * @param {object} [options]
 * @param {string} [options.query] - text to find in the name or address;
 * empty lists every address.
 * @param {number} [options.page] - the page, counting from 1.
 * @returns {Promise<{results: Array<object>, total: number, page: number, totalPages: number, pageSize: number}>}
 * one page of addresses.
 */
export const search = async (orgId, { query = '', page = 1 } = {}) =>
  searchRecords(store.visible(orgId), searchable, { query, page })

/**
 * One address by id, as the real seam's `party` answers it.
 *
 * @param {string} orgId - the signed-in organisation.
 * @param {string} id - the address's id.
 * @returns {Promise<object|undefined>} the address, or undefined when this
 * organisation has no such address (or deleted it).
 */
export const party = async (orgId, id) => store.find(orgId, id)

/**
 * Which required fields are missing, as `{ field: 'missing' }`. Empty when
 * the fields can be saved. The words a user sees belong in the release's
 * copy, keyed by field.
 *
 * @param {object} fields - what the "add an address" form sent.
 * @returns {object} error codes by field.
 */
export const validateAddress = (fields = {}) => {
  const errors = {}
  for (const field of REQUIRED_FIELDS) {
    if (!String(fields[field] ?? '').trim()) {
      errors[field] = 'missing'
    }
  }
  return errors
}

/**
 * Saves a new address for an organisation. It shows in that organisation's
 * address book and in every picker that reads this fake straight away.
 *
 * @param {string} orgId - the signed-in organisation.
 * @param {object} fields - `name` plus the `ADDRESS_FIELDS`; anything else,
 * such as a `usages` list for a design that sorts addresses by what they are
 * used for, is kept as it is.
 * @returns {Promise<object>} the saved address, with its new `id`.
 * @throws {Error} when `validateAddress` would report an error.
 */
export const addAddress = async (orgId, fields) => {
  const errors = validateAddress(fields)
  if (Object.keys(errors).length > 0) {
    throw new Error(
      `Address not saved, fields to fix: ${Object.keys(errors).join(', ')}`
    )
  }
  const text = (field) => String(fields[field] ?? '').trim()
  const address = Object.fromEntries(
    ADDRESS_FIELDS.map((field) => [field, text(field)]).filter(
      ([, value]) => value !== ''
    )
  )
  const known = new Set(['name', ...ADDRESS_FIELDS])
  const extra = Object.fromEntries(
    Object.entries(fields).filter(([key]) => !known.has(key) && key !== 'crumb')
  )
  return store.add(orgId, {
    ...extra,
    id: idFromName(text('name'), store.takenIds(orgId)),
    name: text('name'),
    deleted: false,
    address
  })
}

/**
 * Deletes an address this organisation added, or hides a starter address
 * from it until Reset.
 *
 * @param {string} orgId - the signed-in organisation.
 * @param {string} id - the address's id.
 * @returns {Promise<boolean>} false when there was no such address.
 */
export const removeAddress = async (orgId, id) => store.remove(orgId, id)

/**
 * Empties the addresses people added and brings back deleted starters, in the
 * active set (or the named one). The chooser's Reset calls this through the
 * records wrapper.
 *
 * @param {string} [setId] - the set to clear; the active set by default.
 */
export const clear = (setId) => store.clear(setId)
