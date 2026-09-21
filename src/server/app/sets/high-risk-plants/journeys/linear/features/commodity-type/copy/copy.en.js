// AWAITING THE COPY PASS — the strings below are the journey spec's verbatim
// wording and have not been through a content review
// (journey-spec.json pages[commodity-type].provisionalCopy).

/**
 * The commodity-type page — the notification's entry question.
 *
 * `typeHints` are functions rather than strings because each one quotes a
 * timing window in days. The controller passes the constant from
 * `features/timing-windows.js`, so the number is written once and this bundle
 * only says where it appears in the sentence.
 */
export const copy = {
  title: 'What are you importing?',
  legend: 'What are you importing?',
  hint: 'Select the type of goods this notification is for. Notify potatoes, plants for planting and wood in separate notifications.',
  linesWarning:
    'Changing your answer will remove the commodities you have already added.',
  linesWarningIcon: 'Warning',
  typeLabels: {
    potatoes: 'Potatoes (seed or ware)',
    'plants-for-planting': 'Plants for planting',
    'wood-and-cut-trees': 'Wood and cut trees'
  },
  typeHints: {
    potatoes: (days) =>
      `You must notify at least ${days} days before the expected date of arrival.`,
    'plants-for-planting': (days) =>
      `You must notify before arrival, or no later than ${days} days after the date of arrival.`,
    'wood-and-cut-trees': (days) =>
      `You must notify before arrival, or no later than ${days} days after the date of arrival.`
  },
  errors: {
    commodityType: 'Select what you are importing'
  }
}
