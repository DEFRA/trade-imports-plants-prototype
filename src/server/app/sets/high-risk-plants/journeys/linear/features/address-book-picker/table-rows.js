import { renderMacro } from '../../../../../../shared/render-macro.js'

const CELLS_TEMPLATE =
  'high-risk-plants/journeys/linear/features/address-book-picker/_cells.njk'

export const pickerTableRows = (fieldName, rows, pickerCopy) =>
  rows.map((row) => [
    {
      html: renderMacro(
        CELLS_TEMPLATE,
        'pickerSelectCell',
        fieldName,
        row,
        pickerCopy
      )
    },
    { text: row.name },
    { text: row.addressText },
    { text: row.country },
    {
      html: renderMacro(CELLS_TEMPLATE, 'pickerDetailsCell', row, pickerCopy)
    }
  ])
