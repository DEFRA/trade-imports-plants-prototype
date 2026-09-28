/**
 * Takes the pictures. For each set (and each version of it), signs in with
 * the development sign-in, reaches every wanted page by sending the set's
 * example answers through its real routes, then photographs the page, checks
 * it with axe and, when asked, photographs its error state and phone width.
 *
 * Answers are sent with the page's own cookies and form token (crumb), the
 * same way the prototype's example data is made, so nothing is ever written
 * straight into the data store.
 */
import path from 'node:path'

import AxeBuilder from '@axe-core/playwright'
import * as cheerio from 'cheerio'

import {
  AXE_TAGS,
  STATES,
  VARIANTS,
  VIEWPORTS,
  WIDTHS,
  captureFileName,
  summariseAxe
} from './manifest.js'
import { HUB_KEY, baseKeyOf } from './targets.js'
import { journeyIdOfPath, journeyPath, resolveStepFields } from './steps.js'
import {
  fillFields,
  hasPostForm,
  pageHeading,
  submitAndWait,
  tickEveryCheckbox
} from './walk.js'

const REDIRECTS = new Set([301, 302, 303, 307, 308])
const HTTP_NOT_FOUND = 404
const HTTP_ERROR = 400
const VIDEO_SLOW_MO_MS = 600
const VIDEO_SIZE = { width: 1280, height: 720 }
const PAUSE_ON_HUB_MS = 1000
const PAUSE_AT_END_MS = 1500

/** An example that could not get as far as it should. */
export class ExampleStopped extends Error {}

const pathOf = (location, baseUrl) => {
  const url = new URL(location, baseUrl)
  return `${url.pathname}${url.search}`
}

const pathnameOf = (location, baseUrl) => new URL(location, baseUrl).pathname

/** The page's address with the notification's id swapped for a placeholder. */
export const addressPattern = (pathname, setBase) => {
  const id = journeyIdOfPath(setBase, pathname)
  return id
    ? pathname.replace(`/notifications/${id}`, '/notifications/<reference>')
    : pathname
}

const errorSummaryOf = (html) => {
  const $ = cheerio.load(html)
  return $('.govuk-error-summary__list li')
    .map((_, element) => $(element).text().trim())
    .get()
    .filter((text) => text !== '')
}

/**
 * Collects every style sheet, script, font or image the page asked for and
 * did not get: a page photographed without its styles looks broken for a
 * reason that has nothing to do with the design.
 */
const watchPageHealth = (page, missing) => {
  page.on('response', (response) => {
    const type = response.request().resourceType()
    if (response.status() >= 400 && type !== 'document' && type !== 'fetch') {
      missing.add(new URL(response.url()).pathname)
    }
  })
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText ?? ''
    // An aborted request follows a refused response (collected above) or a
    // navigation away from the page: neither is a new problem.
    if (!reason.includes('ERR_ABORTED')) {
      missing.add(new URL(request.url()).pathname)
    }
  })
}

/** One plain sentence about the files the pages could not load, or null. */
export const missingFilesNote = (missing) => {
  const paths = [...missing].sort((a, b) => a.localeCompare(b))
  if (paths.length === 0) {
    return null
  }
  const examples = paths.slice(0, 3).join(', ')
  return `The prototype could not give the browser ${paths.length} file(s) the pages asked for (${examples}${paths.length > 3 ? ' and more' : ''}), so the pictures may be missing fonts, styles or scripts. The pages themselves are fine; if it keeps happening, tell the prototype's maintainer.`
}

const openSession = async (browser, { baseUrl, setBase }, missing) => {
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: VIEWPORTS.desktop
  })
  const page = await context.newPage()
  watchPageHealth(page, missing)
  await page.goto('/auth/stub-sign-in')
  const landing = await page.goto(setBase)
  return { context, page, baseUrl, setBase, opened: Boolean(landing?.ok()) }
}

/**
 * Sends `fields` to `formPath` as the signed-in person, with the form token
 * the pages hand out. Returns where the prototype sent the browser next.
 */
const send = async (session, formPath, fields, where) => {
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
  const messages = errorSummaryOf(await response.text())
  const said = messages.length
    ? `the page said "${messages.join('; ')}"`
    : `the prototype answered ${response.status()}`
  throw new ExampleStopped(
    `The example "${where.example}" stopped at ${where.page}: ${said}.`
  )
}

const runAxe = async (page) => {
  try {
    const result = await new AxeBuilder({ page })
      .withTags([...AXE_TAGS])
      .analyze()
    return summariseAxe(result.violations)
  } catch {
    return null
  }
}

/** A notification reference number, as the stub records store mints them. */
export const REFERENCE_PATTERN = /\b(GBN-[A-Z]{2,4}-\d{2}-)[0-9A-Z]{6}\b/g

