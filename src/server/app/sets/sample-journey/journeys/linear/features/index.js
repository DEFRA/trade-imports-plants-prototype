import * as savedTransportersAdd from './saved-transporters/add/add.controller.js'
import * as savedTransportersDelete from './saved-transporters/delete/delete.controller.js'
import * as savedTransportersList from './saved-transporters/list/list.controller.js'
import * as welcome from './welcome/controller.js'

// Welcome exports no meta: it collects nothing, is never gated and is never a
// task row, so it stays out of the dispatch index — the same convention
// high-risk-plants follows for its dashboard and hub. The saved-transporters
// pages are not journey pages either.
export const dispatchPages = []

export const allRoutes = [
  ...welcome.routes,
  ...savedTransportersList.routes,
  ...savedTransportersAdd.routes,
  ...savedTransportersDelete.routes
]
