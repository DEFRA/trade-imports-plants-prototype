import { AsyncLocalStorage } from 'node:async_hooks'

const storage = new AsyncLocalStorage()

export const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

/** Verified organisation id on the session credential object (not the request). */
export const sessionOrganisationId = (credentials) => {
  if (!credentials) {
    return undefined
  }
  return credentials.organisationId ?? credentials.currentRelationshipId
}

/** Organisation the signed-in user acts for, from the verified session; undefined when unauthenticated. */
export const organisationIdOf = (request) =>
  sessionOrganisationId(request?.auth?.credentials)

/** Test helper: sets AsyncLocalStorage for the rest of the async context via enterWith. */
export const enterOrganisationIdForTests = (organisationId) => {
  storage.enterWith(organisationId)
}

export const currentOrganisationId = () => storage.getStore()

export const withOrganisationId = (organisationId, fn) =>
  storage.run(organisationId, fn)
