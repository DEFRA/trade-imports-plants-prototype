import { getTraceId } from '@defra/hapi-tracing'

import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_NOT_FOUND
} from '../../lib/http-status.js'
import { BackendRequestError } from '../persistence/records/errors.js'

/**
 * The proposed real client for notification templates, on the plants
 * backend. The backend has no templates yet: see `CONTRACT` in `./index.js`.
 */

const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

const backendUrl =
  process.env.TRADE_IMPORTS_PLANTS_BACKEND_URL ?? 'http://localhost:8091'

const tracingHeader = process.env.TRACING_HEADER ?? 'x-cdp-request-id'

/** Rows per page of a templates list. */
export const PAGE_SIZE = 5

const templatesUrl = (id) =>
  id
    ? `${backendUrl}/templates/${encodeURIComponent(id)}`
    : `${backendUrl}/templates`

const headers = (orgId) => {
  if (!orgId) {
    throw new Error(
      'Cannot reach templates without an organisation: the signed-in session carries none'
    )
  }
  return {
    'Content-Type': 'application/json',
    [ORGANISATION_ID_HEADER]: orgId,
    [tracingHeader]: getTraceId() ?? ''
  }
}

/**
 * The error a refused save raises: a 400 with the problem body, read by
 * `isValidationFailure` and `mapApiErrorsToFormErrors` in `./index.js`.
 *
 * @param {object} problem - `{ detail, errors: { field: [message] } }`.
 * @param {string} [statusText] - the response's status text.
 * @returns {Error} the error to throw.
 */
export const validationError = (problem, statusText = 'Bad Request') =>
  Object.assign(new Error(problem.detail || 'Validation failed'), {
    status: HTTP_STATUS_BAD_REQUEST,
    statusText,
    body: problem
  })

const problemOf = async (response) => {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

/**
 * The API's template as the pages read it. A list leaves out the saved
 * answers (`fulfilment`); one template read by id carries them.
 *
 * @param {object} template - the API's record.
 * @returns {object} the record the pages read.
 */
export const toRecord = (template) => ({
  id: template.id,
  name: template.name,
  fromJourneyId: template.fromJourneyId ?? null,
  createdAt: template.createdAt,
  ...(template.fulfilment === undefined
    ? {}
    : { fulfilment: template.fulfilment })
})

export const listTemplates = async (orgId, { search, page = 1 } = {}) => {
  const url = new URL(templatesUrl())
  url.searchParams.set('page', String(page))
  url.searchParams.set('pageSize', String(PAGE_SIZE))
  if (search) {
    url.searchParams.set('q', search)
  }
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: headers(orgId)
  })
  if (!response.ok) {
    throw new BackendRequestError('list templates', response)
  }
  const body = await response.json()
  return {
    results: body.items.map(toRecord),
    total: body.totalItems,
    page: body.page,
    totalPages: Math.max(1, body.totalPages),
    pageSize: body.pageSize
  }
}

export const getTemplate = async (orgId, id) => {
  const response = await fetch(templatesUrl(id), {
    method: 'GET',
    headers: headers(orgId)
  })
  if (response.status === HTTP_STATUS_NOT_FOUND) {
    return undefined
  }
  if (!response.ok) {
    throw new BackendRequestError('get template', response)
  }
  return toRecord(await response.json())
}

export const createTemplate = async (orgId, body) => {
  const response = await fetch(templatesUrl(), {
    method: 'POST',
    headers: headers(orgId),
    body: JSON.stringify(body)
  })
  if (response.status === HTTP_STATUS_BAD_REQUEST) {
    throw validationError(await problemOf(response), response.statusText)
  }
  if (!response.ok) {
    throw new BackendRequestError('create template', response)
  }
  return toRecord(await response.json())
}

export const deleteTemplate = async (orgId, id) => {
  const response = await fetch(templatesUrl(id), {
    method: 'DELETE',
    headers: headers(orgId)
  })
  if (response.status === HTTP_STATUS_NOT_FOUND) {
    return false
  }
  if (!response.ok) {
    throw new BackendRequestError('delete template', response)
  }
  return true
}
