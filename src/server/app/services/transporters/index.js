import { isStubDataMode } from '../../../common/services/mode.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../lib/http-status.js'
import * as client from './client.js'
import * as stub from './stub.js'

export { PAGE_SIZE } from './client.js'

const impl = () => (isStubDataMode() ? stub : client)

/**
 * One page of an organisation's transporters, in the address book picker's
 * shape.
 *
 * @param {string} orgId - the signed-in organisation (`organisationIdOf(request)`).
 * @param {{ search?: string, page?: number }} [options] - the search text and
 * the page, counting from 1.
 * @returns {Promise<{results: object[], total: number, page: number, totalPages: number, pageSize: number}>}
 * the page.
 */
export const listTransporters = (orgId, options) =>
  impl().listTransporters(orgId, options)

/** One transporter, or undefined when the organisation has none by that id. */
export const getTransporter = (orgId, id) => impl().getTransporter(orgId, id)

/**
 * Saves a new transporter. Throws a 400 problem (see `isValidationFailure`)
 * when a field is refused.
 */
export const createTransporter = (orgId, body) =>
  impl().createTransporter(orgId, body)

/** Deletes a transporter. False when the organisation had none by that id. */
export const deleteTransporter = (orgId, id) =>
  impl().deleteTransporter(orgId, id)

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
