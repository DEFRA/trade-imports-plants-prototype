/** In the address book API's own names, as an address edited on the notification is. */
export const toWireAddress = (address = {}) => ({
  addressLine1: address.addressLine1,
  addressLine2: address.addressLine2,
  townOrCity: address.townOrCity,
  county: address.county,
  postcode: address.postcode,
  countryCode: address.countryCode
})
