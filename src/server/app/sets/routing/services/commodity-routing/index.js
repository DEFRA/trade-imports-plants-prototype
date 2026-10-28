/**
 * Works out where an import belongs from as few answers as possible.
 *
 * The trader names a commodity. Each commodity sits in a routing group, and
 * each group has a rule that turns the answers into a destination: a
 * notification type, or a plain outcome such as "you do not need to notify".
 * A group also lists the questions its rule can read. `route` never asks a
 * question whose answer could not change the outcome: it tries every answer
 * still open, and asks the next question only while those answers lead to
 * more than one destination.
 *
 * The rules are a first draft for this design experiment. They are a reading
 * of the plant health risk categories and of what the high-risk plants
 * notification covers, and have not been checked by policy.
 *
 * The service holds values, never the words a page shows for them, apart from
 * the commodity and country names it passes on as reference data.
 */
import * as commodities from '../commodities/index.js'
import { REST_OF_WORLD_COUNTRIES, SEED_POTATO_COUNTRIES } from './countries.js'
import { TARIFF_COMMODITIES } from './tariff.js'

export const PLANTS_NOTIFICATION = 'plants-notification'
export const CHED_PP = 'ched-pp'
export const CHED_A = 'ched-a'
export const CHED_P = 'ched-p'
export const NO_NOTIFICATION = 'no-notification'
export const PROHIBITED = 'prohibited'
export const CHECK_RULES = 'check-rules'

export const GENUS = 'genus'
export const BARK = 'bark'
export const ORIGIN = 'origin'

export const OTHER_GENUS = 'other'
export const WITH_BARK = 'with-bark'
export const WITHOUT_BARK = 'without-bark'

const SEED_POTATOES = 'seed-potatoes'
const WARE_POTATOES = 'ware-potatoes'
const PLANTS_FOR_PLANTING = 'plants-for-planting'
const TREES_FOR_PLANTING = 'trees-for-planting'
const CONIFER_WOOD_WITH_BARK = 'conifer-wood-with-bark'
const CONIFER_WOOD_WITHOUT_BARK = 'conifer-wood-without-bark'
const HARDWOOD_ROUND_SURFACE = 'hardwood-round-surface'
const HARDWOOD_CHIPS = 'hardwood-chips'

// The notifications this prototype does not hold a journey for. Routing can
// still start one as a placeholder, carrying the answers it was given.
const PLACEHOLDER_NOTIFICATIONS = Object.freeze([CHED_PP, CHED_A, CHED_P])

const SECTORS = Object.freeze(['plants', 'live-animals', 'germinal-products'])

const EU_MEMBER_STATES = commodities.originCountriesFor(PLANTS_FOR_PLANTING)

// The high-risk plants notification takes a category from the countries the
// set's own commodities service allows it from. A category that service
// narrows to no list (seed potatoes) may come from the whole origin block.
const notifiableFrom = (category, origin) => {
  const allowed = commodities.originCountriesFor(category)
  return allowed.length === 0 || allowed.includes(origin.value)
}

// Goods the high-risk plants notification covers: notified here from a country
// it allows, checked by hand from the rest of the origin block, and on a
// CHED-PP from anywhere else.
const coveredCategory = (category, origin) => {
  if (!origin.inOriginBlock) {
    return CHED_PP
  }
  return notifiableFrom(category, origin) ? PLANTS_NOTIFICATION : CHECK_RULES
}

const seedPotatoes = ({ origin }) => {
  if (origin.inOriginBlock) {
    return PLANTS_NOTIFICATION
  }
  return SEED_POTATO_COUNTRIES.includes(origin.value) ? CHED_PP : PROHIBITED
}

const namedGenus = (category) => (answers) =>
  answers.genus === OTHER_GENUS
    ? CHED_PP
    : coveredCategory(category, answers.origin)

const hardwood = (category) => (answers) => {
  if (answers.genus !== OTHER_GENUS) {
    return coveredCategory(category, answers.origin)
  }
  return answers.origin.inOriginBlock ? CHECK_RULES : CHED_PP
}

