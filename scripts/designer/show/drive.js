/**
 * Drives one signed-in browser through a set's pages the way a trader does:
 * starts a notification, answers each page on screen from the example's
 * field names, and carries on from the task list through check your answers
 * and the declaration. When a page will not move on, the same answers are
 * sent directly with the page's own cookies and form token (crumb), the way
 * the example data is made, so nothing is ever written straight into the
 * data store.
 *
 * Shared by designer:show (capture.js: the pictures and the video) and the
 * walkthrough report (fit/walkthroughs/). Neither knows any page's wording.
 *
 * A `session` is `{ context, page, baseUrl, setBase }`: a Playwright browser
 * context and page, the prototype's address and the set's own path.
 */
import * as cheerio from 'cheerio'

import { HUB_KEY, baseKeyOf } from './targets.js'
import { journeyIdOfPath, journeyPath, resolveStepFields } from './steps.js'
import {
  fillFields,
  hasPostForm,
  submitAndWait,
  tickEveryCheckbox
} from './walk.js'

const REDIRECTS = new Set([301, 302, 303, 307, 308])

/** An example that could not get as far as it should. */
export class ExampleStopped extends Error {}

/** The path and query of `location`, read against `baseUrl`. */
export const pathOf = (location, baseUrl) => {
  const url = new URL(location, baseUrl)
  return `${url.pathname}${url.search}`
}

/** The path alone of `location`, read against `baseUrl`. */
export const pathnameOf = (location, baseUrl) =>
  new URL(location, baseUrl).pathname

/** The messages in a page's error summary, read from its HTML. */
export const errorSummaryOf = (html) => {
  const $ = cheerio.load(html)
  return $('.govuk-error-summary__list li')
    .map((_, element) => $(element).text().trim())
    .get()
    .filter((text) => text !== '')
}

/** What a page said when it refused an answer, as part of a sentence. */
export const whatThePageSaid = (messages, status) =>
  messages.length > 0
    ? `the page said "${messages.join('; ')}"`
    : `the prototype answered ${status}`

/** Opens `target` in the session's page. */
export const goTo = async (session, target) => {
  await session.page.goto(target)
}

/**
 * Sends `fields` to `formPath` as the signed-in person, with the form token
 * the pages hand out. Returns where the prototype sent the browser next.
 *
 * @param {object} session
 * @param {string} formPath - the form's address, for example
 *   `/plants-working/notifications/<id>/origin`.
 * @param {Record<string, string>} fields
 * @param {{ example: string, page: string }} where - for the message when it
 *   stops.
 * @returns {Promise<string>} the path the prototype redirected to.
 * @throws {ExampleStopped} when the page does not redirect.
 */
export const send = async (session, formPath, fields, where) => {
  const cookies = await session.context.cookies()
  const crumb = cookies.find((cookie) => cookie.name === 'crumb')?.value ?? ''
  const response = await session.page.request.post(
    `${session.baseUrl}${formPath}`,
    { form: { ...fields, crumb }, maxRedirects: 0, failOnStatusCode: false }
  )
  const location = response.headers().location
  if (REDIRECTS.has(response.status()) && location) {
    return pathOf(location, session.baseUrl)
  }
  const said = whatThePageSaid(
    errorSummaryOf(await response.text()),
    response.status()
  )
  throw new ExampleStopped(
    `The example "${where.example}" stopped at ${where.page}: ${said}.`
  )
}

/**
 * Starts a notification by sending the dashboard's start form directly.
 *
 * @returns {Promise<{ journeyId: string, location: string }>}
 * @throws {ExampleStopped} when no notification was started.
 */
export const startNotification = async (session, example) => {
  const location = await send(
    session,
    `${session.setBase}/notifications`,
    {},
    { example, page: 'the start' }
  )
  const journeyId = journeyIdOfPath(
    session.setBase,
    pathnameOf(location, session.baseUrl)
  )
  if (!journeyId) {
    throw new ExampleStopped(
      `The example "${example}" did not start a notification.`
    )
  }
  return { journeyId, location }
}

/**
 * Presses the dashboard's start button on screen. When that does not open a
 * notification, starts one directly and opens it.
 *
 * @returns {Promise<string>} the new notification's id.
 */
export const startOnScreen = async (session, example) => {
  const { page } = session
  const sent = await submitAndWait(page)
  const journeyId =
    sent.outcome === 'moved'
      ? journeyIdOfPath(session.setBase, new URL(page.url()).pathname)
      : null
  if (journeyId) {
    return journeyId
  }
  const started = await startNotification(session, example)
  await goTo(session, started.location)
  return started.journeyId
}

/** Sends one step's answers directly and opens the page that follows. */
export const sendDirectly = async (session, step, journeyId, example) => {
  const target = journeyPath(session.setBase, journeyId, step.slug)
  const location = await send(session, target, resolveStepFields(step), {
    example,
    page: step.slug
  })
  await goTo(session, location)
}

