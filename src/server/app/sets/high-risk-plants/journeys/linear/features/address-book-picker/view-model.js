import { addressText, detailLines } from './address-lines.js'
import { pickerTableRows } from './table-rows.js'

const idPrefixFor = (fieldName) => (from, index) =>
  index === 0 ? fieldName : `${fieldName}-${from + index + 1}`

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
 * The picker's view model, bound to the field the page collects and to its own
 * pagination. The bound function takes the notification reference, the page
 * state (`query`, `selectedId`, an optional `error`, `found`, an optional
 * `tickedRecord`) and the shared picker copy.
 *
 * @param {object} binding
 * @param {string} binding.fieldName - the answer name the page collects.
 * @param {Function} binding.pagination - the page's bound pagination builder.
 * @returns {Function} the picker's `pickerViewModel`.
 */
export const pickerViewModelFor = ({ fieldName, pagination }) => {
  const idPrefix = idPrefixFor(fieldName)

  return (
    journeyId,
    { query, selectedId, error, found, tickedRecord },
    pickerCopy
  ) => {
    const from = (found.page - 1) * found.pageSize
    const rows = found.results.map(resultRow(idPrefix, from, selectedId))

    return {
      query,
      page: found.page,
      error,
      tickedRecord,
      resultsCount: pickerCopy.resultsCount(found.results.length, found.total),
      rows,
      tableRows: pickerTableRows(fieldName, rows, pickerCopy),
      pagination: pagination(journeyId, {
        query,
        page: found.page,
        totalPages: found.totalPages,
        selectedId,
        labels: pickerCopy.pagination
      })
    }
  }
}