const coniferCategory = ({ bark }) =>
  bark === WITH_BARK ? CONIFER_WOOD_WITH_BARK : CONIFER_WOOD_WITHOUT_BARK

const GROUPS = Object.freeze({
  'live-animals': {
    sector: 'live-animals',
    questions: [],
    decide: () => CHED_A
  },
  'germinal-products': {
    sector: 'germinal-products',
    questions: [],
    decide: () => CHED_P
  },
  seeds: { sector: 'plants', questions: [], decide: () => CHED_PP },
  'cut-flowers-and-foliage': {
    sector: 'plants',
    questions: [ORIGIN],
    decide: ({ origin }) => (origin.inOriginBlock ? NO_NOTIFICATION : CHED_PP)
  },
  'seed-potatoes': {
    sector: 'plants',
    questions: [ORIGIN],
    decide: seedPotatoes,
    category: () => SEED_POTATOES
  },
  'ware-potatoes': {
    sector: 'plants',
    questions: [ORIGIN],
    decide: ({ origin }) => coveredCategory(WARE_POTATOES, origin),
    category: () => WARE_POTATOES
  },
  'plants-for-planting': {
    sector: 'plants',
    questions: [ORIGIN, GENUS],
    decide: namedGenus(PLANTS_FOR_PLANTING),
    category: () => PLANTS_FOR_PLANTING
  },
  'trees-for-planting': {
    sector: 'plants',
    questions: [ORIGIN, GENUS],
    decide: namedGenus(TREES_FOR_PLANTING),
    category: () => TREES_FOR_PLANTING
  },
  'conifer-wood': {
    sector: 'plants',
    questions: [ORIGIN, BARK],
    decide: (answers) =>
      coveredCategory(coniferCategory(answers), answers.origin),
    category: coniferCategory
  },
  'hardwood-chips': {
    sector: 'plants',
    questions: [ORIGIN, GENUS],
    decide: hardwood(HARDWOOD_CHIPS),
    category: () => HARDWOOD_CHIPS
  },
  'hardwood-round': {
    sector: 'plants',
    questions: [ORIGIN, GENUS],
    decide: hardwood(HARDWOOD_ROUND_SURFACE),
    category: () => HARDWOOD_ROUND_SURFACE
  }
})

// The genus a group asks about is the list the notification itself offers for
// the category that group fills in, so routing never names a genus the
// notification would then refuse.
const GENUS_CATEGORY = Object.freeze({
  'plants-for-planting': PLANTS_FOR_PLANTING,
  'trees-for-planting': TREES_FOR_PLANTING,
  'hardwood-chips': HARDWOOD_CHIPS,
  'hardwood-round': HARDWOOD_ROUND_SURFACE
})

/**
 * The sectors a trader can narrow the commodity list to, in the order the
 * first question offers them.
 *
 * @returns {readonly string[]} the frozen value list.
 */
export const sectors = () => SECTORS

/**
 * The notification types routing can only start as a placeholder.
 *
 * @returns {readonly string[]} the frozen value list.
 */
export const placeholderNotifications = () => PLACEHOLDER_NOTIFICATIONS

/**
 * Every commodity routing knows, optionally narrowed to one sector.
 *
 * @param {string} [sector] - a sector value.
 * @returns {object[]} the commodities, each `{ code, name, group }`.
 */
export const commoditiesIn = (sector) =>
  SECTORS.includes(sector)
    ? TARIFF_COMMODITIES.filter(({ group }) => GROUPS[group].sector === sector)
    : [...TARIFF_COMMODITIES]

/**
 * One commodity by its code.
 *
 * @param {string} [code] - a 10-digit commodity code.
 * @returns {object|undefined} the commodity, or undefined for an unknown code.
 */
export const commodityOf = (code) =>
  TARIFF_COMMODITIES.find((commodity) => commodity.code === code)

/**
 * The sector a commodity belongs to.
 *
 * @param {object} commodity - a commodity from this service.
 * @returns {string} the sector value.
 */
