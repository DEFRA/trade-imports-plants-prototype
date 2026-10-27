export const copy = {
  title: '[Welsh needed] Filter consignments',
  intro:
    '[Welsh needed] Choose a commodity type or a country of origin to narrow the list of consignments.',
  search: {
    label: '[Welsh needed] Search consignments',
    hint: '[Welsh needed] Enter a reference or a commodity name',
    button: '[Welsh needed] Search'
  },
  filter: {
    heading: '[Welsh needed] Filter',
    apply: '[Welsh needed] Apply filters',
    clear: '[Welsh needed] Clear all filters'
  },
  types: {
    legend: '[Welsh needed] Commodity type',
    labels: {
      plantsForPlanting: '[Welsh needed] Plants for planting',
      potatoes: '[Welsh needed] Potatoes',
      woodAndCutTrees: '[Welsh needed] Wood and cut trees'
    }
  },
  origins: {
    legend: '[Welsh needed] Country of origin',
    labels: {
      BE: '[Welsh needed] Belgium',
      DE: '[Welsh needed] Germany',
      FR: '[Welsh needed] France',
      IT: '[Welsh needed] Italy',
      NL: '[Welsh needed] Netherlands'
    }
  },
  results: {
    count: (total) =>
      total === 1
        ? '[Welsh needed] 1 consignment'
        : `[Welsh needed] ${total} consignments`,
    reference: '[Welsh needed] Reference:',
    type: '[Welsh needed] Commodity type:',
    origin: '[Welsh needed] Country of origin:',
    noMatches:
      '[Welsh needed] No consignments match your search. Try removing some filters.'
  }
}
