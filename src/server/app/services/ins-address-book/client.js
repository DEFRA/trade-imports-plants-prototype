import { getTraceId } from '@defra/hapi-tracing'

import { HTTP_STATUS_BAD_REQUEST } from '../../lib/http-status.js'

/** The Import Notification Service's address book client: the same request
 * shape as trade-imports-ins-frontend's own
 * (`src/server/app/services/address-book/client.js`), kept in step by
 * `ins-address-book.test.js`'s shape-drift test. The address book API
 * exists: this is the client the INS frontend already uses, so the
 * address-book pages a design release builds on it can move to the INS
 * frontend unchanged. See `contract.json`. */

const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

const addressBookUrl =
  process.env.TRADE_IMPORTS_ADDRESS_BOOK_URL ?? 'http://localhost:8089'

const tracingHeader = process.env.TRACING_HEADER ?? 'x-cdp-request-id'

const addressesUrl = (orgId, addressId) => {
  if (!orgId) {
    throw new Error(
      'Cannot reach the address book without an organisation: the signed-in session carries none'
    )
  }
  const base = `${addressBookUrl}/organisation/${encodeURIComponent(orgId)}/addresses`
  return addressId ? `${base}/${encodeURIComponent(addressId)}` : base
}

// The organisation header is the authorisation — the address book trusts it with no further authentication (see its IdentityHeaderFilter). It must come only from the authenticated session, and must match the orgId in the path (cv-010).
const headers = (orgId) => ({
  'Content-Type': 'application/json',
  [ORGANISATION_ID_HEADER]: orgId,
  [tracingHeader]: getTraceId() ?? ''
})

const parseProblemBody = async (response) => {
  try {
    return await response.json()
  } catch {
    return {}
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
  Object.assign(new Error(problem.detail ?? 'Validation failed'), {
    status: HTTP_STATUS_BAD_REQUEST,
    statusText,
    body: problem
  })

const throwOnError = async (response) => {
  if (response.ok) {
    return
  }
  const problem = await parseProblemBody(response)
  throw Object.assign(
    new Error(
      problem.detail ??
        problem.message ??
        `Address book request failed: ${response.status} ${response.statusText}`
    ),
    { status: response.status, statusText: response.statusText, body: problem }
  )
}

/**
 * One address as the INS pages read it: the API's own wire shape (`name`,
 * `addressLine1`, `addressLine2`, `townOrCity`, `county`, `postcode`,
 * `countryCode`, `phone`, `email`), with `deleted` always a boolean.
 *
 * @param {object} address - the API's record.
 * @returns {object} the record the pages read.
 */
export const toRecord = (address) => ({
  ...address,
  deleted: Boolean(address.deleted)
})

const throwOnValidationFailure = async (response) => {
  if (response.status === HTTP_STATUS_BAD_REQUEST) {
    throw validationError(await parseProblemBody(response), response.statusText)
  }
  return throwOnError(response)
}

export const listAddresses = async (
  orgId,
  { page = 1, q, countryCode } = {}
) => {
  const url = new URL(addressesUrl(orgId))
  url.searchParams.set('page', String(page))
  if (q) {
    url.searchParams.set('q', q)
  }
  if (countryCode) {
    url.searchParams.set('countryCode', countryCode)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: headers(orgId)
  })

  await throwOnError(response)
  const found = await response.json()
  return { ...found, items: found.items.map(toRecord) }
}

export const createAddress = async (orgId, body) => {
  const response = await fetch(addressesUrl(orgId), {
    method: 'POST',
    headers: headers(orgId),
    body: JSON.stringify(body)
  })

  await throwOnValidationFailure(response)
  return toRecord(await response.json())
}

export const getAddress = async (orgId, id) => {
  const response = await fetch(addressesUrl(orgId, id), {
    method: 'GET',
    headers: headers(orgId)
  })

  await throwOnError(response)
  return toRecord(await response.json())
}

export const updateAddress = async (orgId, id, body) => {
  const response = await fetch(addressesUrl(orgId, id), {
    method: 'PUT',
    headers: headers(orgId),
    body: JSON.stringify(body)
  })

  await throwOnValidationFailure(response)
  return toRecord(await response.json())
}

export const deleteAddress = async (orgId, id) => {
  const response = await fetch(addressesUrl(orgId, id), {
    method: 'DELETE',
    headers: headers(orgId)
  })

  await throwOnError(response)
}
