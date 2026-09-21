import { journeyStrip } from '../../../../../../../../shared/kit.js'
import * as countries from '../../../../../../../../services/countries/index.js'
import {
  formatCommodity,
  formatDisplayDate
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
  const originLabel = journey.originCountryCode
    ? await countries.originLabel(journey.originCountryCode)
    : undefined

  return {
    reference,
    status: journeyStrip(journey).status,
    late: Boolean(journey.lateNotificationIndicator),
    commodity: formatCommodity(journey.commodity),
    origin: originLabel ?? journey.originCountryCode ?? '',
    arrival: formatDisplayDate(journey.arrivalDate),
    consignor: journey.consignorName ?? '',
    created: formatDisplayDate(journey.createdAt),
    submitted: formatDisplayDate(journey.submittedAt),
    actions: rowActions(journey, reference)
  }
}
