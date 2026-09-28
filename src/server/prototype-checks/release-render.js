import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { createSeedClient } from '../prototype-seed/http-client.js'
import { resolveFields } from '../prototype-seed/resolve-fields.js'
import { setFolderOf } from './sets-on-disk.js'

/**
 * Boots every mounted set's pages in process, the way a browser would reach
 * them: start a notification through the set's own routes, walk its example
 * journey (`flow/fixtures/happy-path.json`), then open every page `flow.js`
 * lists. Each page must answer 200, or redirect somewhere inside the same
 * set. It must never show the shared error page.
 *
 * This is what catches a half-registered page: listed in `flow.js` but with
 * no route (404), or with a route whose template or controller breaks (500).
 */

const HTTP_OK = 200
const HTTP_NOT_FOUND = 404
const HTTP_MOVED_PERMANENTLY = 301
const HTTP_FOUND = 302
const HTTP_SEE_OTHER = 303
const HTTP_TEMPORARY_REDIRECT = 307
const HTTP_PERMANENT_REDIRECT = 308
const REDIRECT_CODES = new Set([
  HTTP_MOVED_PERMANENTLY,
  HTTP_FOUND,
  HTTP_SEE_OTHER,
  HTTP_TEMPORARY_REDIRECT,
  HTTP_PERMANENT_REDIRECT
])
const ERROR_TEMPLATE = 'shared/error'
const JOURNEY_FOLDER = 'journeys/linear'
const HAPPY_PATH_FILE = `${JOURNEY_FOLDER}/flow/fixtures/happy-path.json`

/**
 * Who the check signs in as. Its own identity, so the prototype's example
 * data (`prototype-seed`) treats it as an ordinary visitor.
 */
const CHECK_AUTHOR_ID = 'release-render-check'
const CHECK_AUTHOR = Object.freeze({
  contactId: CHECK_AUTHOR_ID,
  name: 'Release render check',
  organisationId: CHECK_AUTHOR_ID,
  currentRelationshipId: CHECK_AUTHOR_ID
})

/** Every page `flow.js` lists, in order, as `{ sectionId, id, slug }`. */
export const flowPagesOf = (sections) =>
  sections.flatMap((section) =>
    section.pages.map((page) => ({
      sectionId: section.id,
      id: page.id,
      slug: page.slug
    }))
  )

/** A page's address. The dashboard's slug is empty: it lives at the base. */
export const pageUrl = (setBase, journeyId, slug) =>
  slug ? `${setBase}/notifications/${journeyId}/${slug}` : setBase

const isInsideSet = (location, setBase) =>
  typeof location === 'string' &&
  (location === setBase ||
    location.startsWith(`${setBase}/`) ||
    location.startsWith(`${setBase}?`))

const templateOf = (response) => response.request?.response?.source?.template

const statusHint = (statusCode) => {
  if (statusCode === HTTP_NOT_FOUND) {
    return 'no route answers it. A page listed in flow.js needs its controller routes added to the features index.'
  }
  return 'the page broke while it was being built. The lines above this one say why.'
}

/**
 * Whether one response is a working page.
 *
 * @param {{statusCode: number, headers: object}} response - an injected response.
 * @param {string} setBase - the set's mount, for example `/high-risk-plants`.
 * @param {string} label - how to name the page in the verdict.
 * @returns {string|undefined} a plain sentence saying what is wrong, or
 * undefined when the page is fine.
 */
export const judgeResponse = (response, setBase, label) => {
  const { statusCode } = response
  if (templateOf(response) === ERROR_TEMPLATE) {
    return `${label} showed the error page (${statusCode}): ${statusHint(statusCode)}`
  }
  if (statusCode === HTTP_OK) {
    return undefined
  }
  if (REDIRECT_CODES.has(statusCode)) {
    const { location } = response.headers
    return isInsideSet(location, setBase)
      ? undefined
      : `${label} sent the visitor outside the set, to ${location}`
  }
  return `${label} answered ${statusCode}: ${statusHint(statusCode)}`
}

const importFrom = async (setId, relativePath) =>
  import(pathToFileURL(path.join(setFolderOf(setId), relativePath)).href)

