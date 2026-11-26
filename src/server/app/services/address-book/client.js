import { getTraceId } from '@defra/hapi-tracing'

import { ORGANISATION_ID_HEADER } from '../../../common/helpers/organisation-id.js'
import { addressBookCountryName } from '../countries/index.js'
import { HTTP_STATUS_NOT_FOUND } from '../../lib/http-status.js'
import { BackendRequestError } from '../persistence/records/errors.js'

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

const headers = (orgId) => ({
  'Content-Type': 'application/json',
  [ORGANISATION_ID_HEADER]: orgId,
  [tracingHeader]: getTraceId() ?? ''
})

const failed = (what, response) => new BackendRequestError(what, response)

const toRecord = async (operator) => ({
  id: operator.id,
  name: operator.name,
  deleted: Boolean(operator.deleted),
  roles: operator.roles,
  address: {
    addressLine1: operator.addressLine1,
    addressLine2: operator.addressLine2,
    townOrCity: operator.townOrCity,
    county: operator.county,
    postcode: operator.postcode,
    countryCode: operator.countryCode,
    country: await addressBookCountryName(operator.countryCode),
    phone: operator.phone,
    email: operator.email
  }
})

/** The largest page size the address book serves. */
export const MAX_API_PAGE_SIZE = 100

/** One page of the organisation's live addresses with its paging numbers. */
export const listAddresses = async (
  orgId,
  { page = 1, pageSize, query, countryCodes = [] } = {}
) => {
  const url = new URL(addressesUrl(orgId))
  url.searchParams.set('page', String(page))
  if (pageSize) {
    url.searchParams.set('pageSize', String(pageSize))
  }
  if (query) {
    url.searchParams.set('q', query)
  }
  for (const countryCode of countryCodes) {
    url.searchParams.append('countryCode', countryCode)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: headers(orgId)
  })

  if (!response.ok) {
    throw failed('list addresses', response)
  }

  const body = await response.json()
  return {
    records: await Promise.all(body.items.map(toRecord)),
    page: body.page,
    pageSize: body.pageSize,
    totalItems: body.totalItems,
    totalPages: body.totalPages
  }
}

/** The address with the given id, a deleted one included and marked deleted, or nothing when the address book has none. */
export const getAddress = async (orgId, addressId) => {
  const response = await fetch(addressesUrl(orgId, addressId), {
    method: 'GET',
    headers: headers(orgId)
  })

  if (response.status === HTTP_STATUS_NOT_FOUND) {
    return undefined
  }
  if (!response.ok) {
    throw failed('get address', response)
  }

  return toRecord(await response.json())
}
