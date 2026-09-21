import {
  formatDateText,
  startOfDayInZone
} from '../../../../../../lib/validate/index.js'

// The service's own clock. A notifier in Great Britain saying "today" means
// today here, not today in UTC: through British Summer Time the British day
// starts an hour early, so the two dates differ from 23:00 UTC until midnight.
const SERVICE_TIME_ZONE = 'Europe/London'

/**
 * The bounds the arrival date is held to, in both the shapes that need them.
 *
 * Only one bound is ruled: a consignment that has already arrived cannot have
 * arrived tomorrow, so the date is capped at today (reg 26(2)(a) — "the date on
 * which it first arrived"). Nothing bounds the other two states. A late
 * notification is accepted and flagged rather than refused, so there is no
 * lower bound in any state.
 *
 * The validator compares raw timestamps and the MoJ picker parses only
 * `d/m/yyyy` text, so both are returned from one clock read: a second read
 * could straddle midnight and bound the two sides on different days.
 *
 * @param {boolean} alreadyArrived - whether the consignment is here already.
 * @param {Date} [now] - the instant to read the calendar day from.
 * @returns {{ max?: Date, maxText?: string }} `max` as midnight UTC for
 * `requiredDateTextInRange`, `maxText` as `d/m/yyyy` for `kit.dateField`. Both
 * are absent in an unbounded state, which each consumer reads as no bound.
 */
export const arrivalBounds = (alreadyArrived, now = new Date()) => {
  if (!alreadyArrived) {
    return {}
  }
  const max = startOfDayInZone(now, SERVICE_TIME_ZONE)
  return { max, maxText: formatDateText(max) }
}
