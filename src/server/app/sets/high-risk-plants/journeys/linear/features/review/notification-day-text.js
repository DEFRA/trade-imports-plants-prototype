import { formatMomentAsLongDay } from '../../../../../../lib/validate/index.js'

/**
 * The long day shown to the trader for a stored instant.
 *
 * @param {(string|number|Date|null|undefined)} instant - the stored instant.
 * @returns {string|null} null when there is no instant.
 */
export const notificationDayText = (instant) =>
  instant ? formatMomentAsLongDay(new Date(instant)) : null
