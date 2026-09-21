import { consignmentContactSelectPage } from '../features/consignment-contact-select/page.js'
import { identificationNumbersPage } from '../features/identification-numbers/page.js'
import { consignorPage } from '../features/consignor-select/page.js'
import { statusOf } from '../../../../../bridge/status/index.js'
import { collectsOf } from '../../../../../flow/dispatch.js'
import { commodityTypePage } from '../features/commodity-type/page.js'
import {
  commoditiesPage,
  commodityDetailsPage
} from '../features/commodities/page.js'
import { originPage } from '../features/origin/page.js'
import { arrivalStatusPage } from '../features/arrival-status/page.js'
import { arrivalDetailsPage } from '../features/arrival-details/page.js'
import { placeOfDestinationPage } from '../features/place-of-destination/page.js'

/**
 * The hub's task rows.
 *
 * The arrival row holds the arrival question and the arrival details. The
 * question is out of scope for potatoes, so a potato notification opens the row
 * on the details page instead — every commodity type owes a date. The row is
 * not marked `conditional`: no notification finds the whole of it inapplicable.
 *
 * The destination is a row of its own beside it in the same hub group. Every
 * commodity type owes a place of destination, so it too is unconditional.
 */
export const taskRows = [
  {
    id: 'commodities',
    pages: [commodityTypePage, commoditiesPage, commodityDetailsPage]
  },
  { id: 'origin', pages: [originPage] },
  { id: 'arrival', pages: [arrivalStatusPage, arrivalDetailsPage] },
  { id: 'destination', pages: [placeOfDestinationPage] },
  { id: 'consignor', pages: [consignorPage], conditional: true },
  { id: 'identificationNumbers', pages: [identificationNumbersPage] },
  { id: 'contact', pages: [consignmentContactSelectPage] }
]

export const taskRowById = (id) => taskRows.find((row) => row.id === id)

export const rowParts = (row) =>
  row.parts ?? row.pages.flatMap((page) => collectsOf(page.id))

export const rowStatus = (row, answers, inScope, evaluation) =>
  statusOf(rowParts(row), answers, inScope, evaluation)
