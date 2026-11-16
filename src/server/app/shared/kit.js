import { dashboardPath, hubPath, pagePath, pageRoutePath } from './paths.js'
import { setIdForPath, withSetContext } from './set-context.js'
import { AMEND, DELETED, DRAFT, SUBMITTED } from '../engine/index.js'
import { nextStepLanding } from '../flow/navigation.js'
import { journeyLayout, journeySectionCaption } from '../flow/journey-flow.js'
import { copyFor } from './copy.js'
import { copy as sharedEn } from './copy.en.js'
import { copy as sharedCy } from './copy.cy.js'
import { isRecoverableBackendError } from '../services/persistence/records/errors.js'
import { pushTrail } from './trail.js'

export {
  carryTrail,
  pushTrail,
  readReturnMarker,
  requestTrail,
  TRAIL_START,
  trailBackLink,
  trailPlus,
  withReturnMarker,
  withTrail
} from './trail.js'

export const routeOptions = { auth: 'session' }

/**
 * The options for a route that renders a page. The page rides on the route as
 * `app.page`, where the phase banner reads its maturity level.
 *
 * @param {{ maturity?: string }} page - the page descriptor from its feature's `page.js`.
 * @returns {{ auth: string, app: { page: object } }} the route options.
 */
export const pageRouteOptions = (page) => ({ ...routeOptions, app: { page } })

/** The shared chrome copy in the request's language. */
export const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

export const SURFACES = Object.freeze({
  form: 'govuk-grid-column-two-thirds',
  display: 'govuk-grid-column-full'
})

export const surfaceClass = (surface) => {
  if (!Object.hasOwn(SURFACES, surface)) {
    throw new Error(
      `Unknown surface '${surface}'. Expected one of: ${Object.keys(SURFACES).join(', ')}`
    )
  }
  return SURFACES[surface]
}

const STRIP_STATUS = {
  [DRAFT]: {
    text: sharedCopy.journeyStrip.draft,
    classes: 'govuk-tag--blue'
  },
  [SUBMITTED]: {
    text: sharedCopy.journeyStrip.submitted,
    classes: 'govuk-tag--green'
  },
  [AMEND]: {
    text: sharedCopy.journeyStrip.amend,
    classes: 'govuk-tag--yellow'
  },
  [DELETED]: {
    text: sharedCopy.journeyStrip.deleted,
    classes: 'govuk-tag--grey'
  }
}

export const CYA_SLUG = 'notification-view'

export const CANCEL_AMEND_SLUG = 'cancel-amend'

const cancelAmendControl = (journey) =>
  journey.status === AMEND
    ? {
        href: pagePath(journey.journeyId, CANCEL_AMEND_SLUG),
        text: sharedCopy.journeyStrip.cancelAmend
      }
    : undefined

/**
 * The status strip shown above a journey page's caption and heading.
 *
 * @param {object} [journey] - the journey, or none.
 * @param {object} [options]
 * @param {boolean} [options.offerCancelAmend] - offer Cancel amend while the
 * journey is being amended. False on the page Cancel amend leads to.
 * @returns {object|null} the strip view model, or null without a journey.
 */
export const journeyStrip = (journey, { offerCancelAmend = true } = {}) =>
  journey
    ? {
        reference: journey.journeyId,
        status: STRIP_STATUS[journey.status],
        cancelAmend: offerCancelAmend ? cancelAmendControl(journey) : undefined
      }
    : null

const anchorHref = (field) => `#${field}`

/**
 * The error summary view model for a set of field errors.
 *
 * @param {object} [fieldErrors] - map of key to message. Empty means no summary.
 * @param {object} [options]
 * @param {(key: string) => string} [options.href] - builds the link for a key.
 * Defaults to the in-page anchor `#key`; pass a builder when the entries link
 * somewhere else, such as another page.
 * @param {boolean} [options.disableAutoFocus] - keep the caret where it is
 * instead of moving it to the summary. Set it on a page that renders the
 * summary without the user having just been refused.
 * @returns {object|null} the summary view model, or null when there are no
 * errors.
 */
export const errorSummary = (
  fieldErrors,
  { href = anchorHref, disableAutoFocus } = {}
) => {
  const entries = Object.entries(fieldErrors ?? {})
  if (entries.length === 0) {
    return null
  }
  return {
    titleText: sharedCopy.errorSummary.title,
    disableAutoFocus,
    errorList: entries.map(([field, text]) => ({ text, href: href(field) }))
  }
}

