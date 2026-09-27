import { currentSetBase, withSetContext } from '../app/shared/set-context.js'
import { createSeedClient } from './http-client.js'
import { resolveFields } from './resolve-fields.js'
import { whatThePageSaid } from './error-summary.js'
import { loadExamples } from './examples.js'

/**
 * Makes a set's example notifications by replaying its real pages, one
 * example at a time: start a notification, post each page's answers, then
 * (when the example asks) check answers and send, amend, cancel the amendment
 * or delete — the same routes and buttons a trader uses. Nothing is written to
 * the store directly, so an example can never be a record the journey itself
 * would refuse.
 */

/**
 * Who the examples are made by. The journey records its actor on every write
 * and reads the signed-in organisation on the dashboard, so the seed needs an
 * identity of its own. `adopt-known-journeys.js` recognises this id (as the
 * contact, or as the organisation) and never treats the seed's own requests as
 * a visitor's.
 */
export const EXAMPLE_DATA_AUTHOR_ID = 'prototype-example-data'

/**
 * The seed's identity for one organisation. Shared examples (no
 * `organisationId`) are made in the seed's own organisation; an example for a
 * named organisation is made signed in to that organisation.
 *
 * @param {string|null} organisationId
 * @returns {object} session credentials.
 */
export const exampleAuthorFor = (organisationId) => {
  const organisation = organisationId ?? EXAMPLE_DATA_AUTHOR_ID
  return Object.freeze({
    contactId: EXAMPLE_DATA_AUTHOR_ID,
    name: 'Example data',
    organisationId: organisation,
    currentRelationshipId: organisation
  })
}

const HTTP_STATUS_FOUND = 302
const HTTP_STATUS_OK = 200
const CHECK_ANSWERS_SLUG = 'notification-view'
const DECLARATION_SLUG = 'declaration'
const CONFIRMATION_SLUG = 'confirmation'
// Where a refusal to start a new notification is reported: there is no page yet.
const START = 'start'

/** An example the real pages would not let through. */
export class ExampleStoppedError extends Error {
  constructor(example, slug, said) {
    super(
      `Example '${example.label}' stopped at ${slug}: the page said '${said}'`
    )
    this.name = 'ExampleStoppedError'
    this.slug = slug
    this.said = said
  }
}

const journeyIdFrom = (base, location) => {
  const prefix = `${base}/notifications/`
  if (typeof location !== 'string' || !location.startsWith(prefix)) {
    return undefined
  }
  return location.slice(prefix.length).split('/')[0]
}

/**
 * One example's walk through the real routes of one set.
 */
const exampleRun = (client, base, example) => {
  let journeyId
  const pageUrl = (slug) => `${base}/notifications/${journeyId}/${slug}`

  const redirected = async (response, slug) => {
    if (response.statusCode === HTTP_STATUS_FOUND) {
      return response.headers.location
    }
    throw new ExampleStoppedError(example, slug, whatThePageSaid(response))
  }

  const post = async (slug, fields) =>
    redirected(await client.post(pageUrl(slug), fields), slug)

  /** Explains a redirect to the wrong place by reading the page it went to. */
  const refusedAt = async (slug, location) => {
    const page = await client.get(location)
    const said =
      page.statusCode === HTTP_STATUS_OK
        ? whatThePageSaid(page)
        : `nothing, it sent the notification to ${location}`
    return new ExampleStoppedError(example, slug, said)
  }

  const start = async () => {
    const location = await redirected(
      await client.post(`${base}/notifications`, {}),
      START
    )
    journeyId = journeyIdFrom(base, location)
    if (!journeyId) {
      throw new ExampleStoppedError(
        example,
        START,
        `nothing, it sent it to ${location}`
      )
    }
    return location
  }

  const stopOn = async (slug) => {
    const path = pageUrl(slug)
    const page = await client.get(path)
    if (page.statusCode !== HTTP_STATUS_OK) {
      throw await refusedAt(slug, page.headers.location ?? path)
    }
    return path
  }

  const submit = async () => {
    await post(CHECK_ANSWERS_SLUG, {})
    const location = await post(DECLARATION_SLUG, { declaration: 'confirmed' })
    if (!location.endsWith(`/${CONFIRMATION_SLUG}`)) {
      throw await refusedAt(CHECK_ANSWERS_SLUG, location)
    }
    return location
  }

  const run = async () => {
    let location = await start()
    for (const step of example.steps) {
      location = await post(step.slug, resolveFields(step))
    }
    if (example.through) {
      location = await stopOn(example.through)
    }
    if (example.submit) {
      location = await submit()
    }
    if (example.amend) {
      location = await post('amend', {})
    }
    if (example.cancelAmend) {
      location = await post('cancel-amend', {})
    }
    if (example.delete) {
      location = await post('delete', {})
    }
    return {
      slug: example.slug,
      label: example.label,
      status: example.status,
      organisationId: example.organisationId,
      journeyId,
      href: location,
      stopAt: pageNameOf(location)
    }
  }

  /** The page slug a path points at, or 'dashboard' for the set's own home. */
  const pageNameOf = (href) => {
    const [path] = href.split('?')
    const journeyPrefix = `${base}/notifications/${journeyId}/`
    if (path.startsWith(journeyPrefix)) {
      return path.slice(journeyPrefix.length)
    }
    return path === base ? 'dashboard' : path
  }

  return { run }
}

