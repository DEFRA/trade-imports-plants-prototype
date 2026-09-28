import { getTraceId } from '@defra/hapi-tracing'

import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_NOT_FOUND
} from '../../lib/http-status.js'
import { BackendRequestError } from '../persistence/records/errors.js'

const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

const transportersUrl =
  process.env.TRADE_IMPORTS_TRANSPORTERS_URL ?? 'http://localhost:8095'

const tracingHeader = process.env.TRACING_HEADER ?? 'x-cdp-request-id'

/** Rows per page of a picker's results table, the same as the address book
 * picker. */
export const PAGE_SIZE = 5

const transportersPath = (orgId, id) => {
  if (!orgId) {
    throw new Error(
      'Cannot reach the transporters service without an organisation: the signed-in session carries none'
    )
  }
  const base = `${transportersUrl}/organisation/${encodeURIComponent(orgId)}/transporters`
  return id ? `${base}/${encodeURIComponent(id)}` : base
}

// The organisation header is the authorisation, as it is for the address
// book. It must come only from the signed-in session, and match the path.
const headers = (orgId) => ({
  'Content-Type': 'application/json',
  [ORGANISATION_ID_HEADER]: orgId,
  [tracingHeader]: getTraceId() ?? ''
})

/**
 * The error a refused save raises: a 400 with the problem body, so
 * `isValidationFailure` and `mapApiErrorsToFormErrors` in `./index.js` read
 * it the way the Import Notification Service reads the address book's.
 *
 * @param {object} problem - `{ detail, errors: { field: [message] } }`.
 * @param {string} [statusText] - the response's status text.
 * @returns {Error} the error to throw.
 */
export const validationError = (problem, statusText = 'Bad Request') =>
  Object.assign(new Error(problem.detail ?? 'Validation failed'), {
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
 * The API's transporter as the shape a picker renders: like an address book
 * record (`id`, `name`, `deleted`, `address`), plus three fields of its own.
 *
 * @param {object} transporter - the API's record.
 * @returns {object} the record the pages read.
 */
export const toRecord = (transporter) => ({
  id: transporter.id,
  name: transporter.name,
  deleted: Boolean(transporter.deleted),
  address: {
    addressLine1: transporter.addressLine1,
    addressLine2: transporter.addressLine2 ?? '',
    townOrCity: transporter.townOrCity,
    county: transporter.county ?? '',
    postalOrZipCode: transporter.postcode,
    country: transporter.country
  },
  approvalNumber: transporter.approvalNumber ?? '',
  transporterType: transporter.transporterType,
  approvalStatus: transporter.approvalStatus
})

export const listTransporters = async (orgId, { search, page = 1 } = {}) => {
  const url = new URL(transportersPath(orgId))
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
    throw new BackendRequestError('list transporters', response)
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

export const getTransporter = async (orgId, id) => {
  const response = await fetch(transportersPath(orgId, id), {
    method: 'GET',
    headers: headers(orgId)
  })
  if (response.status === HTTP_STATUS_NOT_FOUND) {
    return undefined
  }
  if (!response.ok) {
    throw new BackendRequestError('get transporter', response)
  }
  return toRecord(await response.json())
}

export const createTransporter = async (orgId, body) => {
  const response = await fetch(transportersPath(orgId), {
    method: 'POST',
    headers: headers(orgId),
    body: JSON.stringify(body)
  })
  if (response.status === HTTP_STATUS_BAD_REQUEST) {
    throw validationError(await problemOf(response), response.statusText)
  }
  if (!response.ok) {
    throw new BackendRequestError('create transporter', response)
  }
  return toRecord(await response.json())
}

export const deleteTransporter = async (orgId, id) => {
  const response = await fetch(transportersPath(orgId, id), {
    method: 'DELETE',
    headers: headers(orgId)
  })
  if (response.status === HTTP_STATUS_NOT_FOUND) {
    return false
  }
  if (!response.ok) {
    throw new BackendRequestError('delete transporter', response)
  }
  return true
}
