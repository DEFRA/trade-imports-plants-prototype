import { HAPPY_PATH } from '../fixtures.js'

/**
 * The examples every set with a happy-path fixture gets when it has no
 * `scenarios/<set-id>.js` of its own: a draft just started, a draft part way
 * through, a submitted notification and a submitted then amended one — the
 * statuses a dashboard needs to show — and, when its happy path has a
 * fixture marked `"late": true`, one submitted late, so the dashboard's Late
 * tag shows too.
 *
 * A design release copied from high-risk-plants has the same fixture names, so
 * it gets exactly high-risk-plants' first five examples. Any other set gets the
 * same four kinds, built from whichever fixtures its happy path has.
 */
const PREFERRED = Object.freeze([
  {
    label: 'Draft, just started',
    slug: 'draft-just-started',
    fixture: 'warePotatoes',
    through: 'commodities/details',
    part: 'start'
  },
  {
    label: 'Draft, part way through',
    slug: 'draft-midway',
    fixture: 'plantsForPlanting',
    through: 'destinations/select',
    part: 'middle',
    featured: 2,
    headline: 'Save a notification and come back to it later',
    story:
      'A trader answers about half the questions, leaves, and finds the draft waiting on their dashboard.'
  },
  {
    label: 'Submitted',
    slug: 'submitted',
    fixture: 'seedPotatoes',
    submit: true,
    featured: 1,
    headline: 'Send a notification from start to finish',
    story:
      'A trader answers every question, checks their answers and sends the notification.'
  },
  {
    label: 'Submitted, then amended',
    slug: 'amended',
    fixture: 'woodWithoutBark',
    submit: true,
    amend: true,
    featured: 3,
    headline: 'Change a notification after sending it',
    story: 'A trader sends a notification, then starts to change it.'
  }
])

/**
 * The first page a walk visits at or after `from` that it has not visited
 * before, so stopping there leaves every earlier page answered.
 */
const freshPageFrom = (steps, from) => {
  const firstVisit = new Map()
  steps.forEach((step, index) => {
    if (!firstVisit.has(step.slug)) {
      firstVisit.set(step.slug, index)
    }
  })
  const found = [...firstVisit.entries()].find(([, index]) => index >= from)
  return found?.[0]
}

const HALF = 2

const stopFor = (part, steps) =>
  freshPageFrom(steps, part === 'start' ? 1 : Math.floor(steps.length / HALF))

const visits = (fixture, slug) =>
  Array.isArray(fixture?.steps) &&
  fixture.steps.some((step) => step.slug === slug)

const withFixture = (plan, name, fixture) => {
  const { part, ...example } = plan
  if (!part) {
    return { ...example, fixture: { file: HAPPY_PATH, name } }
  }
  const through =
    name === plan.fixture && visits(fixture, plan.through)
      ? plan.through
      : stopFor(part, fixture.steps)
  return through
    ? { ...example, fixture: { file: HAPPY_PATH, name }, through }
    : { ...example, fixture: { file: HAPPY_PATH, name } }
}

const LATE = Object.freeze({
  label: 'Submitted late',
  slug: 'submitted-late',
  submit: true
})

/** The late example, from the first fixture the happy path marks late, or
 * none: a fixture that is not late would show no Late tag. */
const lateExample = (happyPath, names) => {
  const name = names.find((candidate) => happyPath[candidate].late === true)
  return name ? [{ ...LATE, fixture: { file: HAPPY_PATH, name } }] : []
}

/**
 * The default examples for a set.
 *
 * @param {Record<string, Record<string, object>>} pool - the set's fixtures.
 * @returns {object[]} four examples in the scenario grammar (five with a late
 * fixture), or none when the set has no happy path.
 */
export const defaultExamples = (pool) => {
  const happyPath = pool[HAPPY_PATH] ?? {}
  const names = Object.keys(happyPath).filter((name) =>
    Array.isArray(happyPath[name]?.steps)
  )
  if (names.length === 0) {
    return []
  }
  return [
    ...PREFERRED.map((plan, index) => {
      const name = names.includes(plan.fixture)
        ? plan.fixture
        : names[index % names.length]
      return withFixture(plan, name, happyPath[name])
    }),
    ...lateExample(happyPath, names)
  ]
}
