/**
 * Obligations — the sample journey.
 *
 * This is a prototype host: the point of the set is that a second one mounts
 * alongside high-risk-plants and is reachable from the chooser at `/`, not
 * that it models a domain. One obligation, collected by one page, is the
 * smallest manifest that satisfies the platform's boot guards.
 *
 * Copy `high-risk-plants/obligations/` rather than this when a real prototype
 * arrives — that is where the modelling conventions live.
 */

export const consignmentReference = {
  id: '9c1f5d3a-7b24-4e18-9a6d-0f3b8c2e5a71',
  name: 'consignmentReference',
  status: 'mandatory'
}

export const obligations = [consignmentReference]

export const groups = obligations.filter((obligation) =>
  obligations.some((other) => other.within === obligation)
)
