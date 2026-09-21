import {
  addUtcDays,
  isRealDate,
  startOfDayInZone
} from '../../../../../../lib/validate/calendar.js'
import {
  PLANTS_WOOD_DAYS_AFTER_ARRIVAL,
  POTATO_DAYS_BEFORE_ARRIVAL
} from '../timing-windows.js'

// One seam for each request; callers can supply a clock without changing global time.
export const requestClock = (request) => request.app?.clock?.() ?? new Date()

export const lateness = (clock, commodityType, arrivalDate) => {
  const { year, month, day } = arrivalDate ?? {}
  if (!isRealDate(Number(year), Number(month), Number(day))) {
    return 'on-time'
  }
  const potato = commodityType === 'potatoes'
  if (
    !potato &&
    !['plants-for-planting', 'wood-and-cut-trees'].includes(commodityType)
  ) {
    return 'on-time'
  }
  const arrivalDay = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day))
  )
  const deadline = addUtcDays(
    arrivalDay,
    potato ? -POTATO_DAYS_BEFORE_ARRIVAL : PLANTS_WOOD_DAYS_AFTER_ARRIVAL
  )
  return startOfDayInZone(clock, 'Europe/London') > deadline
    ? 'late'
    : 'on-time'
}
