import { ALREADY_ARRIVED, NOT_YET_ARRIVED } from '../arrival-status/statuses.js'

/**
 * The three answer-tree names this page collects, and the states its date
 * question can be asked in.
 *
 * Each name is the manifest obligation name, the DOM field name and the
 * validation error key at once, so an error-summary link resolves to the
 * control it names. They are written here rather than as literals in the
 * controller because the copy test and the browser spec name them too.
 */
export const ARRIVAL_DATE = 'arrivalDate'

export const ARRIVAL_TIME = 'arrivalTime'

export const PROPOSED_PLACE_OF_LANDING = 'proposedPlaceOfLanding'

/**
 * The date question means a different thing in each of three states, so its
 * label and hint are chosen by state rather than written once. Potatoes have no
 * arrival status (reg 24A has no post-arrival branch), so the commodity type
 * decides the state for them; plants and wood take theirs from the answer given
 * on arrival-status.
 */
export const POTATO_ARRIVAL = 'potatoes'

export const DATE_STATES = Object.freeze([
  POTATO_ARRIVAL,
  ALREADY_ARRIVED,
  NOT_YET_ARRIVED
])
