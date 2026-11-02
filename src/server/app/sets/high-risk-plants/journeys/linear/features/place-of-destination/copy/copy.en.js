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
  errors: {
    placeOfDestination: 'Select a place of destination from the list'
  }
}
