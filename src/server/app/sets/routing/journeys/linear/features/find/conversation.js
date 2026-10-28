import { setBase } from '../../../../../../shared/paths.js'
import * as countries from '../../../../../../services/countries/index.js'
import * as routing from '../../../../services/commodity-routing/index.js'
import { findPage as page } from './page.js'

/**
 * The routing conversation as it travels in an address.
 *
 * The answers ride in the query string, so every step is a link a designer
 * can open, share or go back to. This module reads them back, replays them
 * through the routing rules and writes addresses that carry them on. It holds
 * no words: the pages that show a conversation turn it into text.
 */
export const COMMODITY = 'commodity'
export const SECTOR = 'about'

export const findRoutePath = () => `/${page.slug}`

export const withEntries = (path, entries = []) => {
  const query = new URLSearchParams(entries).toString()
  return query ? `${path}?${query}` : path
}

export const findPath = (entries = []) =>
  withEntries(`${setBase()}${findRoutePath()}`, entries)

export const textOf = (value) => (typeof value === 'string' ? value.trim() : '')

const answerFor = (question, raw, commodity, places) => {
  if (question === routing.ORIGIN) {
    return places.find((place) => place.value === raw)
  }
  const options =
    question === routing.GENUS
      ? routing.genusOptionsFor(commodity)
      : routing.barkOptions()
  return options.includes(raw) ? raw : undefined
}

/**
 * Replay the answers in `source` through the routing rules.
 *
 * Only an answer to a question the rules actually ask is kept, in the order
 * they ask it, so an answer left in the address after a change further back
 * never reaches the outcome.
 *
 * @param {object} source - the query or payload carrying the answers.
 * @returns {Promise<object>} the commodity, the answers kept, the questions
 * asked in order, and either `ask` (the next question) or `destination`.
 */
export const conversation = async (source) => {
  const places = routing.placesFrom(await countries.originCountries())
  const sector = routing.sectors().find((value) => value === source[SECTOR])
  const commodity = routing.commodityOf(textOf(source[COMMODITY]))
  const talk = { places, sector, commodity, answers: {}, asked: [] }
  if (!commodity) {
    return { ...talk, ask: COMMODITY }
  }
  let step = routing.route(commodity, talk.answers, places)
  while (step.ask) {
    const raw = textOf(source[step.ask])
    const answer = answerFor(step.ask, raw, commodity, places)
    if (answer === undefined) {
      return { ...talk, ask: step.ask }
    }
    talk.answers[step.ask] = answer
    talk.asked.push(step.ask)
    step = routing.route(commodity, talk.answers, places)
  }
  return { ...talk, destination: step.destination }
}

const valueOf = (answer) => answer.value ?? answer

/**
 * The address entries that carry a conversation up to, but not including, the
 * question named — every entry when no question is named.
 *
 * @param {object} talk - a conversation, from `conversation`.
 * @param {string} [question] - the question to stop before.
 * @returns {string[][]} the `[name, value]` entries.
 */
export const entriesUpTo = (talk, question) => {
  const entries = []
  if (talk.sector) {
    entries.push([SECTOR, talk.sector])
  }
  if (!talk.commodity || question === COMMODITY) {
    return entries
  }
  entries.push([COMMODITY, talk.commodity.code])
  const kept =
    question === undefined
      ? talk.asked
      : talk.asked.slice(0, talk.asked.indexOf(question))
  return [
    ...entries,
    ...kept.map((asked) => [asked, valueOf(talk.answers[asked])])
  ]
}
