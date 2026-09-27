import { readFileSync } from 'node:fs'

import { createFakeStore } from '../lib/fake-store.js'
import { idFromName, PAGE_SIZE, searchRecords } from '../lib/search-page.js'

/**
 * FAKE SERVICE: saved transporters.
 *
 * Needs a real service. Plants-frontend has no transporter register: its team
 * removed the transporter pages on purpose. This fake lets a design release
 * show "search your saved transporters, pick one, or add a new one" without
 * one. Every hand-off that uses it must say so.
 *
 * Shaped like the address book (`src/server/app/services/address-book/`):
 * `search(orgId, { query, page })` returns
 * `{ results, total, page, totalPages, pageSize }`, and each record has `id`,
 * `name`, `deleted` and an `address`. A picker page copied from the address
 * book can use it by swapping one import.
 *
 * Starter transporters live in `data.json` (seen by every organisation).
 * Transporters people add are kept per set and per organisation, and Reset
 * clears them.
 */
export const SERVICE = Object.freeze({
  name: 'transporters',
  needsARealService:
    'A transporter register: search an organisation’s saved transporters, read one, and add one. Plants-frontend has none.'
})

export { PAGE_SIZE }

/** The transporter types a record can have. Their labels belong in copy. */
export const TRANSPORTER_TYPES = Object.freeze(['commercial', 'private'])

/** Fields `addTransporter` needs, in the order a form asks for them. */
export const REQUIRED_FIELDS = Object.freeze([
  'name',
  'transporterType',
  'addressLine1',
  'townOrCity',
  'country'
])

const starters = JSON.parse(
  readFileSync(new URL('./data.json', import.meta.url), 'utf8')
).map((row) => ({ ...row, deleted: false }))

const store = createFakeStore({ ...SERVICE, starters })

const searchable = (record) => [
  record.name,
  record.address,
  record.approvalNumber
]

/**
 * Free-text search over an organisation's transporters, one page at a time.
 *
 * @param {string} orgId - the signed-in organisation (`organisationIdOf(request)`).
 * @param {object} [options]
 * @param {string} [options.query] - text to find in the name, address or
 * approval number; empty lists every transporter.
 * @param {number} [options.page] - the page, counting from 1.
 * @returns {Promise<{results: Array<object>, total: number, page: number, totalPages: number, pageSize: number}>}
 * one page of transporters.
 */
export const search = async (orgId, { query = '', page = 1 } = {}) =>
  searchRecords(store.visible(orgId), searchable, { query, page })

/**
 * One transporter by id.
 *
 * @param {string} orgId - the signed-in organisation.
 * @param {string} id - the transporter's id.
 * @returns {Promise<object|undefined>} the transporter, or undefined when this
 * organisation has no such transporter.
 */
export const transporter = async (orgId, id) => store.find(orgId, id)

/**
 * Which required fields are missing, as `{ field: 'missing' }`, plus
 * `transporterType: 'unknown'` for a type that is not one of
 * `TRANSPORTER_TYPES`. Empty when the fields can be saved. The words a user
 * sees belong in the release's copy, keyed by field.
 *
 * @param {object} fields - what the "add a transporter" form sent.
 * @returns {object} error codes by field.
 */
export const validateTransporter = (fields = {}) => {
  const errors = {}
  for (const field of REQUIRED_FIELDS) {
    if (!String(fields[field] ?? '').trim()) {
      errors[field] = 'missing'
    }
  }
  if (
    !errors.transporterType &&
    !TRANSPORTER_TYPES.includes(fields.transporterType)
  ) {
    errors.transporterType = 'unknown'
  }
  return errors
}

/**
 * Saves a new transporter for an organisation. It shows in that
 * organisation's searches straight away, with the approval status `new`.
 *
 * @param {string} orgId - the signed-in organisation.
 * @param {object} fields - `name`, `transporterType`, `addressLine1`,
 * `townOrCity`, `postalOrZipCode`, `country` and optional `approvalNumber`.
 * @returns {Promise<object>} the saved transporter, with its new `id`.
 * @throws {Error} when `validateTransporter` would report an error.
 */
export const addTransporter = async (orgId, fields) => {
  const errors = validateTransporter(fields)
  if (Object.keys(errors).length > 0) {
    throw new Error(
      `Transporter not saved, fields to fix: ${Object.keys(errors).join(', ')}`
    )
  }
  const text = (field) => String(fields[field] ?? '').trim()
  return store.add(orgId, {
    id: idFromName(text('name'), store.takenIds(orgId)),
    name: text('name'),
    deleted: false,
    address: {
      addressLine1: text('addressLine1'),
      townOrCity: text('townOrCity'),
      postalOrZipCode: text('postalOrZipCode'),
      country: text('country')
    },
    approvalNumber: text('approvalNumber'),
    transporterType: fields.transporterType,
    approvalStatus: 'new'
  })
}

/**
 * Removes a transporter this organisation added, or hides a starter one from
 * it.
 *
 * @param {string} orgId - the signed-in organisation.
 * @param {string} id - the transporter's id.
 * @returns {Promise<boolean>} false when there was no such transporter.
 */
export const removeTransporter = async (orgId, id) => store.remove(orgId, id)

/**
 * Empties the transporters people added, in the active set (or the named
 * one). The chooser's Reset calls this through the records wrapper.
 *
 * @param {string} [setId] - the set to clear; the active set by default.
 */
export const clear = (setId) => store.clear(setId)
