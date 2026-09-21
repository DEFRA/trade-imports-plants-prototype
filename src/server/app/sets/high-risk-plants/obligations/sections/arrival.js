import {
  equalsGate,
  includesGate
} from '../../../../model/obligations/helpers/index.js'
import { commodityType } from './commodity.js'

// The one commodity type reg 24A gives a time and a place of landing.
const POTATOES = 'potatoes'

// The two commodity types reg 26(2) gives a post-arrival branch. Reg 24A gives
// the potato notification none, so it is never asked. Listed rather than
// derived: journey-spec.json rules arrivalStatus.activatedBy.includes as this
// exact pair, so a commodity type the service starts offering stays out of the
// gate until someone rules it in.
const POST_ARRIVAL_COMMODITY_TYPES = Object.freeze([
  'plants-for-planting',
  'wood-and-cut-trees'
])

const APPLIES_BECAUSE_COMMODITY_TYPE = Object.freeze([
  Object.freeze({
    code: 'obligation.arrivalStatus.applicable.becauseCommodityType',
    explanation:
      'arrivalStatus applies to notifications for plants for planting and for wood and cut trees'
  })
])

/**
 * Whether the consignment has already arrived in Great Britain.
 *
 * The notifier says so rather than the service deriving it from the arrival
 * date: reg 26(2)(a) branches on arrival in the country and reg 26(2)(b) on
 * arrival at the intended destination, and a date alone cannot say which
 * branch a consignment arriving today is in.
 *
 * A top-level scalar gate on a top-level scalar answer, so the whole
 * notification is either asked the question or not — the engine purges the
 * answer when a change of commodity type takes it out of scope.
 */
export const arrivalStatus = {
  id: '6f29c3c3-17e4-45b0-b66d-c89124e395d1',
  name: 'arrivalStatus',
  status: 'mandatory',
  applyTo: includesGate(
    commodityType,
    POST_ARRIVAL_COMMODITY_TYPES,
    {
      inScope: true,
      status: 'mandatory',
      reasons: APPLIES_BECAUSE_COMMODITY_TYPE
    },
    { inScope: false }
  )
}

/**
 * When the consignment arrives, or arrived.
 *
 * One obligation for every commodity type, because every notification owes a
 * date: reg 24A(2)(a) asks potatoes for the expected date, and reg 26(2)(a)
 * asks plants and wood for the expected date of landing or, once the
 * consignment is here, the date it first arrived. Which of those three
 * sentences a notifier is shown is the arrival-details page's business — the
 * matter owed is the same one.
 */
export const arrivalDate = {
  id: '63e22d64-b9a0-40b4-aec6-0f5f48bdd556',
  name: 'arrivalDate',
  status: 'mandatory'
}

const APPLIES_BECAUSE_POTATOES = Object.freeze([
  Object.freeze({
    code: 'obligation.arrivalTime.applicable.becauseCommodityType',
    explanation: 'arrivalTime applies to notifications for potatoes'
  })
])

/**
 * The expected time of arrival.
 *
 * Reg 24A(2)(a) asks potatoes for 'the expected time and date of their
 * arrival'. Reg 26(2)(a) asks plants and wood for a date alone, so the time is
 * a potato matter and the engine purges it when a notification changes to
 * another commodity type.
 */
export const arrivalTime = {
  id: '0d05c100-b887-4a12-8251-673bc1e1ac31',
  name: 'arrivalTime',
  status: 'mandatory',
  applyTo: equalsGate(
    commodityType,
    POTATOES,
    {
      inScope: true,
      status: 'mandatory',
      reasons: APPLIES_BECAUSE_POTATOES
    },
    { inScope: false }
  )
}

const APPLIES_BECAUSE_POTATOES_LANDING = Object.freeze([
  Object.freeze({
    code: 'obligation.proposedPlaceOfLanding.applicable.becauseCommodityType',
    explanation: 'proposedPlaceOfLanding applies to notifications for potatoes'
  })
])

/**
 * Where the consignment is proposed to land.
 *
 * Reg 24A(2)(aa) is the only landing element in the statute; reg 26(2) has
 * none, so plants and wood are never asked. Gated the same way as the time, on
 * the same notification-level answer.
 */
export const proposedPlaceOfLanding = {
  id: '1c706e7c-6d61-4e47-8bb4-e53efcd72809',
  name: 'proposedPlaceOfLanding',
  status: 'mandatory',
  applyTo: equalsGate(
    commodityType,
    POTATOES,
    {
      inScope: true,
      status: 'mandatory',
      reasons: APPLIES_BECAUSE_POTATOES_LANDING
    },
    { inScope: false }
  )
}
