import { isStubDataMode } from '../../../common/services/mode.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../lib/http-status.js'
import * as client from './client.js'
import * as stub from './stub.js'

const impl = () => (isStubDataMode() ? stub : client)

/**
 * One page of the organisation's address book, in the Import Notification
 * Service's own wire shape. See `contract.json`: the address book is the
 * Import Notification Service frontend's, not plants-frontend's — the
 * journey's pickers (`../address-book/index.js`) only read it.
 */
export const listAddresses = (orgId, search) =>
  impl().listAddresses(orgId, search)

/** Saves a new address. Throws a 400 problem (see `isValidationFailure`)
 * when a field is refused. */
export const createAddress = (orgId, body) => impl().createAddress(orgId, body)

/** One address, or throws a 404 problem when the organisation has none by
 * that id. */
export const getAddress = (orgId, id) => impl().getAddress(orgId, id)

/** Changes an address. Throws a 400 problem when a field is refused, or a
 * 404 problem when the organisation has none by that id. */
export const updateAddress = (orgId, id, body) =>
  impl().updateAddress(orgId, id, body)

/** Deletes an address. */
export const deleteAddress = (orgId, id) => impl().deleteAddress(orgId, id)

/** The first message for each field a 400 problem names, for a form. */
export const mapApiErrorsToFormErrors = (problemBody) =>
  Object.fromEntries(
    Object.entries(problemBody?.errors ?? {}).map(([field, messages]) => [
      field,
      messages[0]
    ])
  )

/** Whether an error is a refused save with field errors. */
export const isValidationFailure = (err) =>
  err?.status === HTTP_STATUS_BAD_REQUEST && Boolean(err.body?.errors)
