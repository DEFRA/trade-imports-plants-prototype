import { toWireAddress } from '../../../../../services/address-book/to-wire-address.js'
import { addressBookCountryName } from '../../../../../services/countries/index.js'

/** `pickedFromId` only pre-selects the record when the picker reopens: nothing
 * reads details through it. */
export const answerForPickedParty = (chosen) => ({
  pickedFromId: chosen.id,
  name: chosen.name,
  phone: chosen.address?.phone,
  email: chosen.address?.email,
  address: toWireAddress(chosen.address ?? {})
})

/** A copied party in the shape the journey renders — the shape `toRecord` in
 * services/address-book/client.js gives a live address-book record.
 *
 * A party with no name never made it onto the notification, so it renders as
 * "not provided" exactly like an unanswered one. */
export const toDisplayParty = async (party) => {
  if (!party?.name) {
    return undefined
  }
  const address = party.address ?? {}
  return {
    name: party.name,
    address: {
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      townOrCity: address.townOrCity,
      county: address.county,
      postcode: address.postcode,
      country: await addressBookCountryName(address.countryCode),
      phone: party.phone,
      email: party.email
    }
  }
}
