/**
 * Which reference numbers were seeded, per set and organisation.
 *
 * Read by `adopt-known-journeys.js` to decide which reference numbers a
 * browser session that has not seen them yet should be told about, so a
 * freshly seeded dashboard is not empty on a session's very first visit.
 */
const seeded = new Map()

const keyFor = (setId, organisationId) => `${setId}\u0000${organisationId}`

export const recordSeeded = (setId, organisationId, journeyIds) => {
  seeded.set(keyFor(setId, organisationId), journeyIds)
}

export const seededIdsFor = (setId, organisationId) =>
  seeded.get(keyFor(setId, organisationId)) ?? []

export const clearSeeded = (setId) => {
  for (const key of seeded.keys()) {
    if (key.startsWith(`${setId}\u0000`)) {
      seeded.delete(key)
    }
  }
}

export const clearSeededForOrganisation = (setId, organisationId) => {
  seeded.delete(keyFor(setId, organisationId))
}
