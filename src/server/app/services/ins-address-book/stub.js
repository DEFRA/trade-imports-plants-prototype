import { HTTP_STATUS_NOT_FOUND } from '../../lib/http-status.js'
import {
  startingAddressBook,
  toBookRecord
} from '../../../prototype-support/address-book.js'
import { provideAddressBookChanges } from '../../../prototype-support/address-book-changes.js'
import { createFakeStore } from '../../../prototype-support/fake-store.js'
import {
  haystackOf,
  idFromName
} from '../../../prototype-support/search-page.js'
import { toRecord, validationError } from './client.js'

/**
 * The stub: an address book a design release can change. It starts from the
 * same rows the journey's pickers show (the stub address book plus the set's
 * extra parties), and every address added, changed or deleted here shows in
 * those pickers straight away, through `withExtraParties` in
 * `src/server/prototype-data/`. Kept per design release and per
 * organisation; Reset brings the starting rows back for that release only.
 *
 * It refuses what the real address book API refuses, with the same messages
 * (`trade-imports-address-book`, its address request's validation).
 */

/** The address book API's page size. */
const API_PAGE_SIZE = 25

const WHITESPACE = /\s/

/** Something before one `@`, and a dotted domain after it. */
const looksLikeEmail = (value) => {
  const at = value.indexOf('@')
  const domain = value.slice(at + 1)
  return (
    at > 0 &&
    at === value.lastIndexOf('@') &&
    domain.indexOf('.') > 0 &&
    !domain.endsWith('.') &&
    !WHITESPACE.test(value)
  )
}

/** The fields the API requires, with the message it sends for each. */
const REQUIRED = Object.freeze({
  name: 'Enter a name',
  addressLine1: 'Enter address line 1',
  townOrCity: 'Enter a town or city',
  postcode: 'Enter a postcode',
  countryCode: 'Enter a country',
  phone: 'Enter a telephone number',
  email: 'Enter an email address'
})

const store = createFakeStore({
  name: 'ins-address-book',
  starters: startingAddressBook
})

provideAddressBookChanges(() => {
  const { added, hiddenIds, version } = store.changes()
  return { version, hiddenIds, added: added.map(toBookRecord) }
})

const text = (value) => String(value ?? '').trim()

const problemFor = (address) => {
  const errors = {}
  for (const [field, message] of Object.entries(REQUIRED)) {
    if (!text(address[field])) {
      errors[field] = [message]
    }
  }
  if (!errors.email && !looksLikeEmail(text(address.email))) {
    errors.email = ['Enter an email address in the correct format']
  }
  return Object.keys(errors).length > 0
    ? { detail: 'Validation failed', errors }
    : null
}

const refuseInvalid = (address) => {
  const problem = problemFor(address)
  if (problem) {
    throw validationError(problem)
  }
}

const notFound = () =>
  Object.assign(new Error('Not found'), { status: HTTP_STATUS_NOT_FOUND })

const withoutCrumb = ({ crumb: _crumb, ...body } = {}) => body

const cleaned = ({ organisationId: _organisationId, ...address }) =>
  toRecord(address)

const searchable = (address) => [
  address.name,
  address.addressLine1,
  address.addressLine2,
  address.townOrCity,
  address.county,
  address.postcode
]

export const listAddresses = async (
  orgId,
  { page = 1, q, countryCode } = {}
) => {
  const term = text(q).toLowerCase()
  const all = store
    .visible(orgId)
    .filter(
      (address) => !term || haystackOf(searchable(address)).includes(term)
    )
    .filter((address) => !countryCode || address.countryCode === countryCode)
  const totalItems = all.length
  const totalPages = Math.max(1, Math.ceil(totalItems / API_PAGE_SIZE))
  const from = (page - 1) * API_PAGE_SIZE
  return {
    items: all.slice(from, from + API_PAGE_SIZE).map(cleaned),
    page,
    pageSize: API_PAGE_SIZE,
    totalItems,
    totalPages
  }
}

export const createAddress = async (orgId, body) => {
  const address = withoutCrumb(body)
  refuseInvalid(address)
  const created = store.add(orgId, {
    ...address,
    id: idFromName(text(address.name), store.takenIds(orgId)),
    deleted: false
  })
  return cleaned(created)
}

export const getAddress = async (orgId, id) => {
  const found = store.find(orgId, id)
  if (!found) {
    throw notFound()
  }
  return cleaned(found)
}

export const updateAddress = async (orgId, id, body) => {
  const current = store.find(orgId, id)
  if (!current) {
    throw notFound()
  }
  const changes = withoutCrumb(body)
  refuseInvalid({ ...current, ...changes })
  return cleaned(store.update(orgId, id, changes))
}

export const deleteAddress = async (orgId, id) => {
  store.remove(orgId, id)
}
