import { isStubDataMode } from '../../../common/services/mode.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../lib/http-status.js'
import * as client from './client.js'
import * as stub from './stub.js'

export { PAGE_SIZE } from './client.js'

const impl = () => (isStubDataMode() ? stub : client)

/**
 * One page of an organisation's templates, newest first, without their
 * answers.
 *
 * @param {string} orgId - the signed-in organisation (`organisationIdOf(request)`).
 * @param {{ search?: string, page?: number }} [options] - text to find in the
 * name, and the page, counting from 1.
 * @returns {Promise<{results: object[], total: number, page: number, totalPages: number, pageSize: number}>}
 * the page.
 */
export const listTemplates = (orgId, options) =>
  impl().listTemplates(orgId, options)

/** One template with its answers, or undefined. */
export const getTemplate = (orgId, id) => impl().getTemplate(orgId, id)

/**
 * Saves a notification's answers as a template:
 * `{ name, fulfilment, fromJourneyId }`. Throws a 400 problem (see
 * `isValidationFailure`) when the name is empty.
 */
export const createTemplate = (orgId, body) =>
  impl().createTemplate(orgId, body)

/** Deletes a template. False when the organisation had none by that id. */
export const deleteTemplate = (orgId, id) => impl().deleteTemplate(orgId, id)

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
