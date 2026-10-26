import { renderMacro } from '../../../../../../../shared/render-macro.js'

const CELLS_TEMPLATE =
  'high-risk-plants/journeys/linear/features/commodities/list/_cells.njk'

export const commodityTableRows = (rows, copy) =>
  rows.map((row) => [
    { text: row.category },
    { text: row.genusOrVariety },
    { text: row.quantity },
    { html: renderMacro(CELLS_TEMPLATE, 'commodityActionsCell', row, copy) }
  ])