/** The first example journey in the set's happy-path.json, or no steps. */
export const firstExampleOf = (setId) => {
  const file = path.join(setFolderOf(setId), HAPPY_PATH_FILE)
  const first = existsSync(file)
    ? Object.entries(JSON.parse(readFileSync(file, 'utf8')))[0]
    : null
  if (!first) {
    return { name: '', steps: [] }
  }
  const [name, example] = first
  return { name, steps: example.steps ?? [] }
}

const journeyIdFrom = (response, setBase) => {
  const location = response.headers?.location
  const prefix = `${setBase}/notifications/`
  if (typeof location !== 'string' || !location.startsWith(prefix)) {
    return undefined
  }
  return location.slice(prefix.length).split('/')[0]
}

const walkExample = async (client, { setBase, journeyId, example }) => {
  for (const step of example.steps) {
    const response = await client.post(
      pageUrl(setBase, journeyId, step.slug),
      resolveFields(step)
    )
    if (!REDIRECT_CODES.has(response.statusCode)) {
      return `The example '${example.name}' stopped at '${step.slug}' (it answered ${response.statusCode}). If you changed a required question, update ${HAPPY_PATH_FILE}.`
    }
  }
  return undefined
}

const startNotification = async (client, setBase) => {
  const created = await client.post(`${setBase}/notifications`, {})
  if (created.statusCode === HTTP_NOT_FOUND) {
    return { hasJourney: false }
  }
  const journeyId = journeyIdFrom(created, setBase)
  return journeyId
    ? { hasJourney: true, journeyId }
    : {
        hasJourney: true,
        problem: `Starting a new notification answered ${created.statusCode} instead of opening the journey.`
      }
}

const openPages = async (client, { setBase, journeyId, pages }) => {
  const problems = []
  const hub = await client.get(`${setBase}/notifications/${journeyId}`)
  problems.push(judgeResponse(hub, setBase, 'The task list'))
  for (const page of pages) {
    const response = await client.get(pageUrl(setBase, journeyId, page.slug))
    problems.push(
      judgeResponse(response, setBase, `The '${page.slug || page.id}' page`)
    )
  }
  return problems.filter(Boolean)
}

/**
 * Loads what `renderPages` needs for one set from its folder: its mount, its
 * flow sections and its first example journey.
 */
export const loadSetForRender = async (setId) => {
  const { SET_BASE: setBase } = await importFrom(setId, 'set.js')
  const { sections } = await importFrom(setId, `${JOURNEY_FOLDER}/flow/flow.js`)
  return { setId, setBase, sections, example: firstExampleOf(setId) }
}

/**
 * Opens every page of one mounted set on a running (initialised) server.
 *
 * @param {import('@hapi/hapi').Server} server - from `createServer()`.
 * @param {{setId: string, setBase: string, sections: object[], example: {name: string, steps: object[]}}} set
 * - what `loadSetForRender` returns.
 * @returns {Promise<{setId: string, pagesChecked: number, problems: string[]}>}
 */
export const renderPages = async (
  server,
  { setId, setBase, sections, example }
) => {
  const pages = flowPagesOf(sections)
  const client = createSeedClient(server, { credentials: CHECK_AUTHOR })

  const home = await client.get(setBase)
  const homeProblem = judgeResponse(home, setBase, `The ${setId} home page`)
  if (homeProblem) {
    return { setId, pagesChecked: 1, problems: [homeProblem] }
  }

  const started = await startNotification(client, setBase)
  if (!started.hasJourney || started.problem) {
    return {
      setId,
      pagesChecked: 1,
      problems: started.problem ? [started.problem] : []
    }
  }

  const stopped = await walkExample(client, {
    setBase,
    journeyId: started.journeyId,
    example
  })
  const pageProblems = await openPages(client, {
    setBase,
    journeyId: started.journeyId,
    pages
  })
  return {
    setId,
    pagesChecked: pages.length + 1,
    problems: [stopped, ...pageProblems].filter(Boolean)
  }
}

/** Loads one set from its folder and opens every page it lists. */
export const renderSet = async (server, setId) =>
  renderPages(server, await loadSetForRender(setId))
