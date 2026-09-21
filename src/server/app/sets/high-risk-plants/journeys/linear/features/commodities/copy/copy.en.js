// AWAITING THE COPY PASS — the strings below are the journey spec's verbatim
// wording, and the per-field hints and examples are invented
// (journey-spec.json pages[commodities].provisionalCopy,
// pages[commodity-details].provisionalCopy, ruled at d-049).

/**
 * The commodities collection — the list page that owns the group and the
 * entry sub-page that adds or edits one line.
 *
 * `list.removed` names the commodity type a change dropped lines for, so this
 * bundle carries the three type labels as well. They are deliberately the same
 * three strings the commodity-type feature holds: a feature owns the words it
 * renders, and the two are held together by `copy.test.js` checking both
 * against the service's value list rather than by one importing the other.
 *
 * The length limits in the error sentences are arguments, not literals: the
 * controller passes the constant it validates against, so a cap is written
 * once.
 */
export const copy = {
  typeLabels: {
    potatoes: 'Potatoes (seed or ware)',
    'plants-for-planting': 'Plants for planting',
    'wood-and-cut-trees': 'Wood and cut trees'
  },
  categoryLabels: {
    'seed-potatoes': 'Seed potatoes',
    'ware-potatoes': 'Ware potatoes',
    'plants-for-planting': 'Plants for planting',
    'trees-for-planting': 'Trees for planting',
    'conifer-wood-with-bark':
      'Conifer wood with bark, or isolated bark of conifer',
    'conifer-wood-without-bark':
      'Conifer wood without bark (from Italy, France, Portugal or Spain)',
    'cut-coniferous-trees': 'Cut coniferous trees more than 3 metres high',
    'hardwood-round-surface':
      'Wood of sweet chestnut, ash or plane that keeps all or part of its natural round surface',
    'hardwood-chips':
      'Wood of sweet chestnut, ash or plane in chips not processed into pellets or briquettes'
  },
  genusLabels: {
    Castanea: 'Castanea (sweet chestnut)',
    Cedrus: 'Cedrus (cedar)',
    Coffea: 'Coffea (coffee)',
    Fraxinus: 'Fraxinus (ash)',
    Lavandula: 'Lavandula (lavender)',
    'Nerium oleander': 'Nerium oleander (oleander)',
    'Olea europaea': 'Olea europaea (olive)',
    Picea: 'Picea (spruce)',
    Pinus: 'Pinus (pine)',
    Platanus: 'Platanus (plane)',
    'Polygala myrtifolia': 'Polygala myrtifolia (myrtle-leaf milkwort)',
    Prunus: 'Prunus (plums, cherry etc)',
    Quercus: 'Quercus (oak)',
    'Salvia rosmarinus': 'Salvia rosmarinus (rosemary)',
    Ulmus: 'Ulmus (elm)'
  },
  list: {
    title: 'Commodities in the consignment',
    heading: 'Commodities in the consignment',
    empty: 'You have not added any commodities yet.',
    addAnother: 'Add another commodity',
    table: {
      caption: 'Commodities you have added',
      category: 'Category',
      genusOrVariety: 'Genus or variety',
      quantity: 'Quantity',
      actionsHidden: 'Actions'
    },
    change: 'Change',
    changeHidden: (position) => `commodity ${position}`,
    remove: 'Remove',
    removeHidden: (position) => `commodity ${position}`,
    removed: {
      title: 'Commodities removed',
      body: (count, typeLabel) =>
        count === 1
          ? `We removed 1 commodity that is not ${typeLabel}`
          : `We removed ${count} commodities that are not ${typeLabel}`
    },
    errors: {
      commodityLines: 'Add at least one commodity'
    }
  },
  details: {
    title: 'Commodity details',
    heading: 'Commodity details',
    categoryLegend: 'What category of goods is this?',
    categoryHints: {
      'plants-for-planting':
        'Shrubs, young plants, cuttings and other plants for planting that are not trees.',
      'trees-for-planting':
        'Trees for planting of any size, including saplings and whips. You will be asked their height.'
    },
    categoryHintByCommodityType: {
      'wood-and-cut-trees':
        'Preservative-treated wood does not need to be notified, unless it is cut coniferous trees more than 3 metres high.'
    },
    genusPlaceholder: 'Select a genus',
    genusNoResults: 'No genera found',
    fields: {
      genus: {
        label: 'Genus',
        hint: 'Start typing to search for a genus.'
      },
      species: {
        label: 'Species',
        hint: 'For example, Quercus robur. Enter the species name as it appears on the plant passport.'
      },
      commodityCode: {
        label: 'Commodity code',
        hint: 'The commodity code for these goods from the UK Trade Tariff. For example, 0602 20 20.'
      },
      potatoVariety: {
        label: 'Variety',
        hint: 'For example, Maris Piper.'
      },
      quantity: {
        label: 'Quantity',
        hint: 'For example, 250. Give the number of plants, tubers, trees or units of wood as a whole number.'
      },
      potatoIntendedUse: {
        label: 'Intended use',
        hint: 'For example, planting, processing or fresh sale.'
      },
      eppoCode: {
        label: 'EPPO code',
        hint: 'The EPPO code for the plant. For example, QUERO for Quercus robur.'
      },
      sizeOfTree: {
        label: 'Size of the trees',
        hint: 'Give the height in metres. For example, 3.5.'
      },
      phytosanitaryTreatments: {
        label: 'Phytosanitary treatments applied',
        hint: 'Describe any phytosanitary treatment the wood has had, for example heat treatment (HT) or kiln drying (KD).'
      }
    },
    continue: 'Continue',
    saveAndAddAnother: 'Save and add another',
    errors: {
      category: 'Select the category of goods',
      genus: 'Select the genus',
      species: {
        required: 'Enter the species',
        maxLength: (max) => `Species must be ${max} characters or less`
      },
      commodityCode: {
        required: 'Enter the commodity code',
        maxLength: (max) => `Commodity code must be ${max} characters or less`
      },
      quantity: {
        required: 'Enter the quantity',
        invalid: 'Enter a whole number greater than 0'
      },
      potatoVariety: {
        required: 'Enter the variety',
        maxLength: (max) => `Variety must be ${max} characters or less`
      },
      potatoIntendedUse: {
        required: 'Enter the intended use',
        maxLength: (max) => `Intended use must be ${max} characters or less`
      },
      eppoCode: {
        required: 'Enter the EPPO code',
        maxLength: (max) => `EPPO code must be ${max} characters or less`
      },
      sizeOfTree: {
        required: 'Enter the size of the trees',
        maxLength: (max) =>
          `Size of the trees must be ${max} characters or less`
      },
      phytosanitaryTreatments: {
        required: 'Enter the phytosanitary treatments applied',
        maxLength: (max) =>
          `Phytosanitary treatments must be ${max} characters or less`
      }
    }
  }
}
