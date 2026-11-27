import { contactLines, pickerAddressLines } from './address-lines.js'
import { addressesOnPage, pageCountOf, paginationLinks } from './pagination.js'
import { resultsHref } from './results-href.js'
import { pickerTableRows } from './table-rows.js'

const idPrefixFor = (fieldName) => (index) =>
  index === 0 ? fieldName : `${fieldName}-${index + 1}`

const resultRow = (idPrefix, selectedId) => (record, index) => ({
  id: record.id,
  idPrefix: idPrefix(index),
  name: record.name,
  addressLines: pickerAddressLines(record.address),
  country: record.address?.country,
  contactLines: contactLines(record.address),
  checked: record.id === selectedId
})

/**
 * The picker's view model, bound to the field the page collects. The bound
 * function takes the notification reference, the page's slug, the page state
 * (`query`, `page`, `selectedId`, an optional `error`, `found`, an optional
 * `selected`, `trail`) and the shared picker copy.
 *
 * @param {object} binding
 * @param {string} binding.fieldName - the answer name the page collects.
 * @returns {Function} the picker's `pickerViewModel`.
 */
export const pickerViewModelFor = ({ fieldName }) => {
  const idPrefix = idPrefixFor(fieldName)

  return (
    journeyId,
    slug,
    { query, page, selectedId, error, found, selected, trail },
    pickerCopy
  ) => {
    const hrefForPage = (number) =>
      resultsHref(journeyId, slug, {
        query,
        page: number,
        selectedId,
        trail
      })
    const rows = addressesOnPage(found, page).map(
      resultRow(idPrefix, selectedId)
    )

    return {
      query,
      page,
      error,
      selected,
      resultsCount: pickerCopy.resultsCount(rows.length, found.length),
      rows,
      tableRows: pickerTableRows(fieldName, rows, pickerCopy),
      pagination: paginationLinks(
        {
          page,
          totalPages: pageCountOf(found.length),
          labels: pickerCopy.pagination
        },
        hrefForPage
      )
    }
  }
}
