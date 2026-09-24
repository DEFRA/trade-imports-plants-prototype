import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * The high-risk-plants set's own happy-path fixture — the exact canned data
 * `fit/journey-smoke.fit.spec.js` drives the real journey with — read back
 * rather than re-invented, so the seed can never describe a consignment the
 * real journey would reject.
 */
const HAPPY_PATHS_URL = new URL(
  '../app/sets/high-risk-plants/journeys/linear/flow/fixtures/happy-path.json',
  import.meta.url
)
const happyPaths = JSON.parse(
  readFileSync(fileURLToPath(HAPPY_PATHS_URL), 'utf8')
)

const stepsThrough = (name, throughSlug) => {
  const { steps } = happyPaths[name]
  const cutoff = steps.findIndex((step) => step.slug === throughSlug)
  return steps.slice(0, cutoff + 1)
}

/**
 * A handful of realistic high-risk-plants notifications, each a named
 * fixture scenario carried a different distance through the same journey a
 * trader would use — so the dashboard shows every status a designer needs to
 * see rather than only the empty state.
 */
export const HIGH_RISK_PLANTS_SCENARIOS = [
  {
    label: 'draft, just started',
    steps: stepsThrough('warePotatoes', 'commodity-type')
  },
  {
    label: 'draft, midway through',
    steps: stepsThrough('plantsForPlanting', 'arrival-details')
  },
  {
    label: 'submitted',
    steps: happyPaths.seedPotatoes.steps,
    submit: true
  },
  {
    label: 'submitted, then amended',
    steps: happyPaths.woodWithoutBark.steps,
    submit: true,
    amend: true
  }
]