export const fieldError = (fieldErrors, field) =>
  fieldErrors?.[field] ? { text: fieldErrors[field] } : undefined

export const REFUSAL_LOG_MESSAGE = 'Answer refused, page shown again'
export const SAVE_FALLBACK_LOG_MESSAGE =
  'Save failed on a recoverable backend error, fallback response sent'

/**
 * Logs a refusal once at info. The error codes are the field keys, never the
 * messages.
 *
 * @param {object} request - the request being answered.
 * @param {object} [options] - other keys (the named reason, ids) are logged as given.
 * @param {object} [options.fieldErrors] - map of field key to the message the
 * page shows (may be empty). Only for a refusal that is not the user's own
 * input (a state refusal, a tampered post, another service refusing), never
 * for errors the user can correct on the form.
 */
export const logRefusal = (request, { fieldErrors = {}, ...details } = {}) =>
  request.logger.info(
    {
      ...details,
      journeyId: request.params.journeyId,
      route: request.route?.path,
      errorCodes: Object.keys(fieldErrors)
    },
    REFUSAL_LOG_MESSAGE
  )

export const hubExitTarget = (request) =>
  request.payload?.exit === 'hub' ? hubPath(request.params.journeyId) : null

const nextPagePath = (request, page, scope) => {
  const { journeyId } = request.params
  const landing = nextStepLanding(page.id, scope, journeyId)
  if (!landing) {
    return pagePath(journeyId, CYA_SLUG)
  }
  if (landing.unopened) {
    request.logger.info(
      {
        journeyId,
        route: request.route?.path,
        savedPageId: page.id,
        unopenedPageId: landing.unopened.pageId,
        missingAnswerIds: landing.unopened.missingAnswerIds
      },
      'Save and continue opened the page that asks for a missing earlier answer'
    )
  }
  return landing.path
}

/**
 * Where a valid save on a page goes next.
 *
 * @param {object} request - the request being answered.
 * @param {object} page - the page being saved.
 * @param {object} scope - the journey's scope.
 * @returns {string} the overview's path when Save and return to overview was
 * pressed, else the next page that applies, else the review's path, carrying
 * the request's trail plus the page saved. A next page that needs a required
 * earlier answer that is missing gives the page that asks for it, logged once.
 */
export const nextTarget = (request, page, scope) =>
  hubExitTarget(request) ??
  pushTrail(request, nextPagePath(request, page, scope), page.slug)

export const SERVER_WIDE_LAYOUT = 'shared/layout.njk'

/**
 * The chrome for a page outside every set, such as the sign-in error page.
 *
 * @param {string} title - the page title.
 * @returns {object} the common view model, without anything set-owned.
 */
export const serverWideBase = (title) => ({
  layout: SERVER_WIDE_LAYOUT,
  pageTitle: title,
  homeUrl: '/',
  journeyStrip: null,
  concurrencyToken: null,
  sharedCopy,
  recoverableError: false,
  contentColumnClass: SURFACES.form
})

/**
 * The chrome for a page that may or may not be inside a set, chosen by the
 * set whose mount the request path falls under.
 *
 * @param {string} title - the page title.
 * @param {string} [requestPath] - the path the request asked for.
 * @returns {object} the chrome of the set whose mount the path falls under, or
 * the server-wide chrome where it falls under none.
 */
export const chromeFor = (title, requestPath) => {
  const setId = setIdForPath(requestPath)
  return setId
    ? withSetContext(setId, () => base(title))
    : serverWideBase(title)
}

/**
 * The chrome every journey page shares.
 *
 * @param {string} title - the page title.
 * @param {object} [options]
 * @param {object} [options.page] - the page identity. Supply it and the view
 * gains the `caption` naming the section of the journey the page belongs to;
 * omit it on a page the journey deliberately leaves uncaptioned.
 * @param {boolean} [options.showJourneyStrip] - false leaves the status strip off the page.
 * @returns {object} the common view model.
 */
export const base = (
  title,
  {
    backLink,
    journey,
    journeyId = journey?.journeyId,
    page,
    recoverableError = false,
    offerCancelAmend = true,
    showJourneyStrip = true
  } = {}
) => {
  const hasJourney = journeyId != null
  return {
    layout: journeyLayout(),
    pageTitle: title,
    caption: journeySectionCaption(page?.id),
    backLink,
    homeUrl: dashboardPath(),
    hubHref: hasJourney ? hubPath(journeyId) : undefined,
    journeyStrip: showJourneyStrip
      ? journeyStrip(journey, { offerCancelAmend })
      : null,
    concurrencyToken: journey?.concurrencyToken ?? null,
    sharedCopy,
    recoverableError,
    contentColumnClass: SURFACES.form
  }
}

