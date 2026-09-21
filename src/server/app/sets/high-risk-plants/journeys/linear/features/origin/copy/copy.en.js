// AWAITING THE COPY PASS — `guidance` and every `errors.narrowing` sentence
// are invented copy with no service source behind them
// (journey-spec.json pages[origin].provisionalCopy, decisions.json d-054).

/**
 * The origin page — where the consignment comes from.
 *
 * `guidance` and `errors.narrowing` are both keyed by origin-constraint id, so
 * a constraint the commodities service adds arrives here as one more leaf
 * rather than as a branch in the controller.
 */
export const copy = {
  title: 'Origin of the import',
  country: {
    label: 'Country of origin',
    hint: 'Start typing to search for a country.',
    placeholder: 'Select a country',
    noResults: 'No countries found'
  },
  guidance: {
    'ware-potatoes':
      'Notify ware potatoes grown, or suspected to have been grown, in Poland, Portugal, Romania or Spain. Spain does not include the Balearic Islands.'
  },
  errors: {
    countryRequired: 'Select the country where the consignment originates from',
    narrowing: {
      'ware-potatoes':
        'Select Poland, Portugal, Romania or Spain – ware potatoes from other countries do not need to be notified',
      'conifer-wood-without-bark':
        'Select Italy, France, Portugal or Spain – conifer wood without bark from other countries does not need to be notified',
      'eu-member-states':
        'Select an EU member state – plants and wood from other countries do not need to be notified'
    }
  }
}
