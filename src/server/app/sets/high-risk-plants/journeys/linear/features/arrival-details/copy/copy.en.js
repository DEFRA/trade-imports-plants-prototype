// AWAITING THE COPY PASS — only the title is a service string carried over
// from the animals port-of-entry page. The date labels are the journey spec's
// verbatim wording and every hint below is invented
// (journey-spec.json pages[arrival-details].provisionalCopy, decisions.json
// d-049).

/**
 * The arrival-details page — when the consignment arrives, and for potatoes
 * what time and where it lands.
 *
 * `dateLabels` and `dateHints` are keyed on the state the date question is
 * asked in, not on the page: one field means three different things and the
 * controller picks the state. The keys are the `DATE_STATES` list beside the
 * feature.
 */
export const copy = {
  title: 'Arrival details',
  dateLabels: {
    potatoes: 'Expected date of arrival',
    'not-yet-arrived': 'Expected date of landing in Great Britain',
    'already-arrived': 'Date the consignment first arrived in Great Britain'
  },
  dateHints: {
    potatoes:
      'For example, 27/3/2026. If the potatoes have already arrived, enter the date they arrived.',
    'not-yet-arrived': 'For example, 27/3/2026',
    'already-arrived': 'For example, 27/3/2026'
  },
  time: {
    label: 'Expected time of arrival',
    hint: 'Use the 24-hour clock. For example, 14:30.'
  },
  placeOfLanding: {
    label: 'Proposed place of landing',
    hint: 'Where the potatoes will enter Great Britain. Start typing to search by port name or code.',
    placeholder: 'Select a place of landing',
    noResults: 'No ports found'
  },
  errors: {
    arrivalDate: {
      required: 'Enter the arrival date',
      invalid: 'Enter a real arrival date',
      inFuture: 'The date the consignment arrived cannot be in the future'
    },
    arrivalTime: 'Enter the expected time of arrival',
    proposedPlaceOfLanding: 'Select the proposed place of landing'
  }
}