/**
 * Runs a save and answers a recoverable backend failure with the page's
 * fallback, logging the failure once at warn.
 *
 * @param {object} request - the request being answered.
 * @param {() => Promise<*>} saveThunk - makes the save.
 * @param {() => *} onRecoverableFailure - builds the response for a
 * recoverable backend failure.
 * @param {object} [ids] - ids to log beside the journey id.
 * @returns {Promise<{value: *}|{failure: *}>} the save's value, or the
 * fallback's response as `failure`.
 */
export const recoverableSave = async (
  request,
  saveThunk,
  onRecoverableFailure,
  ids = {}
) => {
  try {
    return { value: await saveThunk() }
  } catch (error) {
    if (error?.code === 'STALE_CONCURRENCY_TOKEN') {
      throw error
    }
    if (isRecoverableBackendError(error)) {
      request.logger.warn(
        {
          ...ids,
          journeyId: request.params.journeyId,
          route: request.route?.path,
          err: error
        },
        SAVE_FALLBACK_LOG_MESSAGE
      )
      return { failure: await onRecoverableFailure() }
    }
    throw error
  }
}

const redirectOnStaleAction = (post) => async (request, h) => {
  try {
    return await post(request, h)
  } catch (error) {
    if (error?.code === 'STALE_CONCURRENCY_TOKEN') {
      request.logger.info(
        {
          journeyId: request.params?.journeyId,
          postedConcurrencyToken: request.payload?.concurrencyToken
        },
        'Save refused: the notification changed since the page was shown'
      )
      const query = request.url.searchParams
      query.set('staleAction', '1')
      return h.redirect(`${request.path}?${query.toString()}`)
    }
    throw error
  }
}

export const pageRoutes = (page, { get, post }) => [
  {
    method: 'GET',
    path: pageRoutePath(page.slug),
    options: pageRouteOptions(page),
    handler: get
  },
  {
    method: 'POST',
    path: pageRoutePath(page.slug),
    options: pageRouteOptions(page),
    handler: redirectOnStaleAction(post)
  }
]

export const readDate = (payload, name) => {
  const raw = String(payload[name] ?? '').trim()
  if (raw === '') {
    return { day: '', month: '', year: '' }
  }
  const match = /^(?<day>\d{1,2})\/(?<month>\d{1,2})\/(?<year>\d{4})$/.exec(raw)
  if (!match) {
    return raw
  }
  const { day, month, year } = match.groups
  return { day, month, year }
}

const dateInputValue = (value) =>
  typeof value === 'string'
    ? value
    : [value?.day, value?.month, value?.year]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join('/')

/**
 * The view model for a date-picker text field. The form group always carries
 * the house date-picker class.
 *
 * @param {string} name
 * @param {object} [options]
 * @param {string} [options.label] - the label text.
 * @param {string} [options.hint] - the hint text. No hint shows when absent.
 * @param {string|{day?: string, month?: string, year?: string}} [options.value]
 * the answer, shown as `d/m/yyyy` text.
 * @param {string} [options.error] - the error message text. No error shows
 * when absent.
 * @param {string} [options.minDate] - the earliest date as `d/m/yyyy` text,
 * never a Date.
 * @param {string} [options.maxDate] - the latest date as `d/m/yyyy` text.
 * @param {string} [options.formGroupClasses] - extra classes for the form
 * group, added after the house date-picker class.
 * @param {string} [options.labelClasses] - classes for the label. The GOV.UK
 * small label unless the page asks for another.
 * @returns {object} the view model for the MoJ date picker macro.
 */
export const dateField = (
  name,
  {
    label,
    hint,
    value = {},
    error,
    minDate,
    maxDate,
    formGroupClasses,
    labelClasses = 'govuk-label--s'
  } = {}
) => {
  return {
    id: name,
    name,
    classes: 'govuk-input--width-10',
    label: { text: label, classes: labelClasses },
    hint: hint ? { text: hint } : undefined,
    errorMessage: error ? { text: error } : undefined,
    value: dateInputValue(value),
    minDate,
    maxDate,
    formGroup: {
      classes: ['app-date-picker', formGroupClasses].filter(Boolean).join(' ')
    }
  }
}