/**
 * The stand-in for each reference number on a page: the first one in the
 * page becomes `…-EXMP01`, the second `…-EXMP02`, and so on. Every run mints
 * new numbers, so without this the before and after pictures of the same
 * page differ in text the change never touched.
 *
 * @param {string[]} references - distinct reference numbers, in page order.
 * @returns {Record<string, string>} each reference to its stand-in.
 */
export const pinnedReferences = (references) =>
  Object.fromEntries(
    references.map((reference, index) => [
      reference,
      reference.replace(
        new RegExp(REFERENCE_PATTERN.source),
        (_, prefix) => `${prefix}EXMP${String(index + 1).padStart(2, '0')}`
      )
    ])
  )

const textNodesOf = (page, pattern) =>
  page.evaluate((source) => {
    const found = []
    const walker = document.createTreeWalker(
      document.body,
      globalThis.NodeFilter.SHOW_TEXT
    )
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      for (const match of node.nodeValue.matchAll(new RegExp(source, 'g'))) {
        if (!found.includes(match[0])) {
          found.push(match[0])
        }
      }
    }
    return found
  }, pattern.source)

const replaceText = (page, replacements) =>
  page.evaluate((pairs) => {
    const walker = document.createTreeWalker(
      document.body,
      globalThis.NodeFilter.SHOW_TEXT
    )
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      let text = node.nodeValue
      for (const [from, to] of Object.entries(pairs)) {
        text = text.split(from).join(to)
      }
      if (text !== node.nodeValue) {
        node.nodeValue = text
      }
    }
  }, replacements)

/** Shows every reference number on the page as its stand-in (above). */
const pinReferenceNumbers = async (page) => {
  const references = await textNodesOf(page, REFERENCE_PATTERN).catch(() => [])
  if (references.length > 0) {
    await replaceText(page, pinnedReferences(references)).catch(() => undefined)
  }
}

const photograph = async (page, run, shot) => {
  const file = captureFileName({
    key: shot.key,
    variant: run.variant,
    state: shot.state,
    width: shot.width
  })
  await pinReferenceNumbers(page)
  await page.screenshot({ path: path.join(run.outDir, file), fullPage: true })
  return {
    key: shot.key,
    variant: run.variant,
    state: shot.state,
    width: shot.width,
    file
  }
}

const settle = (page) =>
  page.waitForLoadState('networkidle').catch(() => undefined)

// The chooser's forms reset a set's data, and an example link lands on a
// page already pictured: sending either empty would change data, not show an
// error.
const NO_ERROR_STATE = /^(?:chooser$|example:)/

const canShowErrors = (key, run) => {
  const base = baseKeyOf(key)
  return (
    base !== HUB_KEY && base !== run.landingKey && !NO_ERROR_STATE.test(base)
  )
}

const captureErrors = async (page, key, run, result) => {
  if (!(await hasPostForm(page))) {
    if (run.variant === VARIANTS.now) {
      result.notes.push(
        'This page has no form to send, so it has no error state to show.'
      )
    }
    return
  }
  const here = page.url()
  const sent = await submitAndWait(page)
  if (sent.outcome === 'errors') {
    await settle(page)
    result.captures.push(
      await photograph(page, run, {
        key,
        state: STATES.errors,
        width: WIDTHS.desktop
      })
    )
    result.axe[`${run.variant}/${STATES.errors}`] = await runAxe(page)
  } else {
    result.notes.push(
      sent.outcome === 'moved'
        ? 'Sending this page empty moved on to the next page, so it has no error state to show.'
        : 'Sending this page empty showed no error messages.'
    )
  }
  await page.goto(here)
}

const titleFor = async (page, key) => {
  const heading = await pageHeading(page)
  const example = key.includes('@') ? key.split('@')[1] : null
  if (!example) {
    return heading
  }
  return `${heading ?? baseKeyOf(key)} (example: ${example})`
}

/** Photographs the page the browser is on, as page `key`. */
const capturePage = async (session, key, run) => {
  const { page } = session
  await settle(page)
  const result = run.results.get(key) ?? {
    key,
    captures: [],
    axe: {},
    notes: []
  }
  run.results.set(key, result)
  result.title = result.title ?? (await titleFor(page, key))
  result.path =
    result.path ?? addressPattern(new URL(page.url()).pathname, session.setBase)
  result.captures.push(
    await photograph(page, run, {
      key,
      state: STATES.page,
      width: WIDTHS.desktop
    })
  )
  result.axe[`${run.variant}/${STATES.page}`] = await runAxe(page)
  if (run.options.mobile) {
    await page.setViewportSize(VIEWPORTS.mobile)
    await settle(page)
    result.captures.push(
      await photograph(page, run, {
        key,
        state: STATES.page,
        width: WIDTHS.mobile
      })
    )
    await page.setViewportSize(VIEWPORTS.desktop)
  }
  if (run.options.errors && canShowErrors(key, run)) {
    await captureErrors(page, key, run, result)
  }
}

