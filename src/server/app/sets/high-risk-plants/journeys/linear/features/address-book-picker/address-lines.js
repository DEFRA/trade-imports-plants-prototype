/** The parts of a stored address, in the order they are read out. */
const ADDRESS_PARTS = [
  'addressLine1',
  'addressLine2',
  'townOrCity',
  'county',
  'postcode'
]

/** The address as one line for the results table. The country has its own
 * column, so it is left out here. */
export const addressText = (address = {}) =>
  ADDRESS_PARTS.map((part) => address[part])
    .filter(Boolean)
    .join(', ')

/** Everything the record holds, one line each, for the row's View details
 * disclosure — including the contact details the table has no column for. */
export const detailLines = (record) => {
  const address = record.address ?? {}
  return [
    record.name,
    ...ADDRESS_PARTS.map((part) => address[part]),
    address.country,
    address.phone,
    address.email
  ].filter(Boolean)
}
