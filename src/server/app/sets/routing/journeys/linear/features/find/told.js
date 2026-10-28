import { copyFor } from '../../../../../../shared/copy.js'
import * as routing from '../../../../services/commodity-routing/index.js'
import { copy as commoditiesEn } from '../commodities/copy/copy.en.js'
import { copy as commoditiesCy } from '../commodities/copy/copy.cy.js'
import { COMMODITY, entriesUpTo, findPath } from './conversation.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

/**
 * A conversation's answers in words: what the trader has told us so far.
 */
const copy = copyFor({ en, cy })
const commoditiesCopy = copyFor({ en: commoditiesEn, cy: commoditiesCy })

/**
 * The words for one answer.
 *
 * @param {string} question - the question answered.
 * @param {object|string} answer - a place for the origin, a value otherwise.
 * @returns {string} the text a page shows for it.
 */
export const answerText = (question, answer) => {
  if (question === routing.ORIGIN) {
    return answer.text
  }
  if (question === routing.BARK) {
    return copy.questions.bark.options[answer]
  }
  return answer === routing.OTHER_GENUS
    ? copy.questions.genus.other
    : commoditiesCopy.genusLabels[answer]
}

/**
 * Every answer given so far, in the order it was asked.
 *
 * @param {object} talk - a conversation.
 * @returns {object[]} each `{ key, text, changeHref }`.
 */
export const toldAnswers = (talk) => {
  if (!talk.commodity) {
    return []
  }
  const changeCommodity = findPath(entriesUpTo(talk, COMMODITY))
  return [
    {
      key: copy.told.commodity,
      text: talk.commodity.name,
      changeHref: changeCommodity
    },
    {
      key: copy.told.code,
      text: talk.commodity.code,
      changeHref: changeCommodity
    },
    ...talk.asked.map((question) => ({
      key: copy.told[question],
      text: answerText(question, talk.answers[question]),
      changeHref: findPath(entriesUpTo(talk, question))
    }))
  ]
}

/**
 * The answers as summary list rows, each with a Change link.
 *
 * @param {object} talk - a conversation.
 * @returns {object[]} `govukSummaryList` rows.
 */
export const toldRows = (talk) =>
  toldAnswers(talk).map(({ key, text, changeHref }) => ({
    key: { text: key },
    value: { text },
    actions: {
      items: [
        { href: changeHref, text: copy.told.change, visuallyHiddenText: key }
      ]
    }
  }))

/**
 * The answers as plain summary list rows, with nothing to change.
 *
 * @param {object} talk - a conversation.
 * @returns {object[]} `govukSummaryList` rows.
 */
export const carriedRows = (talk) =>
  toldAnswers(talk).map(({ key, text }) => ({
    key: { text: key },
    value: { text }
  }))
