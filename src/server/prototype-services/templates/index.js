import { readFileSync } from 'node:fs'

import { createFakeStore } from '../lib/fake-store.js'
import { idFromName, PAGE_SIZE, searchRecords } from '../lib/search-page.js'

/**
 * FAKE SERVICE: notification templates.
 *
 * Needs a real service. Neither plants-frontend nor its backend can save a
 * notification as a template. This fake lets a design release show "save this
 * notification as a template" and "start a new notification from a template"
 * without one. Every hand-off that uses it must say so.
 *
 * A template is a named copy of a notification's answers (its `fulfilment`),
 * taken from the records store. Starting from one makes a new draft with
 * those answers. The answers belong to one set's questions, so templates are
 * kept per set, and per organisation, and Reset clears them.
 *
 * Starter templates live in `data.json`. Each needs a `setId`, because its
 * answers only make sense to the set that asked the questions. The easiest way
 * to make one is to save a template in the running prototype, then copy its
 * row from `.cache/designer/data/<set-id>.templates.json`.
 *
 * The functions that read and write notifications are in `./journey.js`.
 */
export const SERVICE = Object.freeze({
  name: 'templates',
  needsARealService:
    'Notification templates: save a notification’s answers under a name, list and search them, delete one, and start a new notification from one. Plants-frontend and its backend have none.'
})

export { PAGE_SIZE }

const starters = JSON.parse(
  readFileSync(new URL('./data.json', import.meta.url), 'utf8')
)

const store = createFakeStore({ ...SERVICE, starters })

const summary = ({ fulfilment: _answers, ...rest }) => rest

/**
 * Search an organisation's templates by name, one page at a time. Results
 * leave out the saved answers, which a list never needs.
 *
 * @param {string} orgId - the signed-in organisation.
 * @param {object} [options]
 * @param {string} [options.query] - text to find in the name.
 * @param {number} [options.page] - the page, counting from 1.
 * @returns {Promise<{results: Array<object>, total: number, page: number, totalPages: number, pageSize: number}>}
 * one page of templates, newest first.
 */
export const search = async (orgId, { query = '', page = 1 } = {}) => {
  // Reversed first, so two templates saved in the same millisecond still list
  // the later one first: the sort below is stable.
  const newestFirst = store
    .visible(orgId)
    .map(summary)
    .reverse()
    .sort((left, right) =>
      String(right.createdAt).localeCompare(String(left.createdAt))
    )
  return searchRecords(newestFirst, (record) => [record.name], {
    query,
    page
  })
}

/**
 * One template by id, answers included.
 *
 * @param {string} orgId - the signed-in organisation.
 * @param {string} id - the template's id.
 * @returns {Promise<object|undefined>} the template, or undefined when this
 * organisation has no such template.
 */
export const template = async (orgId, id) => store.find(orgId, id)

/**
 * Saves a notification's answers as a new template.
 *
 * @param {string} orgId - the signed-in organisation.
 * @param {object} details
 * @param {string} details.name - the name the user gave it.
 * @param {object} details.fulfilment - the answers, as the records store's
 * `load()` returns them.
 * @param {string} [details.fromJourneyId] - the notification it was made from.
 * @returns {Promise<object>} the saved template, with its new `id`.
 * @throws {Error} when the name is empty.
 */
export const saveTemplate = async (
  orgId,
  { name, fulfilment, fromJourneyId }
) => {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) {
    throw new Error('A template needs a name')
  }
  return store.add(orgId, {
    id: idFromName(trimmed, store.takenIds(orgId)),
    name: trimmed,
    fromJourneyId: fromJourneyId ?? null,
    createdAt: new Date().toISOString(),
    fulfilment: structuredClone(fulfilment ?? {})
  })
}

/**
 * Deletes a template this organisation saved, or hides a starter one from it.
 *
 * @param {string} orgId - the signed-in organisation.
 * @param {string} id - the template's id.
 * @returns {Promise<boolean>} false when there was no such template.
 */
export const deleteTemplate = async (orgId, id) => store.remove(orgId, id)

/**
 * Empties the templates people saved, in the active set (or the named one).
 * The chooser's Reset calls this through the records wrapper.
 *
 * @param {string} [setId] - the set to clear; the active set by default.
 */
export const clear = (setId) => store.clear(setId)
