/**
 * The notification timing windows, in days.
 *
 * Potatoes are notified ahead of arrival (reg 24A(1)); plants for planting and
 * wood may be notified up to four days after it (reg 26(1)). Both numbers are
 * written here and nowhere else — the commodity-type option hints, the
 * arrival-details validation and the lateness rules all read them from this
 * module rather than repeating the figure.
 */
export const POTATO_DAYS_BEFORE_ARRIVAL = 2

export const PLANTS_WOOD_DAYS_AFTER_ARRIVAL = 4
