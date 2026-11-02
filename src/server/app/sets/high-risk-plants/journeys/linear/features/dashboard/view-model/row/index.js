import { journeyStrip } from '../../../../../../../../shared/kit.js'
import * as countries from '../../../../../../../../services/countries/index.js'
import {
  formatCommodity,
  formatDisplayCalendarDate,
  formatDisplayMoment
} from '../../notification-helper.js'
import { rowActions } from './actions.js'

/**
 * One notification card's view model. There is no consignee cell: the plants
 * set carries no consignee obligation.
 *
 * @param {object} journey - the marshalled list row.
 * @returns {Promise<object>} the card view model.
 */
export const toRow = async (journey) => {
  const reference = journey.reference ?? journey.journeyId
  const origin = journey.originCountryCode
    ? await countries.countryDisplayLabel(journey.originCountryCode)
    : ''

  return {
    reference,
    status: journeyStrip(journey).status,
    late: Boolean(journey.lateNotificationIndicator),
    commodity: formatCommodity(journey.commodity),
    origin,
    arrival: formatDisplayCalendarDate(journey.arrivalDate),
    consignor: journey.consignorName ?? '',
    created: formatDisplayMoment(journey.createdAt),
    submitted: formatDisplayMoment(journey.submittedAt),
    actions: rowActions(journey, reference)
  }
}
