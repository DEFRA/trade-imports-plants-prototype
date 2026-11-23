import { templateMacros } from '../../../../../../shared/render-macro.js'

const CELLS_TEMPLATE =
  'high-risk-plants/journeys/linear/features/address-book-picker/_cells.njk'

export const pickerTableRows = (fieldName, rows, pickerCopy) => {
  const cells = templateMacros(CELLS_TEMPLATE)
  return rows.map((row) => [
    { html: cells.pickerSelectCell(fieldName, row, pickerCopy) },
    { text: row.name },
    { html: cells.pickerAddressCell(row) },
    { text: row.country },
    { html: cells.pickerDetailsCell(row, pickerCopy) }
  ])
}
