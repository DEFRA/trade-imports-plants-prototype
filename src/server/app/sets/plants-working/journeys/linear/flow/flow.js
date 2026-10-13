import { confirmationPage } from '../features/confirmation/page.js'
import { declarationPage } from '../features/declaration/page.js'
import { notificationViewPage } from '../features/check-answers/page.js'
import { consignmentContactSelectPage } from '../features/consignment-contact-select/page.js'
import { identificationNumbersPage } from '../features/identification-numbers/page.js'
import { consignorPage } from '../features/consignor-select/page.js'
import { dashboardPage } from '../features/dashboard/page.js'
import { commodityTypePage } from '../features/commodity-type/page.js'
import {
  commoditiesPage,
  commodityDetailsPage
} from '../features/commodities/page.js'
import { originPage } from '../features/origin/page.js'
import { arrivalStatusPage } from '../features/arrival-status/page.js'
import { arrivalDetailsPage } from '../features/arrival-details/page.js'
import { placeOfDestinationPage } from '../features/place-of-destination/page.js'

export const FLOW_ONLY_KEYS = ['declaration']

/**
 * The journey's page order.
 *
 * The commodity entry sub-page sits in a section of its own rather than after
 * the list page it belongs to. `nextInSection` sends a page's Continue to the
 * next page in the same section, and the list page's Continue leaves the
 * commodity section altogether — the entry page is reached from the list and
 * returns to it, never by continuing past it. Its own section still gives it
 * the commodity-type prerequisite that every page after the entry question
 * carries.
 *
 * Origin follows the entry sub-page rather than preceding it. Its answer is
 * enforced at Continue, so every page placed after it needs one; ahead of the
 * entry sub-page it would stop a trader adding a commodity line until they had
 * named a country.
 *
 * The arrival section opens on the arrival-status question, whose answer
 * decides what the rest of the section asks for, and goes on to the arrival
 * details. Potato notifications never see the question: `arrivalStatus` is out
 * of scope for them, so the derived page gate fails and both the opening run
 * and the arrival row's hub entry (`rowGatePasses`/`rowEntry`) pass it over,
 * landing on arrival-details instead — a page every commodity type answers.
 *
 * The destination follows the arrival section rather than joining it. The
 * opening run asks the arrival status ahead of it — that order is `RUN_STEPS`
 * in run.js, not this array — so the page usually has a status to work from and
 * shows the right one of its three questions. It is not a prerequisite: a
 * trader entering from the hub with no status answered gets the pre-arrival
 * question, which is what the page falls back to. It is a section of its own so
 * that Continue leaves the arrival section at the arrival details;
 * `nextInSection` would otherwise run on into the destination page.
 */
export const sections = [
  { id: 'start', pages: [dashboardPage] },
  { id: 'commodity', pages: [commodityTypePage, commoditiesPage] },
  { id: 'commodityDetails', pages: [commodityDetailsPage] },
  { id: 'origin', pages: [originPage] },
  { id: 'arrival', pages: [arrivalStatusPage, arrivalDetailsPage] },
  { id: 'destination', pages: [placeOfDestinationPage] },
  { id: 'parties', pages: [consignorPage, identificationNumbersPage] },
  { id: 'contact', pages: [consignmentContactSelectPage] },
  {
    id: 'review',
    gate: (scope) => scope.readyForCheckYourAnswers,
    pages: [notificationViewPage, declarationPage, confirmationPage]
  }
]
