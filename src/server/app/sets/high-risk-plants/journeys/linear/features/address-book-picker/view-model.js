import { contactLines, pickerAddressLines } from './address-lines.js'
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
 * function takes the page state (`query`, `selectedId`, an optional `error`,
 * `found`, an optional `tickedRecord`) and the shared picker copy.
 *
 * @param {object} binding
 * @param {string} binding.fieldName - the answer name the page collects.
 * @returns {Function} the picker's `pickerViewModel`.
 */
export const pickerViewModelFor = ({ fieldName }) => {
  const idPrefix = idPrefixFor(fieldName)

  return ({ query, selectedId, error, found, tickedRecord }, pickerCopy) => {
    const rows = found.map(resultRow(idPrefix, selectedId))

    return {
      query,
      error,
      tickedRecord,
      resultsCount: pickerCopy.resultsCount(rows.length, rows.length),
      rows,
      tableRows: pickerTableRows(fieldName, rows, pickerCopy)
    }
  }
}