export const sectorOf = (commodity) => GROUPS[commodity.group].sector

/**
 * The genus values a commodity's group asks the trader to pick from: the
 * genera the notification covers, then "another".
 *
 * @param {object} commodity - a commodity from this service.
 * @returns {string[]} the genus values, empty for a group that asks no genus.
 */
export const genusOptionsFor = (commodity) => {
  const category = GENUS_CATEGORY[commodity.group]
  return category ? [...commodities.generaFor(category), OTHER_GENUS] : []
}

/**
 * The two answers to the bark question.
 *
 * @returns {string[]} the bark values.
 */
export const barkOptions = () => [WITH_BARK, WITHOUT_BARK]

/**
 * Every country a consignment can be routed from: the origin block first, as
 * the shared countries service lists it, then the rest of the world.
 *
 * @param {object[]} originBlock - the origin block, each `{ value, text }`.
 * @returns {object[]} the places, each `{ value, text, inOriginBlock }`.
 */
export const placesFrom = (originBlock) => [
  ...originBlock.map(({ value, text }) => ({
    value,
    text,
    inOriginBlock: true,
    inEu: EU_MEMBER_STATES.includes(value)
  })),
  ...REST_OF_WORLD_COUNTRIES.map((name) => ({
    value: name,
    text: name,
    inOriginBlock: false,
    inEu: false
  }))
]

const optionsFor = (question, commodity, places) => {
  if (question === ORIGIN) {
    return places
  }
  return question === GENUS ? genusOptionsFor(commodity) : barkOptions()
}

// Every destination still reachable from the answers given so far.
const reachable = (group, commodity, answers, open, places) => {
  if (open.length === 0) {
    return new Set([group.decide(answers)])
  }
  const [question, ...rest] = open
  const found = new Set()
  for (const option of optionsFor(question, commodity, places)) {
    const next = { ...answers, [question]: option }
    for (const destination of reachable(group, commodity, next, rest, places)) {
      found.add(destination)
    }
  }
  return found
}

/**
 * Where a commodity belongs, or the next question to ask.
 *
 * @param {object} commodity - a commodity from this service.
 * @param {object} answers - the answers given so far, keyed by question:
 * `origin` is a place from `placesFrom`, `genus` and `bark` are values.
 * @param {object[]} places - every place, from `placesFrom`.
 * @returns {{destination: string}|{ask: string}} the destination once the
 * answers settle it, otherwise the next question to ask.
 */
export const route = (commodity, answers, places) => {
  const group = GROUPS[commodity.group]
  const open = group.questions.filter(
    (question) => answers[question] === undefined
  )
  const destinations = reachable(group, commodity, answers, open, places)
  const [destination] = destinations
  // The notification this prototype can start is filled in from the answers,
  // so it is offered only once every question its group asks is answered.
  const settled =
    destinations.size === 1 &&
    (destination !== PLANTS_NOTIFICATION || open.length === 0)
  return settled ? { destination } : { ask: open[0] }
}

const commodityTypeOf = (category) =>
  commodities
    .commodityTypes()
    .find((type) => commodities.categoriesFor(type).includes(category))

/**
 * The high-risk plants notification answers the routing answers already give.
 *
 * @param {object} commodity - a commodity from this service.
 * @param {object} answers - the routing answers, as `route` reads them.
 * @returns {{commodityType: string, line: object, countryOfOrigin: string}}
 * the commodity type, one commodity line and the country of origin.
 */
export const notificationAnswersFor = (commodity, answers) => {
  const category = GROUPS[commodity.group].category(answers)
  const fields = commodities.lineFieldsFor(category)
  const line = { category }
  if (fields.includes('genus')) {
    line.genus = answers.genus
  }
  if (fields.includes('commodityCode')) {
    line.commodityCode = commodity.code
  }
  return {
    commodityType: commodityTypeOf(category),
    line,
    countryOfOrigin: answers.origin.value
  }
}
