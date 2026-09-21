// AWAITING THE COPY PASS — the title is the animals service string for the
// same party, and the picker chrome below is copied verbatim from the animals
// party picker, apart from `pagination`, which that picker has no counterpart
// for and which is the dashboard's own wording
// (features/dashboard/copy/copy.en.js). The pre-arrival headings are the
// title, so the page is called what the hub task row that leads to it is
// called. The already-arrived heading and the descriptions are the journey
// spec's wording and have not been through a content review (journey-spec.json
// pages[place-of-destination].descriptionByState, decisions.json d-003).

/**
 * The place-of-destination page — where the consignment is going, or where it
 * is being kept now.
 *
 * `headings` and `descriptions` are keyed on the state the question is asked
 * in, not on the page: one field means three different things and the
 * controller picks the state. The keys are the `DESTINATION_STATES` list
 * beside the feature.
 *
 * Everything from `search` down is the picker's own chrome — the search box,
 * the results table and the selection — and is the same whichever state the
 * question is asked in.
 */
const PAGE_NAME = 'Place of destination'

export const copy = {
  title: PAGE_NAME,
  headings: {
    potatoes: PAGE_NAME,
    'not-yet-arrived': PAGE_NAME,
    'already-arrived': 'Where is the consignment now?'
  },
  descriptions: {
    potatoes:
      'Where the goods will be kept after arrival. This is where a plant health inspector may carry out a spot check.',
    'not-yet-arrived':
      'Where the goods will be kept after arrival. This is where a plant health inspector may carry out a spot check.',
    'already-arrived':
      'Give the address where the consignment is being kept. If it is still on its way to its intended destination, give that destination. A plant health inspector may carry out a spot check here.'
  },
  search: {
    label: 'Search',
    hint: 'Name, address or country',
    button: 'Search'
  },
  selectedAddressPrefix: 'Selected address:',
  errorPrefix: 'Error:',
  noMatches: 'No addresses match your search.',
  resultsCaption: (shown, total) => `Showing ${shown} of ${total} addresses`,
  pagination: {
    previous: 'Previous',
    next: 'Next'
  },
  table: {
    selectHidden: 'Select',
    name: 'Name',
    address: 'Address',
    country: 'Country',
    actionsHidden: 'Actions'
  },
  selectRowPrefix: 'Select',
  viewDetails: 'View details',
  viewDetailsFor: 'for',
  errors: {
    placeOfDestination: 'Select a place of destination from the list'
  }
}
