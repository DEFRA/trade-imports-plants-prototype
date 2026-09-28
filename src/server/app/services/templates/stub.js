import { createFakeStore } from '../../../prototype-support/fake-store.js'
import {
  idFromName,
  searchRecords
} from '../../../prototype-support/search-page.js'
import { toRecord, validationError } from './client.js'

/**
 * The stub: templates people save, kept per design release (a template's
 * answers only make sense to the release that asked the questions) and per
 * organisation. Reset clears them for that release only.
 */

/**
 * Starter templates, in the API's shape. Each needs a `setId`, because its
 * answers belong to one release's questions. The easiest way to make one is
 * to save a template in the running prototype, then copy its row from
 * `.cache/designer/data/<set-id>.templates.json`, dropping `organisationId`.
 */
export const STARTER_TEMPLATES = Object.freeze([])

const store = createFakeStore({
  name: 'templates',
  starters: STARTER_TEMPLATES
})

const summary = ({ fulfilment: _answers, ...rest }) => toRecord(rest)

export const listTemplates = async (orgId, { search = '', page = 1 } = {}) => {
  // Reversed first, so two templates saved in the same millisecond still list
  // the later one first: the sort below is stable.
  const newestFirst = store
    .visible(orgId)
    .reverse()
    .sort((left, right) =>
      String(right.createdAt).localeCompare(String(left.createdAt))
    )
  const found = searchRecords(newestFirst, (row) => [row.name], {
    query: search,
    page
  })
  return { ...found, results: found.results.map(summary) }
}

export const getTemplate = async (orgId, id) => {
  const row = store.find(orgId, id)
  return row ? toRecord(row) : undefined
}

export const createTemplate = async (
  orgId,
  { name, fulfilment, fromJourneyId } = {}
) => {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) {
    throw validationError({
      detail: 'Validation failed',
      errors: { name: ['Enter a name for the template'] }
    })
  }
  const row = store.add(orgId, {
    id: idFromName(trimmed, store.takenIds(orgId)),
    name: trimmed,
    fromJourneyId: fromJourneyId ?? null,
    createdAt: new Date().toISOString(),
    fulfilment: structuredClone(fulfilment ?? {})
  })
  return toRecord(row)
}

export const deleteTemplate = async (orgId, id) => store.remove(orgId, id)
