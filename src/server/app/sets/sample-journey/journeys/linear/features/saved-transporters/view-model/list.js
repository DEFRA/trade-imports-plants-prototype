import { dashboardPath } from '../../../../../../../shared/paths.js'

const MINIMUM_PAGES_TO_PAGINATE = 2

/** The list page's address, under this set's own path. */
export const listPath = () => `${dashboardPath()}/transporters`

/** The add page's address. */
export const addPath = () => `${listPath()}/add`

/** One transporter's delete page. */
export const deletePath = (id) =>
  `${listPath()}/${encodeURIComponent(id)}/delete`

const addressText = ({ address = {} }) =>
  [
    address.addressLine1,
    address.addressLine2,
    address.townOrCity,
    address.county,
    address.postalOrZipCode,
    address.country
  ]
    .filter(Boolean)
    .join(', ')

/** One transporter as a row of the results table. */
export const rowOf = (transporter) => ({
  name: transporter.name,
  addressText: addressText(transporter),
  approvalNumber: transporter.approvalNumber,
  deleteHref: deletePath(transporter.id)
})

const resultsHref = (query, page) => {
  const params = new URLSearchParams()
  if (query) {
    params.set('q', query)
  }
  params.set('page', String(page))
  return `${listPath()}?${params.toString()}`
}

/**
 * The `govukPagination` view model, or null when one page holds everything.
 *
 * @param {string} query - the search the results were found with.
 * @param {{ page: number, totalPages: number }} found - the page found.
 * @param {{ previous: string, next: string }} labels - the link words.
 * @returns {object|null} the pagination.
 */
export const paginationFor = (query, { page, totalPages }, labels) => {
  if (totalPages < MINIMUM_PAGES_TO_PAGINATE) {
    return null
  }
  return {
    previous:
      page > 1
        ? { href: resultsHref(query, page - 1), text: labels.previous }
        : undefined,
    next:
      page < totalPages
        ? { href: resultsHref(query, page + 1), text: labels.next }
        : undefined,
    items: Array.from({ length: totalPages }, (_, index) => ({
      number: index + 1,
      href: resultsHref(query, index + 1),
      current: index + 1 === page
    }))
  }
}
