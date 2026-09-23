/**
 * The set's identity, kept apart from its gateway so anything that needs to
 * name the set — the gateway, the router's mount, the test setup — shares one
 * source of truth without importing the whole composition root.
 */
export const SET_ID = 'high-risk-plants'
export const SET_BASE = `/${SET_ID}`
