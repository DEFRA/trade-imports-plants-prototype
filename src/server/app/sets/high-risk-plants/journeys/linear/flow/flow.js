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

export const sections = [
  { id: 'start', pages: [dashboardPage] },
  {
    id: 'about-the-consignment',
    pages: [
      commodityTypePage,
      commoditiesPage,
      commodityDetailsPage,
      originPage
    ]
  },
  {
    id: 'arrival-and-destination',
    pages: [arrivalStatusPage, arrivalDetailsPage, placeOfDestinationPage]
  },
  {
    id: 'consignment-parties',
    pages: [
      consignorPage,
      identificationNumbersPage,
      consignmentContactSelectPage
    ]
  },
  {
    id: 'review',
    gate: (scope) => scope.readyForCheckYourAnswers,
    pages: [notificationViewPage, declarationPage, confirmationPage]
  }
]
