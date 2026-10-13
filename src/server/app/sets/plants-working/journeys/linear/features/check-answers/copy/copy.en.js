export const copy = {
  late: {
    title: 'Important',
    heading: 'Your notification was made outside the required timing',
    accepted: 'It has still been accepted and recorded.',
    warning: (rule) =>
      `If you submit this notification today it will be late. ${rule} You can still submit it.`,
    icon: 'Warning',
    potatoes: (days) =>
      `Notifications for potatoes must be made at least ${days} days before the expected date of arrival.`,
    plantsAndWood: (days) =>
      `Notifications for plants for planting and wood must be made no later than ${days} days after the date of arrival.`
  },

  title: 'Check your answers',
  change: 'Change',
  cancelAmend: {
    link: 'Cancel amendment',
    successTitle: 'Success',
    successBody:
      'The amendment has been cancelled and the submitted version restored.'
  },
  notProvided: 'Not provided',
  continue: 'Continue',
  errors: {
    parties: {
      consignor: 'Select an address for the consignor',
      placeOfDestination: 'Select an address for the place of destination'
    }
  },
  submit: {
    heading: 'Now submit your notification',
    body: 'Continue to the declaration to submit your notification.'
  },
  sections: {
    consignment: '1. About the consignment',
    arrival: '2. Arrival and destination',
    parties: '3. Consignment parties'
  },
  cards: {
    import: 'Import details',
    commodity: 'Commodity',
    arrival: 'Arrival details',
    consignor: 'Consignor or exporter',
    identification: 'Identification numbers',
    contact: 'Contact'
  },
  labels: {
    commodityType: 'What are you importing?',
    countryOfOrigin: 'Country of origin',
    category: 'Category',
    arrivalStatus: 'Has the consignment arrived?',
    arrivalTime: 'Arrival time',
    proposedPlaceOfLanding: 'Place of landing',
    name: 'Name',
    address: 'Address',
    telephoneNumber: 'Telephone number',
    emailAddress: 'Email address',
    genus: 'Genus',
    species: 'Species',
    commodityCode: 'Commodity code',
    potatoVariety: 'Variety',
    quantity: 'Quantity',
    potatoIntendedUse: 'Intended use',
    eppoCode: 'EPPO code',
    sizeOfTree: 'Size of the trees',
    phytosanitaryTreatments: 'Phytosanitary treatments applied',
    supplierIdentificationNumber:
      'Identification number of the supplier of the plants',
    producerIdentificationNumber:
      'Identification number of the producer of the potatoes',
    cropIdentificationNumber: 'Crop identification number',
    consignmentNumber: 'Consignment number (optional)'
  },
  delete: 'Delete notification',
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
  statusLabels: {
    'already-arrived': 'Yes, it has already arrived',
    'not-yet-arrived': 'No, it has not arrived yet'
  }
}
