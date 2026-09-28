import { isStubDataMode } from '../../../common/services/mode.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../lib/http-status.js'
import * as client from './client.js'
import * as stub from './stub.js'

/**
 * Prototype-owned service: notification templates. A template is a named
 * copy of a notification's answers (its `fulfilment`), so a trader can start
 * a new notification already filled in.
 *
 * Built in the real services' shape (`index.js` picks `stub.js` or
 * `client.js`), so a developer can copy `index.js` and `client.js` into
 * plants-frontend unchanged. `stub.js` is the only file that uses the
 * prototype's own plumbing. The code that reads and writes notifications
 * belongs to the release that uses this, in its own feature (see
 * `.claude/skills/fake-a-service/references/fake-a-service.md`).
 */

export { PAGE_SIZE } from './client.js'

export const NEEDS_A_REAL_SERVICE =
  'Notification templates: save a notification’s answers under a name, list and search them, delete one, and start a new notification from one. Plants-frontend and its backend have none.'

export const CONTRACT = Object.freeze({
  service: 'templates',
  owner: 'plants-backend',
  baseUrlEnv: 'TRADE_IMPORTS_PLANTS_BACKEND_URL',
  operations: [
    {
      name: 'listTemplates',
      method: 'GET',
      path: '/templates',
      params: {
        q: 'text to find in the name',
        page: 'number, from 1',
        pageSize: 'number'
      },
      returns:
        '{ items: [template without fulfilment], page, pageSize, totalItems, totalPages }, newest first, for the organisation in the Trade-Imports-Organisation-Id header',
      errors: ['400 when the page is out of range']
    },
    {
      name: 'getTemplate',
      method: 'GET',
      path: '/templates/{id}',
      params: {},
      returns: 'template, with its fulfilment',
      errors: ['404 when the organisation has no such template']
    },
    {
      name: 'createTemplate',
      method: 'POST',
      path: '/templates',
      params: { body: 'name, fulfilment, fromJourneyId' },
      returns: 'the saved template, with its new id and createdAt',
      errors: [
        '400 with a problem body, { errors: { name: [message] } }, when the name is empty'
      ]
    },
    {
      name: 'deleteTemplate',
      method: 'DELETE',
      path: '/templates/{id}',
      params: {},
      returns: '204 with no body',
      errors: ['404 when the organisation has no such template']
    }
  ],
  record: {
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'fromJourneyId', type: 'string', required: false },
      { name: 'createdAt', type: 'string (ISO date and time)', required: true },
      {
        name: 'fulfilment',
        type: 'object: the notification’s answers, as the fulfilments API stores them',
        required: true
      }
    ]
  },
  examples: [
    {
      request: 'POST /templates',
      body: {
        name: 'My usual roses from the Netherlands',
        fromJourneyId: 'GBN-HRP-26-000123',
        fulfilment: {}
      },
      response: {
        id: 'my-usual-roses-from-the-netherlands',
        name: 'My usual roses from the Netherlands',
        fromJourneyId: 'GBN-HRP-26-000123',
        createdAt: '2026-09-28T10:00:00.000Z',
        fulfilment: {}
      }
    }
  ],
  openQuestions: [
    'Which answers should a template keep? Arrival dates and reference numbers probably should not carry over.',
    'What happens to a template when the questions change and its answers no longer fit?',
    'Can a template be shared across an organisation, or is it one person’s?'
  ]
})

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
