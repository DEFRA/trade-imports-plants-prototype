export const copy = {
  title: 'Filter consignments',
  intro:
    'Choose a commodity type or a country of origin to narrow the list of consignments.',
  search: {
    label: 'Search consignments',
    hint: 'Enter a reference or a commodity name',
    button: 'Search'
  },
  filter: {
    heading: 'Filter',
    apply: 'Apply filters',
    clear: 'Clear all filters'
  },
  types: {
    legend: 'Commodity type',
    labels: {
      plantsForPlanting: 'Plants for planting',
      potatoes: 'Potatoes',
      woodAndCutTrees: 'Wood and cut trees'
    }
  },
  origins: {
    legend: 'Country of origin',
    labels: {
      BE: 'Belgium',
      DE: 'Germany',
      FR: 'France',
      IT: 'Italy',
      NL: 'Netherlands'
    }
  },
  results: {
    count: (total) => (total === 1 ? '1 consignment' : `${total} consignments`),
    reference: 'Reference:',
    type: 'Commodity type:',
    origin: 'Country of origin:',
    noMatches: 'No consignments match your search. Try removing some filters.'
  }
}
