import { templateMacros } from '../../../../../../../shared/render-macro.js'

const CELLS_TEMPLATE =
  'high-risk-plants/journeys/linear/features/commodities/list/_cells.njk'

export const commodityTableRows = (rows, copy) => {
  const cells = templateMacros(CELLS_TEMPLATE)
  return rows.map((row) => [
    { text: row.category },
    { text: row.genusOrVariety },
    { text: row.quantity },
    { html: cells.commodityActionsCell(row, copy) }
  ])
}
