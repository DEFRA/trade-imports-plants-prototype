import { ALREADY_ARRIVED, NOT_YET_ARRIVED } from '../arrival-status/statuses.js'

/**
 * The answer-tree name this page collects.
 *
 * It is the manifest obligation name, the DOM radio name and the validation
 * error key at once, so the error-summary link resolves to the first row of
 * the results table.
 */
export const PLACE_OF_DESTINATION = 'placeOfDestination'

/**
 * The question means a different thing in each of three states, so its heading
 * and its description are chosen by state rather than written once.
 *
 * Potatoes are never asked whether the consignment has arrived — reg 24A gives
 * them no post-arrival branch — so the commodity type decides the state for
 * them; plants and wood take theirs from the answer given on arrival-status.
 * The states are named here rather than borrowed from the arrival-details
 * feature: the two pages happen to divide the world the same way, and each
 * owns the division it renders.
 */
export const POTATO_DESTINATION = 'potatoes'

export const DESTINATION_STATES = Object.freeze([
  POTATO_DESTINATION,
  ALREADY_ARRIVED,
  NOT_YET_ARRIVED
])
