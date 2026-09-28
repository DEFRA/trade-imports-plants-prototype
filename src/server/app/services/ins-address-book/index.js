import { isStubDataMode } from '../../../common/services/mode.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../lib/http-status.js'
import * as client from './client.js'
import * as stub from './stub.js'

/**
 * Prototype-owned service: the organisation's address book, with the
 * Import Notification Service (INS) frontend's own API — list, create, get,
 * update and delete. A copy of trade-imports-ins-frontend's
 * `src/server/app/services/address-book/index.js`, in the same shape.
 *
 * Plants-frontend only reads the address book (`../address-book/index.js`,
 * `search` and `party`); the INS frontend is its only writer. Use this
 * service for address book pages in a design release. The journey's pickers
 * keep reading `../address-book/index.js`, unchanged, and still see every
 * address added, changed or deleted here.
 */

export const NEEDS_A_REAL_SERVICE =
  'Changing the address book belongs to the Import Notification Service frontend: it already has this API (list, add, read, change and delete an address) and is the address book’s only writer. Plants-frontend only reads it. These pages need to move there, or plants-frontend needs agreement to write to the address book.'

const ADDRESSES = '/organisation/{organisationId}/addresses'
const ONE_ADDRESS = `${ADDRESSES}/{id}`

export const CONTRACT = Object.freeze({
  service: 'ins-address-book',
  owner: 'ins',
  baseUrlEnv: 'TRADE_IMPORTS_ADDRESS_BOOK_URL',
  operations: [
    {
      name: 'listAddresses',
      method: 'GET',
      path: ADDRESSES,
      params: {
        page: 'number, from 1',
        q: 'text to find in the name or address',
        countryCode: 'ISO 3166-1 alpha-2'
      },
      returns:
        '{ items: [address], page, pageSize: 25, totalItems, totalPages }',
      errors: ['400 when the page is out of range']
    },
    {
      name: 'createAddress',
      method: 'POST',
      path: ADDRESSES,
      params: { body: 'address, without id' },
      returns: 'the saved address, with its new id',
      errors: [
        '400 with a problem body, { errors: { field: [message] } }, for each field it refuses'
      ]
    },
    {
      name: 'getAddress',
      method: 'GET',
      path: ONE_ADDRESS,
      params: {},
      returns: 'address; a deleted one comes back with deleted: true',
      errors: ['404 when the organisation has no such address']
    },
    {
      name: 'updateAddress',
      method: 'PUT',
      path: ONE_ADDRESS,
      params: { body: 'address' },
      returns: 'the changed address',
      errors: ['400 with a problem body', '404 when there is no such address']
    },
    {
      name: 'deleteAddress',
      method: 'DELETE',
      path: ONE_ADDRESS,
      params: {},
      returns: '204 with no body',
      errors: []
    }
  ],
  record: {
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'addressLine1', type: 'string', required: true },
      { name: 'addressLine2', type: 'string', required: false },
      { name: 'townOrCity', type: 'string', required: true },
      { name: 'county', type: 'string', required: false },
      { name: 'postcode', type: 'string', required: true },
      {
        name: 'countryCode',
        type: 'string (ISO 3166-1 alpha-2)',
        required: true
      },
      { name: 'phone', type: 'string', required: true },
      { name: 'email', type: 'string', required: true },
      { name: 'deleted', type: 'boolean', required: true }
    ]
  },
  examples: [
    {
      request: 'POST /organisation/5900001/addresses',
      body: {
        name: 'Greenhouse Imports Ltd',
        addressLine1: '4 Nursery Lane',
        townOrCity: 'Spalding',
        postcode: 'PE11 1AA',
        countryCode: 'GB',
        phone: '01632 960001',
        email: 'orders@greenhouse.example.com'
      },
      response: {
        id: '665f1c2ab3e4d51a2c9d0e77',
        name: 'Greenhouse Imports Ltd',
        addressLine1: '4 Nursery Lane',
        townOrCity: 'Spalding',
        postcode: 'PE11 1AA',
        countryCode: 'GB',
        phone: '01632 960001',
        email: 'orders@greenhouse.example.com',
        deleted: false
      }
    }
  ],
  openQuestions: [
    'Should these pages live in the Import Notification Service frontend, which owns the address book?',
    'Does the address book need anything a design adds, such as categories or usages?'
  ]
})

const impl = () => (isStubDataMode() ? stub : client)

export const listAddresses = (orgId, search) =>
  impl().listAddresses(orgId, search)

export const createAddress = (orgId, body) => impl().createAddress(orgId, body)

export const getAddress = (orgId, id) => impl().getAddress(orgId, id)

export const updateAddress = (orgId, id, body) =>
  impl().updateAddress(orgId, id, body)

export const deleteAddress = (orgId, id) => impl().deleteAddress(orgId, id)

export const mapApiErrorsToFormErrors = (problemBody) =>
  Object.fromEntries(
    Object.entries(problemBody?.errors ?? {}).map(([field, messages]) => [
      field,
      messages[0]
    ])
  )

export const isValidationFailure = (err) =>
  err?.status === HTTP_STATUS_BAD_REQUEST && Boolean(err.body?.errors)
