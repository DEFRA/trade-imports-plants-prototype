import process from 'node:process'

import { records } from '../app/engine/persistence/records.js'
import { withSetContext } from '../app/shared/set-context.js'
import { EXAMPLE_DATA_AUTHOR_ID, seedSet } from './seed-set.js'
import { exampleSourceFor, loadExamples } from './examples.js'
import { DELETED } from './grammar.js'
import {
  clearSeeded,
  hasBeenSeeded,
  recordExamples,
  recordSeeded,
  seededExamplesFor
} from './registry.js'

/**
 * The seeder for a set, or none.
 *
 * A set gets examples from `scenarios/<set-id>.js` when that file exists,
 * otherwise the four default examples when it has a happy-path fixture to
 * replay (every design release copied from high-risk-plants does), otherwise
 * none: sample-journey's one page saves nothing, so there is nothing to seed.
 *
 * @param {string} setId
 * @returns {((server: import('@hapi/hapi').Server) => Promise<object[]>)|undefined}
 * a function that makes the set's examples.
 */
export const seederFor = (setId) =>
  exampleSourceFor(setId) ? (server) => seedSet(server, setId) : undefined

export const hasSeeder = (setId) => Boolean(seederFor(setId))

/**
 * Whether a request is one of the seeder's own, driving the set's journey
 * through its real routes to make the examples — as opposed to a real
 * signed-in visitor. `adopt-known-journeys.js` skips these: the seed client is
 * authenticated too, so without this its own requests would trip the same lazy
 * seed check they exist to satisfy, recursively, forever.
 *
 * The seed signs in as the example-data contact, in its own organisation or
 * (for an example made for one organisation) in that organisation.
 *
 * @param {string} _setId - kept so callers name the set they are in.
 * @param {import('@hapi/hapi').Request} request
 * @returns {boolean}
 */
export const isSeedAuthorRequest = (_setId, request) => {
  const credentials = request.auth.credentials
  return (
    credentials?.contactId === EXAMPLE_DATA_AUTHOR_ID ||
    credentials?.organisationId === EXAMPLE_DATA_AUTHOR_ID
  )
}

export {
  organisationIdsFor,
  seededExamplesFor,
  seededIdsFor
} from './registry.js'

/**
 * Seeding is on unless `PROTOTYPE_SEED=false`. The FIT web server sets that,
 * because every FIT spec expects its own dashboard to start empty and runs in
 * parallel with the others.
 */
export const isSeedingEnabled = () => process.env.PROTOTYPE_SEED !== 'false'

/** The examples every session is told about: shared, and still listed. */
const sharedIdsOf = (made) =>
  made
    .filter(
      (example) => example.organisationId === null && example.status !== DELETED
    )
    .map((example) => example.journeyId)

const seedAndRecord = async (server, setId) => {
  const made = await seederFor(setId)(server)
  recordExamples(setId, made)
  recordSeeded(setId, sharedIdsOf(made))
}

/**
 * One in-flight seeding promise per set, keyed by set id. Guards against two
 * concurrent first requests both starting a seed: the first caller starts
 * it, and every other caller for the same set awaits that same promise
 * instead of starting its own.
 */
const inFlightSeeds = new Map()

/**
 * Seeds a set's example notifications the first time a signed-in request
 * reaches it, rather than at server start — see PROTOTYPE.md.
 * `adopt-known-journeys.js` calls this from `onPreHandler`, so seeding
 * finishes before the handler runs and the examples are adopted in the same
 * request that triggered it.
 *
 * Does nothing once the set has been seeded, when the set has no seeder, or
 * when seeding is switched off.
 *
 * @param {import('@hapi/hapi').Server} server
 * @param {string} setId
 */
export const ensureSeeded = async (server, setId) => {
  if (!isSeedingEnabled() || !hasSeeder(setId) || hasBeenSeeded(setId)) {
    return
  }
  if (!inFlightSeeds.has(setId)) {
    inFlightSeeds.set(
      setId,
      seedAndRecord(server, setId).finally(() => inFlightSeeds.delete(setId))
    )
  }
  await inFlightSeeds.get(setId)
}

/**
 * Clears every record in a set and, when the set has a seeder, seeds its
 * examples again — the chooser's "Reset this prototype's data" action.
 *
 * The data is shared, so this resets it for everyone using the prototype.
 *
 * @param {import('@hapi/hapi').Server} server
 * @param {string} setId
 */
export const resetSet = async (server, setId) => {
  await withSetContext(setId, () => records.clear())
  clearSeeded(setId)
  if (isSeedingEnabled() && hasSeeder(setId)) {
    await seedAndRecord(server, setId)
  }
}

/**
 * Every example a set has, in order, for the chooser and
 * `designer:examples -- list`. Once the set has been seeded, each also carries
 * its reference number and the page it stopped on.
 *
 * Synchronous, so the chooser can call it while it renders. A set whose
 * examples are written wrongly lists none here; `designer:examples -- check`
 * and the seed itself report why.
 *
 * @param {string} setId
 * @returns {Array<{ slug: string, label: string, status: string,
 * organisationId: string|null, through: string|null, journeyId?: string,
 * href?: string, stopAt?: string }>} the examples.
 */
export const listExamples = (setId) => {
  let examples
  try {
    examples = loadExamples(setId)
  } catch {
    return []
  }
  const made = new Map(
    seededExamplesFor(setId).map((example) => [example.slug, example])
  )
  return examples.map((example) => ({
    slug: example.slug,
    label: example.label,
    status: example.status,
    organisationId: example.organisationId,
    through: example.through,
    ...(made.has(example.slug) && {
      journeyId: made.get(example.slug).journeyId,
      href: made.get(example.slug).href,
      stopAt: made.get(example.slug).stopAt
    })
  }))
}

/**
 * One example as made — its current reference number and the page it stopped
 * on — found by its stable slug. The stable example link
 * (`/examples/{setId}/{example}`) redirects to `href`.
 *
 * Reads only what has been seeded. Call `ensureSeeded` first (or use
 * `exampleHref`) so a link clicked just after a restart still works.
 *
 * @param {string} setId
 * @param {string} slug
 * @returns {{ slug: string, label: string, status: string,
 * organisationId: string|null, journeyId: string, href: string,
 * stopAt: string }|undefined} the example, or undefined when none by that slug
 * has been made.
 */
export const findExample = (setId, slug) =>
  seededExamplesFor(setId).find((example) => example.slug === slug)

/**
 * Where an example link should take the visitor: seeds the set first when it
 * has not been seeded since the prototype started, then finds the example.
 *
 * @param {import('@hapi/hapi').Server} server
 * @param {string} setId
 * @param {string} slug
 * @returns {Promise<string|undefined>} the path of the page the example
 * stopped on, or undefined when the set has no such example (or seeding is
 * switched off).
 */
export const exampleHref = async (server, setId, slug) => {
  await ensureSeeded(server, setId)
  return findExample(setId, slug)?.href
}