const goTo = async (session, target) => {
  await session.page.goto(target)
}

const startNotification = async (session, example) => {
  const location = await send(
    session,
    `${session.setBase}/notifications`,
    {},
    {
      example,
      page: 'the start'
    }
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

const lastStepToReplay = (scenario, plannedRun) =>
  plannedRun.finish
    ? scenario.steps.length - 1
    : Math.max(...plannedRun.captures.map((capture) => capture.index))

/** Replays one example, photographing the pages the plan wants on the way. */
const replay = async (session, scenario, plannedRun, run) => {
  const { setBase } = session
  let { journeyId, location } = await startNotification(session, scenario.name)
  const captureAt = new Map(
    plannedRun.captures.map((capture) => [
      capture.index,
      capture.as ?? capture.key
    ])
  )
  const last = lastStepToReplay(scenario, plannedRun)
  for (let index = 0; index <= last; index += 1) {
    const step = scenario.steps[index]
    const expected = journeyPath(setBase, journeyId, step.slug)
    if (captureAt.has(index)) {
      const target =
        pathnameOf(location, session.baseUrl) === expected ? location : expected
      await goTo(session, target)
      await capturePage(session, captureAt.get(index), run)
    }
    if (index < last || plannedRun.finish) {
      location = await send(session, expected, resolveStepFields(step), {
        example: scenario.name,
        page: step.slug
      })
    }
  }
  return journeyId
}

/**
 * Carries on from the hub through check your answers, declaration and on.
 * `suffix` (`@warePotatoes`) names the pictures after the example, when
 * every example walks on.
 */
const walkOnFromHub = async (session, journeyId, plan, run, suffix = '') => {
  const { page, setBase } = session
  if (plan.hub) {
    await goTo(session, journeyPath(setBase, journeyId))
    await capturePage(session, `${HUB_KEY}${suffix}`, run)
  }
  for (let index = 0; index < plan.after.length; index += 1) {
    const { key, capture } = plan.after[index]
    const expected = journeyPath(setBase, journeyId, key)
    if (new URL(page.url()).pathname !== expected) {
      await goTo(session, expected)
    }
    if (capture) {
      await capturePage(session, `${key}${suffix}`, run)
    }
    if (index < plan.after.length - 1) {
      await tickEveryCheckbox(page)
      const sent = await submitAndWait(page)
      if (sent.outcome !== 'moved') {
        run.notes.push(
          `Could not get past ${key}${sent.errors.length ? `: the page said "${sent.errors.join('; ')}"` : ''}.`
        )
        return
      }
    }
  }
}

export const NOTIFICATION_PLACEHOLDER = '{notification}'

/**
 * The path an `--url` address means on this set: `/…` is the prototype's own
 * address (the chooser is `/`), `?…` is the set's landing page (the
 * dashboard) with a query, and anything else is under the set. The
 * `{notification}` placeholder becomes the notification the run filled in.
 * Null when it needs a notification and there is none.
 */
export const addressPath = (address, { setBase, journeyId }) => {
  if (address.includes(NOTIFICATION_PLACEHOLDER) && !journeyId) {
    return null
  }
  const filled = address.replaceAll(NOTIFICATION_PLACEHOLDER, journeyId ?? '')
  if (filled.startsWith('/')) {
    return filled
  }
  if (filled === '' || filled.startsWith('?')) {
    return `${setBase}${filled}`
  }
  return `${setBase}/${filled}`
}

/** Photographs each `--url` address (and the chooser and example links). */
const captureAddresses = async (session, addresses, { run, journeyId }) => {
  for (const { key, address } of addresses) {
    const target = addressPath(address, {
      setBase: session.setBase,
      journeyId
    })
    if (!target) {
      run.notes.push(
        `${address}: no example answered every page, so there is no notification to open it in.`
      )
      continue
    }
    const response = await session.page.goto(target)
    const status = response?.status() ?? 0
    if (status === HTTP_NOT_FOUND && run.variant !== VARIANTS.now) {
      run.notes.push(
        run.variant === VARIANTS.before
          ? `${address}: this page did not exist before the change, so there is no before picture.`
          : `${address}: this page does not exist in the set it is compared with, so there is nothing beside it.`
      )
      continue
    }
    if (status >= HTTP_ERROR) {
      run.notes.push(
        `${address} answered ${status}: the picture shows that error page.`
      )
    }
    await capturePage(session, key, run)
  }
}

/**
 * Photographs one set on one running prototype.
 *
 * @param {import('@playwright/test').Browser} browser
 * @param {object} input - `{ baseUrl, setBase, scenarios, plan, variant,
 *   outDir, options, addresses }`; `addresses` is `[{ key, address }]`, the
 *   extra pages from --url, --examples and --pages chooser.
 * @returns {Promise<{ results: Map<string, object>, notes: string[] }>}
 */
export const captureSet = async (browser, input) => {
  const { scenarios, plan } = input
  const run = {
    variant: input.variant,
    outDir: input.outDir,
    options: input.options,
    landingKey: plan.landing?.key ?? null,
    results: new Map(),
    notes: [],
    missingFiles: new Set()
  }
  const session = await openSession(browser, input, run.missingFiles)
  try {
    if (!session.opened) {
      run.notes.push(
        `${input.setBase} did not open on this version of the prototype.`
      )
      return run
    }
    const byName = new Map(
      scenarios.map((scenario) => [scenario.name, scenario])
    )
    const finished = []
    for (const plannedRun of plan.runs) {
      try {
        const journeyId = await replay(
          session,
          byName.get(plannedRun.scenario),
          plannedRun,
          run
        )
        if (plannedRun.finish) {
          finished.push({ journeyId, suffix: plannedRun.suffix ?? '' })
        }
      } catch (error) {
        if (!(error instanceof ExampleStopped)) {
          throw error
        }
        run.notes.push(error.message)
      }
    }
    const walkOn = plan.eachExample ? finished : finished.slice(0, 1)
    for (const { journeyId, suffix } of walkOn) {
      await walkOnFromHub(
        session,
        journeyId,
        plan,
        run,
        plan.eachExample ? suffix : ''
      )
    }
    if (plan.landing?.capture) {
      await goTo(session, input.setBase)
      await capturePage(session, plan.landing.key, run)
    }
    await captureAddresses(session, input.addresses ?? [], {
      run,
      journeyId: finished[0]?.journeyId ?? null
    })
    return run
  } finally {
    await session.context.close()
  }
}

const sendDirectly = async (session, step, journeyId, example) => {
  const target = journeyPath(session.setBase, journeyId, step.slug)
  const location = await send(session, target, resolveStepFields(step), {
    example,
    page: step.slug
  })
  await goTo(session, location)
}

const walkStep = async (session, step, journeyId, notes, example) => {
  const { page } = session
  const expected = journeyPath(session.setBase, journeyId, step.slug)
  if (new URL(page.url()).pathname !== expected) {
    await goTo(session, expected)
  }
  await fillFields(page, resolveStepFields(step))
  const sent = await submitAndWait(page)
  if (sent.outcome !== 'moved') {
    notes.push(
      `The walkthrough could not fill in ${step.slug} on screen${sent.errors.length ? ` (the page said "${sent.errors.join('; ')}")` : ''}, so it sent those answers directly.`
    )
    await sendDirectly(session, step, journeyId, example)
  }
}

const startOnScreen = async (session, example) => {
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

/**
 * Records the first example's whole journey, slowed down, into `walk.webm`
 * in `outDir`. Launches its own slowed-down browser.
 *
 * @returns {Promise<{ file: string|null, notes: string[] }>}
 */
export const recordWalkthrough = async (browserType, input) => {
  const { scenarios, plan, outDir } = input
  const notes = []
  const scenario = scenarios[0]
  if (!scenario) {
    return {
      file: null,
      notes: ['There is no example journey in this set to record.']
    }
  }
  const browser = await browserType.launch({ slowMo: VIDEO_SLOW_MO_MS })
  try {
    const context = await browser.newContext({
      baseURL: input.baseUrl,
      viewport: VIDEO_SIZE,
      recordVideo: { dir: path.join(outDir, '.video'), size: VIDEO_SIZE }
    })
    const page = await context.newPage()
    const session = {
      context,
      page,
      baseUrl: input.baseUrl,
      setBase: input.setBase
    }
    await page.goto('/auth/stub-sign-in')
    await page.goto(input.setBase)
    try {
      const journeyId = await startOnScreen(session, scenario.name)
      for (const step of scenario.steps) {
        await walkStep(session, step, journeyId, notes, scenario.name)
      }
      await page.waitForTimeout(PAUSE_ON_HUB_MS)
      await walkOnFromHub(
        session,
        journeyId,
        {
          hub: false,
          after: plan.after.map((item) => ({ ...item, capture: false }))
        },
        { notes }
      )
      await page.waitForTimeout(PAUSE_AT_END_MS)
    } catch (error) {
      if (!(error instanceof ExampleStopped)) {
        throw error
      }
      notes.push(error.message)
    }
    const video = page.video()
    await context.close()
    const file = 'walk.webm'
    await video.saveAs(path.join(outDir, file))
    await video.delete()
    return { file, notes }
  } finally {
    await browser.close()
  }
}
