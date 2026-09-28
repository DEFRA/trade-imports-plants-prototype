import { STUB_BOOK } from '../app/services/address-book/stub/index.js'
import { COUNTRY_LABELS } from '../app/services/countries/stub.js'
import { extraParties } from '../prototype-data/index.js'

/**
 * Moves address book records between the two shapes in the prototype:
 *
 * - the Import Notification Service's wire shape, which the ins-address-book
 *   service speaks (`postcode`, `countryCode`, `phone`, `email`);
 * - the shape plants-frontend's pickers read (`address.postalOrZipCode`,
 *   `address.country` as a name), which the stub address book serves.
 *
 * And gives the ins-address-book stub its starting rows: the stub address
 * book plus the active set's extra parties from `src/server/prototype-data/`,
 * exactly what the pickers show before anyone changes anything.
 */

const UNITED_KINGDOM = 'United Kingdom'
const UNITED_KINGDOM_CODE = 'GB'

const codeOf = (country) => {
  if (country === UNITED_KINGDOM) {
    return UNITED_KINGDOM_CODE
  }
  return (
    Object.entries(COUNTRY_LABELS).find(([, name]) => name === country)?.[0] ??
    country
  )
}

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
  postcode: address.postalOrZipCode ?? '',
  countryCode: codeOf(address.country),
  phone: address.telephoneNumber ?? '',
  email: address.emailAddress ?? '',
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
  organisationId: _organisationId,
  ...extra
}) => ({
  ...extra,
  id,
  name,
  deleted: Boolean(deleted),
  address: present([
    ['addressLine1', addressLine1],
    ['addressLine2', addressLine2],
    ['townOrCity', townOrCity],
    ['county', county],
    ['postalOrZipCode', postcode],
    ['country', nameOf(countryCode)],
    ['telephoneNumber', phone],
    ['emailAddress', email]
  ])
})

/**
 * The address book as it starts in the active set, in the wire shape.
 *
 * @returns {object[]} the stub book, then the set's extra parties.
 */
export const startingAddressBook = () =>
  [...STUB_BOOK, ...extraParties()].map(toInsAddress)