/** Opens the step's page, unless the browser is already on it. */
export const arriveAtStep = async (session, step, journeyId) => {
  const expected = journeyPath(session.setBase, journeyId, step.slug)
  if (new URL(session.page.url()).pathname !== expected) {
    await goTo(session, expected)
  }
}

/** The note written when a page would not move on from the screen. */
export const sentDirectlyNote = (slug, errors) =>
  `The walkthrough could not fill in ${slug} on screen${errors.length ? ` (the page said "${errors.join('; ')}")` : ''}, so it sent those answers directly.`

/**
 * Fills in the page the browser is on with the step's answers and sends it.
 * When the page will not move on, sends the answers directly instead.
 *
 * @param {object} session
 * @param {{ slug: string, fields: object }} step
 * @param {string} journeyId
 * @param {{ example: string, onNote?: (text: string) => void }} options
 * @returns {Promise<{ sentDirectly: boolean, errors: string[] }>}
 */
export const answerStep = async (
  session,
  step,
  journeyId,
  { example, onNote = () => {} }
) => {
  await fillFields(session.page, resolveStepFields(step))
  const sent = await submitAndWait(session.page)
  if (sent.outcome === 'moved') {
    return { sentDirectly: false, errors: [] }
  }
  onNote(sentDirectlyNote(step.slug, sent.errors))
  await sendDirectly(session, step, journeyId, example)
  return { sentDirectly: true, errors: sent.errors }
}

/** Opens the step's page, then answers it (see `answerStep`). */
export const walkStep = async (session, step, journeyId, options) => {
  await arriveAtStep(session, step, journeyId)
  return answerStep(session, step, journeyId, options)
}

/** The note written when a page after the task list will not move on. */
export const stuckAfterHubNote = (key, errors) =>
  `Could not get past ${key}${errors.length ? `: the page said "${errors.join('; ')}"` : ''}.`

/**
 * Carries on through the pages after the task list (check your answers, the
 * declaration, and on), ticking every checkbox on each and sending it. The
 * last page is only opened.
 *
 * @param {object} session
 * @param {string} journeyId
 * @param {object} options
 * @param {string[]} options.after - the page slugs, in order.
 * @param {(key: string, index: number) => Promise<void>} [options.onPage] -
 *   called on each page before it is sent.
 * @param {(text: string) => void} [options.onNote]
 * @returns {Promise<boolean>} whether every page moved on.
 */
export const walkOnFromHub = async (
  session,
  journeyId,
  { after, onPage = async () => {}, onNote = () => {} }
) => {
  const { page, setBase } = session
  for (let index = 0; index < after.length; index += 1) {
    const key = after[index]
    const expected = journeyPath(setBase, journeyId, key)
    if (new URL(page.url()).pathname !== expected) {
      await goTo(session, expected)
    }
    await onPage(key, index)
    if (index < after.length - 1) {
      await tickEveryCheckbox(page)
      const sent = await submitAndWait(page)
      if (sent.outcome !== 'moved') {
        onNote(stuckAfterHubNote(key, sent.errors))
        return false
      }
    }
  }
  return true
}

// The chooser's forms reset a set's data, and an example link lands on a
// page already pictured: sending either empty would change data, not show an
// error.
const NO_ERROR_STATE = /^(?:chooser$|example:)/

/**
 * Whether sending page `key` empty can show an error state: never the task
 * list, the set's landing page, the chooser or an example link.
 */
export const canShowErrors = (key, { landingKey = null } = {}) => {
  const base = baseKeyOf(key)
  return base !== HUB_KEY && base !== landingKey && !NO_ERROR_STATE.test(base)
}

/** What each way of sending a page empty means, in one plain sentence. */
export const ERROR_STATE_NOTES = Object.freeze({
  'no-form': 'This page has no form to send, so it has no error state to show.',
  moved:
    'Sending this page empty moved on to the next page, so it has no error state to show.',
  nothing: 'Sending this page empty showed no error messages.'
})

const settle = (page) =>
  page.waitForLoadState('networkidle').catch(() => undefined)

/**
 * Sends the page's form empty to show its error messages, calls `onErrors`
 * while they are on screen, then goes back to the page as it was.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ onErrors?: (errors: string[]) => Promise<void> }} [options]
 * @returns {Promise<'no-form'|'errors'|'moved'|'nothing'>} what happened.
 */
export const captureErrors = async (
  page,
  { onErrors = async () => {} } = {}
) => {
  if (!(await hasPostForm(page))) {
    return 'no-form'
  }
  const here = page.url()
  const sent = await submitAndWait(page)
  if (sent.outcome === 'errors') {
    await settle(page)
    await onErrors(sent.errors)
  }
  await page.goto(here)
  return sent.outcome
}
