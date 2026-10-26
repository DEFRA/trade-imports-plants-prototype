import {
  formatDateText,
  startOfDayInZone
} from '../../../../../../lib/validate/index.js'

const SERVICE_TIME_ZONE = 'Europe/London'

/**
 * The latest arrival date allowed, read from one clock reading: today in
 * Europe/London for a consignment that has already arrived, and no bound
 * otherwise.
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
