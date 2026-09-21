import { addressText, detailLines } from './address-lines.js'

/**
 * The radio id for a results row.
 *
 * The first row on every page takes the field name itself, so the error-summary
 * link `#<fieldName>` always moves focus to the first control a trader can
 * choose. Later rows are numbered by their position in the whole result set,
 * so ids stay distinct across pages.
 */
const idPrefixFor = (fieldName) => (from, index) =>
  index === 0 ? fieldName : `${fieldName}-${from + index + 1}`

/** One address-book record as a row of the picker's results table. */
const resultRow = (idPrefix, from, selectedId) => (record, index) => ({
  id: record.id,
  idPrefix: idPrefix(from, index),
  name: record.name,
  addressText: addressText(record.address),
  country: record.address?.country,
  detailLines: detailLines(record),
  checked: record.id === selectedId
})

/**
 * The picker's view model — the results table, the selection and the paging —
 * bound to the field the page collects and to its own pagination.
 *
 * The bound function takes the notification reference; the page state, being
 * `query`, the search term the results were found with, `selectedId`, the
 * address-book id currently ticked, an optional `error` to render above the
 * table, `found`, one page of address-book results, and an optional `selected`,
 * the record the ticked id resolves to; and the page's resolved copy bundle.
 *
 * @param {object} binding
 * @param {string} binding.fieldName - the answer name the page collects.
 * @param {Function} binding.pagination - the page's bound pagination builder.
 * @returns {Function} the picker's `pickerViewModel`.
 */
export const pickerViewModelFor = ({ fieldName, pagination }) => {
  const idPrefix = idPrefixFor(fieldName)

  return (journeyId, { query, selectedId, error, found, selected }, copy) => {
    const from = (found.page - 1) * found.pageSize

    return {
      query,
      page: found.page,
      error,
      selected,
      resultsCaption: copy.resultsCaption(found.results.length, found.total),
      rows: found.results.map(resultRow(idPrefix, from, selectedId)),
      pagination: pagination(journeyId, {
        query,
        page: found.page,
        totalPages: found.totalPages,
        selectedId,
        labels: copy.pagination
      })
    }
  }
}
