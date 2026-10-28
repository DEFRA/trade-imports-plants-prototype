import {
  dashboardPath,
  pagePath,
  setBase
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import { startJourney } from '../../../../../../engine/journey.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../lib/http-status.js'
import {
  compose,
  requiredOneOf,
  validate
} from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { beginOpeningRun } from '../../../../../../flow/run-state.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as routing from '../../../../services/commodity-routing/index.js'
import { LINES } from '../commodities/fields.js'
import { commoditiesPage } from '../commodities/page.js'
import { copy as commoditiesEn } from '../commodities/copy/copy.en.js'
import { copy as commoditiesCy } from '../commodities/copy/copy.cy.js'
import { copy as commodityTypeEn } from '../commodity-type/copy/copy.en.js'
import { copy as commodityTypeCy } from '../commodity-type/copy/copy.cy.js'
import { placeholderPath } from '../placeholder-notification/links.js'
import {
  COMMODITY,
  SECTOR,
  conversation,
  entriesUpTo,
  findPath,
  findRoutePath,
  textOf
} from './conversation.js'
import { findPage as page } from './page.js'
import { answerText, carriedRows, toldRows } from './told.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

/**
 * Finds the right notification from as few answers as possible.
 *
 * One address asks every question. The answers travel in the query string, so
 * each step is a link a designer can open, share or go back to, and nothing
 * is stored until the trader starts a notification. The set-owned
 * commodity-routing service decides what to ask next and where the answers
 * lead; this controller only turns that into a page.
 *
 * The page sits outside any notification: it exports no `meta`, is never
 * gated and is never a task row, like the dashboard.
 */
const questionView = `${TEMPLATES}/features/find/question`
const resultView = `${TEMPLATES}/features/find/result`

const copy = copyFor({ en, cy })
const commoditiesCopy = copyFor({ en: commoditiesEn, cy: commoditiesCy })
const commodityTypeCopy = copyFor({ en: commodityTypeEn, cy: commodityTypeCy })

const ANSWERED = 'answered'
const SECTOR_PREFIX = 'about:'
const MIN_SEARCH_LENGTH = 2

const startRoutePath = () => `/${page.slug}/start`
const startPath = () => `${setBase()}${startRoutePath()}`

// Back undoes the last answer: the question before this one, the commodity
// question, the unfiltered commodity list, then the dashboard.
const backLinkFor = (talk) => {
  const last = talk.asked.at(-1)
  if (last) {
    return findPath(entriesUpTo(talk, last))
  }
  if (talk.commodity) {
    return findPath(entriesUpTo(talk, COMMODITY))
  }
  return talk.sector ? findPath() : dashboardPath()
}

const commodityItems = (sector) => [
  { value: '', text: copy.questions.commodity.placeholder },
  ...(sector
    ? []
    : routing.sectors().map((value) => ({
        value: `${SECTOR_PREFIX}${value}`,
        text: copy.questions.commodity.sectorLabels[value]
      }))),
  ...routing.commoditiesIn(sector).map(({ code, name }) => ({
    value: code,
    text: copy.questions.commodity.option(name, code)
  }))
]

const commodityQuestion = (talk) => {
  const words = copy.questions.commodity
  return {
    name: COMMODITY,
    widget: 'autocomplete',
    title: talk.sector ? words.titleBySector[talk.sector] : words.title,
    hint: talk.sector ? words.hintBySector : words.hint,
    items: commodityItems(talk.sector),
    noResults: words.noResults,
    showAllValues: Boolean(talk.sector),
    minLength: talk.sector ? 0 : MIN_SEARCH_LENGTH,
    error: words.error
  }
}

const originQuestion = (talk) => {
  const words = copy.questions.origin
  return {
    name: routing.ORIGIN,
    widget: 'autocomplete',
    title: words.title,
    hint: words.hint,
    items: [
      { value: '', text: words.placeholder },
      ...talk.places.map(({ value, text }) => ({ value, text }))
    ],
    noResults: words.noResults,
    showAllValues: false,
    minLength: MIN_SEARCH_LENGTH,
    error: words.error
  }
}

const radiosQuestion = (name, words, options) => ({
  name,
  widget: 'radios',
  title: words.title,
  hint: words.hint,
  items: options,
  error: words.error
})

// A type-ahead rather than radios: the list is long, and the trader usually
// knows the name they are looking for.
const genusQuestion = (talk) => {
  const words = copy.questions.genus
  return {
    name: routing.GENUS,
    widget: 'autocomplete',
    title: words.title,
    hint: words.hint,
    items: [
      { value: '', text: words.placeholder },
      ...routing.genusOptionsFor(talk.commodity).map((value) => ({
        value,
        text: answerText(routing.GENUS, value)
      }))
    ],
    noResults: words.noResults,
    showAllValues: true,
    minLength: 0,
    error: words.error
  }
}

const barkQuestion = () =>
  radiosQuestion(
    routing.BARK,
    copy.questions.bark,
    routing.barkOptions().map((value) => ({
      value,
      text: answerText(routing.BARK, value)
    }))
  )

const QUESTION_BUILDERS = {
  [COMMODITY]: commodityQuestion,
  [routing.ORIGIN]: originQuestion,
  [routing.GENUS]: genusQuestion,
  [routing.BARK]: barkQuestion
}

const hiddenFields = (entries) =>
  entries.map(([name, value]) => ({ name, value }))

const renderQuestion = (request, h, talk) => {
  const question = QUESTION_BUILDERS[talk.ask](talk)
  const submittedEmpty = request.query[ANSWERED] === talk.ask
  const errors = submittedEmpty ? { [question.name]: question.error } : {}
  const response = h.view(questionView, {
    ...kit.base(question.title, { backLink: backLinkFor(talk), page }),
    caption: copy.caption,
    copy,
    question,
    errors,
    errorSummary: kit.errorSummary(errors),
    action: findPath(),
    hidden: hiddenFields([...entriesUpTo(talk), [ANSWERED, talk.ask]]),
    toldRows: toldRows(talk)
  })
  return submittedEmpty ? response.code(HTTP_STATUS_BAD_REQUEST) : response
}

const prefillRow = (key, text) => ({ key: { text: key }, value: { text } })

// What the notification will already hold, in the order its own pages ask.
const prefillRows = (talk) => {
  const { commodityType, line } = routing.notificationAnswersFor(
    talk.commodity,
    talk.answers
  )
  const words = copy.result.prefill
  return [
    prefillRow(
      words.commodityType,
      commodityTypeCopy.typeLabels[commodityType]
    ),
    prefillRow(words.category, commoditiesCopy.categoryLabels[line.category]),
    ...(line.genus
      ? [prefillRow(words.genus, commoditiesCopy.genusLabels[line.genus])]
      : []),
    ...(line.commodityCode
      ? [prefillRow(words.commodityCode, line.commodityCode)]
      : []),
    prefillRow(words.countryOfOrigin, talk.answers.origin.text)
  ]
}

const renderResult = (h, talk) => {
  const destination = copy.destinations[talk.destination]
  const canStart = talk.destination === routing.PLANTS_NOTIFICATION
  const isPlaceholder = routing
    .placeholderNotifications()
    .includes(talk.destination)
  return h.view(resultView, {
    ...kit.base(destination.title, { backLink: backLinkFor(talk), page }),
    caption: copy.caption,
    copy,
    destination,
    canStart,
    isPlaceholder,
    placeholderHref: isPlaceholder
      ? placeholderPath(talk.destination, entriesUpTo(talk))
      : undefined,
    startAction: startPath(),
    hidden: hiddenFields(entriesUpTo(talk)),
    toldRows: toldRows(talk),
    prefillRows: canStart ? prefillRows(talk) : carriedRows(talk),
    startAgainHref: findPath()
  })
}

const get = async (request, h) => {
  const chosen = textOf(request.query[COMMODITY])
  if (chosen.startsWith(SECTOR_PREFIX)) {
    return h.redirect(findPath([[SECTOR, chosen.slice(SECTOR_PREFIX.length)]]))
  }
  const talk = await conversation(request.query)
  return talk.ask ? renderQuestion(request, h, talk) : renderResult(h, talk)
}

/**
 * Start the high-risk plants notification with the routing answers in it.
 *
 * The answers are replayed from the payload rather than trusted, so a
 * notification is only started when they really lead to this one.
 */
const startPost = async (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(
    compose(
      requiredOneOf(
        COMMODITY,
        routing.commoditiesIn().map(({ code }) => code),
        copy.questions.commodity.error
      )
    ),
    payload
  )
  const talk = await conversation(payload)
  if (errors || talk.destination !== routing.PLANTS_NOTIFICATION) {
    return h.redirect(findPath(entriesUpTo(talk)))
  }
  const { commodityType, line, countryOfOrigin } =
    routing.notificationAnswersFor(talk.commodity, talk.answers)
  const journey = await startJourney(request, h)
  await beginOpeningRun(request, h, journey.journeyId)
  await state.commit(request, h, { commodityType })
  // A line is created carrying its category alone, as the commodity page
  // creates one: the model scopes the line's other fields against it.
  const index = await state.appendEntryAt(request, h, [LINES], {
    category: line.category
  })
  if (index !== null && Object.keys(line).length > 1) {
    await state.updateEntryAt(request, h, [LINES], index, line)
  }
  await state.commit(request, h, { countryOfOrigin })
  return h.redirect(pagePath(journey.journeyId, commoditiesPage.slug))
}

export const routes = [
  {
    method: 'GET',
    path: findRoutePath(),
    options: kit.routeOptions,
    handler: get
  },
  {
    method: 'POST',
    path: startRoutePath(),
    options: kit.routeOptions,
    handler: startPost
  }
]
