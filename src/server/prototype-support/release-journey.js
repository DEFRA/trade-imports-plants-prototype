import { isStubMode } from '../common/services/mode.js'
import { evaluateAnswers } from '../app/bridge/evaluation.js'
import { makeScopeFromEvaluation } from '../app/bridge/scope.js'
import { get as engineGet, memoRequestView } from '../app/engine/read.js'
import { pageGatePasses } from '../app/flow/gates.js'
import { journeySections } from '../app/flow/journey-flow.js'
import { CYA_SLUG, hubExitTarget } from '../app/shared/kit.js'
import { hubPath, pagePath } from '../app/shared/paths.js'

export const RUN_ACTIVE = 'active'
export const RUN_COMPLETE = 'complete'

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const stubRuns = (cookieName) => ({
  read: (request) => request?.state?.[cookieName],
  write: (h, value) => h.state(cookieName, value)
})

const sessionRuns = (cookieName) => ({
  read: (request) => request?.yar?.get(cookieName),
  write: (h, value) => h.request.yar.set(cookieName, value)
})

/**
 * The opening run's phase for each journey, kept in the release's own
 * `openingRun` session cookie: a native cookie in stub mode, a key in the yar
 * session otherwise.
 *
 * @param {string} cookieName - the release's `SESSION_COOKIE_NAMES.openingRun`.
 * @returns {object} `beginOpeningRun`, `completeOpeningRun`, `inOpeningRun`
 * and `openingRunStarted`.
 */
export const openingRun = (cookieName) => {
  const runs = isStubMode() ? stubRuns(cookieName) : sessionRuns(cookieName)
  const byJourney = (request) => {
    const stored = runs.read(request)
    return isObject(stored) ? stored : {}
  }
  const phaseOf = (request, journeyId) => byJourney(request)[journeyId]
  const setPhase = (request, h, journeyId, phase) =>
    runs.write(h, { ...byJourney(request), [journeyId]: phase })

  return {
    beginOpeningRun: async (request, h, journeyId) =>
      setPhase(request, h, journeyId, RUN_ACTIVE),
    completeOpeningRun: async (request, h, journeyId) => {
      if (phaseOf(request, journeyId) === RUN_ACTIVE) {
        setPhase(request, h, journeyId, RUN_COMPLETE)
      }
    },
    inOpeningRun: async (request, journeyId) =>
      phaseOf(request, journeyId) === RUN_ACTIVE,
    openingRunStarted: async (request, journeyId) =>
      phaseOf(request, journeyId) !== undefined
  }
}

/**
 * Whether the trader came from Check your answers.
 *
 * @param {object} request - the Hapi request.
 * @returns {boolean} true when the request carries `?change=1`.
 */
export const changeContext = (request) => Boolean(request.query.change)

/**
 * The href, carrying the change context when the request has one.
 *
 * @param {object} request - the Hapi request.
 * @param {string} href - a href with no query of its own.
 * @returns {string} the href, with `?change=1` in a change context.
 */
export const withChangeContext = (request, href) =>
  changeContext(request) ? `${href}?change=1` : href

const sectionOfPage = (pageId) =>
  journeySections().find((section) =>
    section.pages.some((page) => page.id === pageId)
  )

/**
 * The next page in the page's own section that applies.
 *
 * @param {string} pageId - the page saved.
 * @param {object} scope - the journey's scope.
 * @param {string} journeyId - the journey being worked on.
 * @returns {string} that page's path, else the overview's.
 */
export const nextInSection = (pageId, scope, journeyId) => {
  const section = sectionOfPage(pageId)
  if (!section) {
    return hubPath(journeyId)
  }
  const index = section.pages.findIndex((page) => page.id === pageId)
  const next = section.pages
    .slice(index + 1)
    .find((page) => pageGatePasses(page, scope))
  return next ? pagePath(journeyId, next.slug) : hubPath(journeyId)
}

/**
 * Where a valid save goes next in a release.
 *
 * @param {object} options
 * @param {Function} options.inOpeningRun - the release's opening run check.
 * @param {Function} options.nextRunTarget - the release's run steps, from
 * `flow/run.js`.
 * @returns {Function} `(request, page, scope) => Promise<string>`: the overview
 * for Save and return to overview, Check your answers in a change context, the
 * next run step during the opening run, else the next page in the section, else
 * the overview.
 */
export const releaseNextTarget =
  ({ inOpeningRun, nextRunTarget }) =>
  async (request, page, scope) => {
    const { journeyId } = request.params
    const hubExit = hubExitTarget(request)
    if (hubExit) {
      return hubExit
    }
    if (changeContext(request)) {
      return pagePath(journeyId, CYA_SLUG)
    }
    const runStep = (await inOpeningRun(request, journeyId))
      ? nextRunTarget(page.id, scope, journeyId)
      : null
    return runStep ?? nextInSection(page.id, scope, journeyId)
  }

/**
 * The engine's `get`, with the release's sanitiser run over the answers.
 *
 * The view keeps what was saved as `storedAnswers`, so a page can tell
 * "answered, then deleted" from "never answered". The sanitised view is the
 * request's memo, so a commit in the same request builds on it.
 *
 * @param {Function} sanitise - `(request, answers) => Promise<object>`,
 * returning the same object when nothing changed.
 * @returns {Function} `(request, h) => Promise<object>`, the request view.
 */
export const sanitisedGet = (sanitise) => async (request, h) => {
  const view = await engineGet(request, h)
  if (view.storedAnswers) {
    return view
  }
  const storedAnswers = view.answers
  const answers = await sanitise(request, storedAnswers)
  if (answers === storedAnswers) {
    const unchanged = { ...view, storedAnswers }
    memoRequestView(request, unchanged)
    return unchanged
  }
  const evaluation = evaluateAnswers(answers)
  const sanitised = {
    ...view,
    evaluation,
    answers,
    storedAnswers,
    scope: makeScopeFromEvaluation(evaluation, answers)
  }
  memoRequestView(request, sanitised)
  return sanitised
}
