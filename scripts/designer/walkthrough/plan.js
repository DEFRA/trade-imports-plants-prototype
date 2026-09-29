/**
 * What the walkthrough report walks: every set that has a journey, and in
 * each set one story per labelled example plus one story showing each page's
 * error messages. Nothing here is checked in per set: the walkthrough spec
 * (fit/walkthroughs/walkthroughs.walkthrough.spec.js) asks for this plan every
 * time it runs, so a new design release, a new example or a moved page shows
 * up in the next report with no one writing a test for it.
 *
 * `planWalkthroughs` is pure (sets in, plan out). `readSets` reads the sets
 * from this checkout.
 */
import { existsSync } from 'node:fs'

import {
  PLACEHOLDER_SET,
  REAL_JOURNEY_SET,
  listSets,
  releaseInfo,
  setDir
} from '../lib/sets.js'
import { REPO_ROOT } from '../lib/repo.js'
import { fixtureFileOf, readScenarios } from '../show/steps.js'
import {
  findFixture,
  loadFixturePool
} from '../../../src/server/prototype-seed/fixtures.js'
import { loadExamples } from '../../../src/server/prototype-seed/examples.js'

export const REAL_JOURNEY_TITLE = 'The real journey'
export const ERROR_STORY_NAME = 'What each page says when something is missing'
export const ERROR_STORY_SLUG = 'error-messages'
export const BROKEN_STORY_NAME = 'The examples could not be read'

/** Every walkthrough test carries this tag, so the report can filter to them. */
export const WALKTHROUGH_TAG = '@walkthrough'

/** The tag that picks out one set's stories in the report. */
export const setTag = (setId) => `@${setId}`

