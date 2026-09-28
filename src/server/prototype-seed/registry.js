import { DELETED } from './grammar.js'

/**
 * What was seeded, per set.
 *
 * Two lists, because not every example is for everyone:
 *
 * - `seededIdsFor` — the reference numbers every signed-in session is told
 *   about, so a freshly seeded dashboard is not empty on a session's very
 *   first visit. Shared examples only: an example made for one organisation is
 *   not here, and neither is a deleted one (no dashboard lists it).
 * - `seededExamplesFor` — every example as made, with its stable slug, status,
 *   organisation and the page it stopped on. Example links and
 *   `designer:examples` read this.
 */
const seeded = new Map()
const examplesBySet = new Map()

export const recordSeeded = (setId, journeyIds) => {
  seeded.set(setId, journeyIds)
}

export const seededIdsFor = (setId) => seeded.get(setId) ?? []

export const hasBeenSeeded = (setId) => seeded.has(setId)

/**
 * @param {string} setId
 * @param {object[]} examples - each example as made by `seed-set.js`.
 */
export const recordExamples = (setId, examples) => {
  examplesBySet.set(setId, examples)
}

export const seededExamplesFor = (setId) => examplesBySet.get(setId) ?? []

/**
 * The reference numbers of the examples made for one organisation only, and
 * still listed on a dashboard.
 *
 * @param {string} setId
 * @param {string} [organisationId] - the signed-in organisation.
 * @returns {string[]} the reference numbers.
 */
export const organisationIdsFor = (setId, organisationId) =>
  organisationId
    ? seededExamplesFor(setId)
        .filter(
          (example) =>
            example.organisationId === organisationId &&
            example.status !== DELETED
        )
        .map((example) => example.journeyId)
    : []

export const clearSeeded = (setId) => {
  seeded.delete(setId)
  examplesBySet.delete(setId)
}