const setBaseOf = (setId) => withSetContext(setId, currentSetBase)

/**
 * A signed-in seed client per organisation, each having fetched the set's
 * dashboard once for the CSRF crumb every post carries.
 */
const clientsFor = (server, base) => {
  const clients = new Map()
  return async (organisationId) => {
    const key = organisationId ?? ''
    if (!clients.has(key)) {
      const client = createSeedClient(server, {
        credentials: exampleAuthorFor(organisationId)
      })
      await client.get(base)
      clients.set(key, client)
    }
    return clients.get(key)
  }
}

/**
 * Makes one example.
 *
 * @param {import('@hapi/hapi').Server} server
 * @param {string} setId
 * @param {object} example - a checked example, from `loadExamples`.
 * @param {Function} [clientFor] - reuses sign-ins across examples.
 * @returns {Promise<object>} the example as made: `{ slug, label, status,
 * organisationId, journeyId, href, stopAt }`, where `href` is the page it stopped on and `stopAt` that page's slug.
 * @throws {ExampleStoppedError} when a page refuses the example.
 */
export const seedExample = async (
  server,
  setId,
  example,
  clientFor = clientsFor(server, setBaseOf(setId))
) => {
  const base = setBaseOf(setId)
  const client = await clientFor(example.organisationId)
  return exampleRun(client, base, example).run()
}

/**
 * Makes every example a set has, in order, and stops at the first one a page
 * refuses.
 *
 * @param {import('@hapi/hapi').Server} server
 * @param {string} setId
 * @param {object[]} [examples] - checked examples; the set's own by default.
 * @returns {Promise<object[]>} each example as made.
 */
export const seedSet = async (server, setId, examples) => {
  const toMake = examples ?? loadExamples(setId)
  const clientFor = clientsFor(server, setBaseOf(setId))
  const made = []
  for (const example of toMake) {
    made.push(await seedExample(server, setId, example, clientFor))
  }
  return made
}

/**
 * Tries every example a set has and reports each one, carrying on past a
 * refusal so one run shows every example that needs fixing.
 *
 * @param {import('@hapi/hapi').Server} server
 * @param {string} setId
 * @param {object[]} [examples] - checked examples; the set's own by default.
 * @returns {Promise<Array<{ example: object, made?: object, stopped?: string }>>}
 * one entry per example: what was made, or why it stopped.
 */
export const checkExamples = async (server, setId, examples) => {
  const toTry = examples ?? loadExamples(setId)
  const clientFor = clientsFor(server, setBaseOf(setId))
  const results = []
  for (const example of toTry) {
    try {
      results.push({
        example,
        made: await seedExample(server, setId, example, clientFor)
      })
    } catch (error) {
      if (!(error instanceof ExampleStoppedError)) {
        throw error
      }
      results.push({ example, stopped: error.message })
    }
  }
  return results
}
