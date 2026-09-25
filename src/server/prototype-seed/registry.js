/**
 * Which reference numbers were seeded, per set.
 *
 * The example data is shared: one set of seeded notifications per set, shown
 * to everyone who signs in. Read by `adopt-known-journeys.js` to decide which
 * reference numbers a browser session that has not seen them yet should be
 * told about, so a freshly seeded dashboard is not empty on a session's very
 * first visit.
 */
const seeded = new Map()

export const recordSeeded = (setId, journeyIds) => {
  seeded.set(setId, journeyIds)
}

export const seededIdsFor = (setId) => seeded.get(setId) ?? []

export const clearSeeded = (setId) => {
  seeded.delete(setId)
}
