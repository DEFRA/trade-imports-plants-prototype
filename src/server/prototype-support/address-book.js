import { STUB_BOOK } from '../app/services/address-book/stub/index.js'
import { COUNTRY_LABELS } from '../app/services/countries/stub.js'
import { extraParties } from '../prototype-data/index.js'

/**
 * Moves address book records between the two shapes in the prototype:
 *
 * - the Import Notification Service's wire shape, which the ins-address-book
 *   service speaks (`postcode`, `countryCode`, `phone`, `email`);
 * - the shape plants-frontend's pickers read (the same fields under
 *   `address`, plus `address.country` as a name, and `roles`), which the stub
 *   address book serves.
 *
 * And gives the ins-address-book stub its starting rows: the stub address
 * book plus the active set's extra parties from `src/server/prototype-data/`,
 * exactly what the pickers show before anyone changes anything.
 */

const UNITED_KINGDOM = 'United Kingdom'
const UNITED_KINGDOM_CODE = 'GB'

const nameOf = (countryCode) =>
  COUNTRY_LABELS[countryCode] ??
  (countryCode === UNITED_KINGDOM_CODE ? UNITED_KINGDOM : countryCode)

const present = (entries) =>
  Object.fromEntries(
    entries.filter(([, value]) => value !== undefined && value !== '')
  )

/**
 * A picker's record in the Import Notification Service's wire shape.
 *
 * @param {object} record - `{ id, name, deleted, address }`.
 * @returns {object} the wire record.
 */
export const toInsAddress = ({ id, name, deleted, address = {} }) => ({
  id,
  name,
  addressLine1: address.addressLine1 ?? '',
  addressLine2: address.addressLine2 ?? '',
  townOrCity: address.townOrCity ?? '',
  county: address.county ?? '',
  postcode: address.postcode ?? '',
  countryCode: address.countryCode,
  phone: address.phone ?? '',
  email: address.email ?? '',
  deleted: Boolean(deleted)
})

/**
 * A wire record in the shape a picker reads, with any extra fields a design
 * added (such as `usages`) kept alongside.
 *
 * @param {object} address - the wire record.
 * @returns {object} `{ id, name, deleted, address, ...extra }`.
 */
export const toBookRecord = ({
  id,
  name,
  deleted,
  addressLine1,
  addressLine2,
  townOrCity,
  county,
  postcode,
  countryCode,
  phone,
  email,
  roles = [],
  organisationId: _organisationId,
  ...extra
}) => ({
  ...extra,
  id,
  name,
  deleted: Boolean(deleted),
  roles,
  address: present([
    ['addressLine1', addressLine1],
    ['addressLine2', addressLine2],
    ['townOrCity', townOrCity],
    ['county', county],
    ['postcode', postcode],
    ['countryCode', countryCode],
    ['country', nameOf(countryCode)],
    ['phone', phone],
    ['email', email]
  ])
})

/**
 * The address book as it starts in the active set, in the wire shape.
 *
 * @returns {object[]} the stub book, then the set's extra parties.
 */
export const startingAddressBook = () =>
  [...STUB_BOOK, ...extraParties()].map(toInsAddress)