const sentenceCase = (setId) => {
  const words = setId.replaceAll('-', ' ')
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`
}

/**
 * A set's name in the report: "The real journey (high-risk-plants)", or a
 * release's own title from its release.json, "Working release
 * (plants-working)".
 */
export const setTitle = (setId, release = null) => {
  const name =
    setId === REAL_JOURNEY_SET
      ? REAL_JOURNEY_TITLE
      : (release?.title ?? sentenceCase(setId))
  return `${name} (${setId})`
}

/**
 * The set ids named in `WALKTHROUGH_SETS` (`a,b`), or null for every set.
 *
 * @param {string|undefined} value
 * @returns {string[]|null}
 */
export const onlySetsFrom = (value) => {
  const ids = String(value ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id !== '')
  return ids.length > 0 ? ids : null
}

/** A scenario's name, like `warePotatoes`, as a slug: `ware-potatoes`. */
export const slugOf = (name) =>
  String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** At most this many examples can be featured on the demo page. */
export const MAX_FEATURED = 4

/** The headline a set's first story gets when nothing is featured on purpose. */
export const FALLBACK_HEADLINE = 'Send a notification from start to finish'

export const ERROR_STORY_HEADLINE = 'What happens when something is missing'

const exampleStory = (example) => ({
  kind: 'example',
  name: example.label,
  slug: example.slug,
  story: example.story ?? example.useCase ?? null,
  steps: example.steps,
  through: example.through ?? null,
  submit: example.submit === true,
  amend: example.amend === true,
  cancelAmend: example.cancelAmend === true,
  delete: example.delete === true,
  fixture: example.fixture ?? null,
  madeBy: example.organisationId ?? null,
  featured: example.featured ?? null,
  headline: example.headline ?? example.label
})

const scenarioStory = (scenario) => ({
  kind: 'example',
  name: scenario.useCase ?? scenario.name,
  slug: slugOf(scenario.name),
  story: scenario.useCase ?? null,
  steps: scenario.steps,
  through: null,
  submit: true,
  amend: false,
  cancelAmend: false,
  delete: false,
  fixture: `happy-path/${scenario.name}`,
  madeBy: null,
  featured: null,
  headline: scenario.useCase ?? scenario.name
})

const isFullWalk = (example) => !example.through && !example.delete

/**
 * The story that sends every page empty first, to show its error messages.
 * It walks the first example that answers every page, or else the first
 * happy-path scenario. Null when there is neither.
 *
 * @param {object[]} examples
 * @param {object[]} scenarios
 * @param {number} highestFeatured - the highest featured position already in
 *   use, so the error story lands one place after it (at most 5th).
 */
const errorStory = (examples, scenarios, highestFeatured) => {
  const example = examples.find(isFullWalk)
  const walk = example
    ? { steps: example.steps, fixture: example.fixture ?? null }
    : scenarios[0] && {
        steps: scenarios[0].steps,
        fixture: `happy-path/${scenarios[0].name}`
      }
  if (!walk) {
    return null
  }
  return {
    kind: 'errors',
    name: ERROR_STORY_NAME,
    slug: ERROR_STORY_SLUG,
    story:
      'Each page is first sent with nothing filled in, to show the message a trader would see, then filled in properly.',
    featured: highestFeatured + 1,
    headline: ERROR_STORY_HEADLINE,
    ...walk
  }
}

/**
 * Makes every story name in a set unique, so each is its own test: a label
 * used twice gets its slug added.
 */
const uniqueNames = (stories) => {
  const counts = new Map()
  for (const story of stories) {
    counts.set(story.name, (counts.get(story.name) ?? 0) + 1)
  }
  return stories.map((story) =>
    counts.get(story.name) > 1
      ? { ...story, name: `${story.name} (${story.slug})` }
      : story
  )
}

/**
 * When a set has featured nothing on purpose, the first example that sends
 * its notification is featured as 1, with a headline every stakeholder can
 * follow, or failing that the first story. So every set always has a
 * headline video.
 */
const withFallbackFeature = (stories) => {
  if (
    stories.length === 0 ||
    stories.some((story) => story.featured !== null)
  ) {
    return stories
  }
  const chosen = stories.findIndex((story) => story.submit)
  const index = chosen === -1 ? 0 : chosen
  return stories.map((story, i) =>
    i === index ? { ...story, featured: 1, headline: FALLBACK_HEADLINE } : story
  )
}

const highestFeaturedOf = (stories) =>
  stories.reduce((max, story) => Math.max(max, story.featured ?? 0), 0)

/** Featured stories first, in position order; then the rest, in file order. */
const orderByFeatured = (stories) =>
  stories
    .map((story, index) => ({ story, index }))
    .sort((a, b) => {
      if (a.story.featured !== null && b.story.featured !== null) {
        return a.story.featured - b.story.featured
      }
      if (a.story.featured !== null) {
        return -1
      }
      if (b.story.featured !== null) {
        return 1
      }
      return a.index - b.index
    })
    .map(({ story }) => story)

const storiesOf = (set) => {
  if (set.examplesProblem) {
    return [
      {
        kind: 'broken',
        name: BROKEN_STORY_NAME,
        slug: 'broken',
        message: set.examplesProblem
      }
    ]
  }
  const examples = set.examples ?? []
  const scenarios = set.scenarios ?? []
  const walks = withFallbackFeature(
    examples.length > 0
      ? examples.map(exampleStory)
      : scenarios.map(scenarioStory)
  )
  const errors = errorStory(examples, scenarios, highestFeaturedOf(walks))
  return orderByFeatured(uniqueNames(errors ? [...walks, errors] : walks))
}

const isWalkable = (set) =>
  set.id !== PLACEHOLDER_SET && set.hasHappyPath === true

const realJourneyFirst = (a, b) => {
  if (a.id === REAL_JOURNEY_SET) {
    return -1
  }
  if (b.id === REAL_JOURNEY_SET) {
    return 1
  }
  return a.id.localeCompare(b.id)
}

/**
 * The walkthrough plan.
 *
 * @param {object} input
 * @param {object[]} input.sets - `[{ id, release, hasHappyPath, examples,
 *   examplesProblem, scenarios }]`, from `readSets`.
 * @param {string[]|null} [input.only] - walk only these set ids.
 * @returns {{ setId: string, title: string, stories: object[] }[]} the real
 *   journey first, then every release in order of id.
 */
export const planWalkthroughs = ({ sets, only = null }) =>
  sets
    .filter(isWalkable)
    .filter((set) => !only || only.includes(set.id))
    .toSorted(realJourneyFirst)
    .map((set) => ({
      setId: set.id,
      title: setTitle(set.id, set.release),
      stories: storiesOf(set)
    }))

/**
 * The names in `only` that are not a set the walkthrough can walk.
 *
 * @param {object[]} sets - from `readSets`.
 * @param {string[]|null} only
 * @returns {string[]}
 */
export const unknownSets = (sets, only) => {
  const walkable = new Set(sets.filter(isWalkable).map((set) => set.id))
  return (only ?? []).filter((id) => !walkable.has(id))
}

const useCaseOf = (pool, fixture) => {
  if (!fixture) {
    return null
  }
  const [file, name] = fixture.split('/')
  const found = findFixture(pool, { file, name })
  return found.fixture?.useCase ?? null
}

const examplesOf = (setId) => {
  try {
    const examples = loadExamples(setId)
    const pool = examples.length > 0 ? loadFixturePool(setId) : {}
    return {
      examples: examples.map((example) => ({
        ...example,
        useCase: useCaseOf(pool, example.fixture)
      }))
    }
  } catch (error) {
    return { examples: [], examplesProblem: error.message }
  }
}

/**
 * Every set in this checkout, with what the plan needs to know about it.
 *
 * @param {{ root?: string }} [options]
 * @returns {object[]} `[{ id, release, hasHappyPath, examples,
 *   examplesProblem, scenarios }]`.
 */
export const readSets = ({ root = REPO_ROOT } = {}) =>
  listSets({ root }).map((id) => {
    const folder = setDir(id, { root })
    return {
      id,
      release: releaseInfo(id, { root }),
      hasHappyPath: existsSync(fixtureFileOf(folder)),
      scenarios: readScenarios(folder),
      ...examplesOf(id)
    }
  })
