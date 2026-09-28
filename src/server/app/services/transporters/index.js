import { isStubDataMode } from '../../../common/services/mode.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../lib/http-status.js'
import * as client from './client.js'
import * as stub from './stub.js'

/**
 * Prototype-owned service: an organisation's saved transporters.
 *
 * Built in the real services' shape (`index.js` picks `stub.js` or
 * `client.js`), so a developer can copy `index.js` and `client.js` into
 * plants-frontend unchanged. `stub.js` is the only file that uses the
 * prototype's own plumbing.
 */

export { PAGE_SIZE, TRANSPORTER_TYPES } from './client.js'

export const NEEDS_A_REAL_SERVICE =
  'A transporter register: search an organisation’s saved transporters, read one, add one and delete one. Plants-frontend has none: its team removed the transporter pages on purpose.'

export const CONTRACT = Object.freeze({
  service: 'transporters',
  owner: 'new-api',
  baseUrlEnv: 'TRADE_IMPORTS_TRANSPORTERS_URL',
  operations: [
    {
      name: 'listTransporters',
      method: 'GET',
      path: '/organisation/{organisationId}/transporters',
      params: {
        q: 'text to find in the name, address or approval number',
        page: 'number, from 1',
        pageSize: 'number, 5 for a picker'
      },
      returns:
        '{ items: [transporter], page, pageSize, totalItems, totalPages }',
      errors: ['400 when the page is out of range']
    },
    {
      name: 'getTransporter',
      method: 'GET',
      path: '/organisation/{organisationId}/transporters/{id}',
      params: {},
      returns: 'transporter',
      errors: ['404 when the organisation has no such transporter']
    },
    {
      name: 'createTransporter',
      method: 'POST',
      path: '/organisation/{organisationId}/transporters',
      params: {
        body: 'name, transporterType, approvalNumber, addressLine1, townOrCity, postcode, country'
      },
      returns:
        'the saved transporter, with its new id and approvalStatus "new"',
      errors: [
        '400 with a problem body, { errors: { field: [message] } }, for each field it refuses'
      ]
    },
    {
      name: 'deleteTransporter',
      method: 'DELETE',
      path: '/organisation/{organisationId}/transporters/{id}',
      params: {},
      returns: '204 with no body',
      errors: ['404 when the organisation has no such transporter']
    }
  ],
  record: {
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      {
        name: 'transporterType',
        type: 'string',
        required: true,
        enum: ['commercial', 'private']
      },
      { name: 'approvalNumber', type: 'string', required: false },
      {
        name: 'approvalStatus',
        type: 'string',
        required: true,
        enum: ['approved', 'new']
      },
      { name: 'addressLine1', type: 'string', required: true },
      { name: 'townOrCity', type: 'string', required: true },
      { name: 'postcode', type: 'string', required: false },
      { name: 'country', type: 'string', required: true },
      { name: 'deleted', type: 'boolean', required: true }
    ]
  },
  examples: [
    {
      request:
        'GET /organisation/5900001/transporters?page=1&pageSize=5&q=felixstowe',
      response: {
        items: [
          {
            id: 'harbourline-haulage-ltd',
            name: 'Harbourline Haulage Ltd',
            transporterType: 'commercial',
            approvalNumber: 'UK/SUFFOLK/T1/00092001',
            approvalStatus: 'approved',
            addressLine1: '4 Quayside Park',
            townOrCity: 'Felixstowe',
            postcode: 'IP11 3QT',
            country: 'United Kingdom',
            deleted: false
          }
        ],
        page: 1,
        pageSize: 5,
        totalItems: 1,
        totalPages: 1
      }
    }
  ],
  openQuestions: [
    'Which service owns transporters: a new API, the address book, or the plants backend?',
    'Is the approval number checked against a register, and who sets approvalStatus?',
    'Should country be an ISO code, as the address book stores it?'
  ]
})

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
