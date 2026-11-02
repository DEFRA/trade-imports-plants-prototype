import { copyFor } from '../../../../../shared/copy.js'
import { consignorPage } from '../features/consignor-select/page.js'
import { CONSIGNOR } from '../features/consignor-select/fields.js'
import { placeOfDestinationPage } from '../features/place-of-destination/page.js'
import { PLACE_OF_DESTINATION } from '../features/place-of-destination/fields.js'
import { consignmentContactSelectPage } from '../features/consignment-contact-select/page.js'
import { CONTACT_ADDRESS } from '../features/consignment-contact-select/fields.js'
import { copy as en } from '../features/address-book-picker/copy/copy.en.js'
import { copy as cy } from '../features/address-book-picker/copy/copy.cy.js'

const partyCopy = copyFor({ en, cy }).parties

/**
 * The answers that hold an address copied from the address book. Each is
 * picked on `slug` and its copy is edited on `editSlug`, for this notification
 * only.
 */
export const PARTIES = Object.freeze([
  {
    id: CONSIGNOR,
    slug: consignorPage.slug,
    editSlug: 'consignors/edit',
    ...partyCopy.consignor
  },
  {
    id: PLACE_OF_DESTINATION,
    slug: placeOfDestinationPage.slug,
    editSlug: 'destinations/edit',
    ...partyCopy.placeOfDestination
  },
  {
    id: CONTACT_ADDRESS,
    slug: consignmentContactSelectPage.slug,
    editSlug: 'consignment/contact/edit',
    ...partyCopy.contactAddress
  }
])

export const partyOf = (id) => PARTIES.find((party) => party.id === id)
