import * as savedTransporters from './saved-transporters/controller.js'
import * as welcome from './welcome/controller.js'

// Welcome exports no meta: it collects nothing, is never gated and is never a
// task row, so it stays out of the dispatch index — the same convention
// high-risk-plants follows for its dashboard and hub. The saved-transporters
// pages are not journey pages either.
export const dispatchPages = []

export const allRoutes = [...welcome.routes, ...savedTransporters.routes]
