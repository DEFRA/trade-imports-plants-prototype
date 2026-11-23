import {
  PLANTS_WOOD_DAYS_AFTER_ARRIVAL,
  POTATO_DAYS_BEFORE_ARRIVAL
} from '../timing-windows.js'

/**
 * The timing rule a late notification broke, worded by the page's own copy.
 *
 * @param {string} commodityType - the notification's commodity type
 * @param {{ potatoes: (days: number) => string, plantsAndWood: (days: number) => string }} lateCopy - the page's `late` copy
 * @returns {string} the potato rule for potatoes, otherwise the plants and wood rule
 */
export const lateRuleText = (commodityType, lateCopy) =>
  commodityType === 'potatoes'
    ? lateCopy.potatoes(POTATO_DAYS_BEFORE_ARRIVAL)
    : lateCopy.plantsAndWood(PLANTS_WOOD_DAYS_AFTER_ARRIVAL)
