/**
 * The two states this page asks a notifier to choose between, and the
 * answer-tree name that holds the choice.
 *
 * `ARRIVAL_STATUS` is the manifest obligation name and the DOM field name
 * alike. The arrival section's later pages read the chosen value — the date
 * label and the destination question both turn on it — so the values are named
 * here rather than repeated as literals in each feature that reads them.
 *
 * Already arrived leads: the page asks whether the consignment has arrived, so
 * the affirmative answer is the first radio.
 */
export const ARRIVAL_STATUS = 'arrivalStatus'

export const ALREADY_ARRIVED = 'already-arrived'

export const NOT_YET_ARRIVED = 'not-yet-arrived'

export const ARRIVAL_STATUSES = Object.freeze([
  ALREADY_ARRIVED,
  NOT_YET_ARRIVED
])
