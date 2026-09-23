/**
 * A fresh, isolated in-memory store.
 *
 * Each mounted set configures its own instance, so two sets co-resident in one
 * process cannot see each other's journeys — a module-level Map shared by every
 * set would put one set's drafts in the other's dashboard.
 *
 * @returns {{ journeys: Map, copiesBySourceAndKey: Map }} the store.
 */
export const createStore = () => ({
  journeys: new Map(),
  copiesBySourceAndKey: new Map()
})

/**
 * The store behind the module's default `records` instance, kept so a caller
 * that imports the stub directly — every engine test does — still gets one
 * stable store rather than a new one per import.
 */
export const defaultStore = createStore()
