import { identificationNumbersPage } from '../../features/identification-numbers/page.js'
import { consignorPage } from '../../features/consignor-select/page.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { dashboardPage } from '../../features/dashboard/page.js'
import { commodityTypePage } from '../../features/commodity-type/page.js'
import {
  commoditiesPage,
  commodityDetailsPage
} from '../../features/commodities/page.js'
import { originPage } from '../../features/origin/page.js'
import { arrivalStatusPage } from '../../features/arrival-status/page.js'
import { arrivalDetailsPage } from '../../features/arrival-details/page.js'
import { placeOfDestinationPage } from '../../features/place-of-destination/page.js'

const copy = copyFor({ en, cy })

/**
 * Which section of the notification each page belongs to.
 *
 * The caption above a page heading tells someone part-way through a long
 * notification which part of it they are in, so the value is a property of
 * where the page sits in the journey, not of the page's own copy. One entry
 * per section, listing its pages — never a string per page.
 *
 * A page that is absent is deliberately bare. The overview hub, the contact
 * page, check your answers, declaration and confirmation open straight into
 * their heading. The unit test beside this file lists those pages explicitly,
 * so a new page cannot arrive without a decision either way.
 */
export const captionSections = [
  { id: 'dashboard', pages: [dashboardPage] },
  {
    id: 'aboutTheConsignment',
    pages: [
      commodityTypePage,
      commoditiesPage,
      commodityDetailsPage,
      originPage
    ]
  },
  { id: 'arrival', pages: [arrivalStatusPage, arrivalDetailsPage] },
  { id: 'destination', pages: [placeOfDestinationPage] },
  {
    id: 'consignmentParties',
    pages: [consignorPage, identificationNumbersPage]
  }
]

const sectionIdByPageId = new Map(
  captionSections.flatMap((section) =>
    section.pages.map((page) => [page.id, section.id])
  )
)

/**
 * The caption a page renders above its heading.
 *
 * @param {string} [pageId] - the page identity's `id`.
 * @returns {string|undefined} the section name, or undefined for a page that
 * carries no caption.
 */
export const sectionCaptionOf = (pageId) => {
  const sectionId = sectionIdByPageId.get(pageId)
  return sectionId ? copy.sections[sectionId] : undefined
}
