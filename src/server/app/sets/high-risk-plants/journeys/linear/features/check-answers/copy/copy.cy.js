// MACHINE-DRAFT Welsh — not reviewed by a translator.
export const copy = {
  late: {
    title: 'Pwysig',
    heading: 'Gwnaed eich hysbysiad y tu allan i’r amser gofynnol',
    accepted: 'Mae wedi cael ei dderbyn a’i gofnodi o hyd.',
    warning: (rule) =>
      `Os byddwch yn cyflwyno’r hysbysiad hwn heddiw bydd yn hwyr. ${rule} Gallwch ei gyflwyno o hyd.`,
    icon: 'Rhybudd',
    potatoes: (days) =>
      `Rhaid gwneud hysbysiadau am datws o leiaf ${days} diwrnod cyn y dyddiad cyrraedd disgwyliedig.`,
    plantsAndWood: (days) =>
      `Rhaid gwneud hysbysiadau am blanhigion i’w plannu a phren heb fod yn hwyrach na ${days} diwrnod ar ôl y dyddiad cyrraedd.`
  },

  title: 'Gwiriwch eich atebion',
  change: 'Newid',
  editDetails: 'Golygu manylion',
  errorPrefix: 'Gwall:',
  cancelAmend: {
    successTitle: 'Llwyddiant',
    successBody:
      'Mae’r diwygiad wedi’i ganslo a’r fersiwn a gyflwynwyd wedi’i hadfer.'
  },
  notProvided: 'Heb ei ddarparu',
  continue: 'Parhau',
  errors: {
    parties: {
      consignor: 'Cywirwch fanylion y cyfeiriad ar gyfer yr anfonwr',
      placeOfDestination:
        'Cywirwch fanylion y cyfeiriad ar gyfer y man cyrchfan',
      contactAddress:
        'Cywirwch fanylion y cyfeiriad cyswllt ar gyfer y llwyth hwn'
    },
    cards: {
      importDetails: 'Cwblhewch y manylion mewnforio',
      commodities: 'Cwblhewch fanylion y nwydd',
      arrivalDetails: 'Cwblhewch y manylion cyrraedd',
      placeOfDestination: 'Cwblhewch y man cyrchfan',
      consignor: 'Cwblhewch yr anfonwr neu’r allforiwr',
      identificationNumbers: 'Cwblhewch y rhifau adnabod',
      contact: 'Cwblhewch y cyswllt'
    }
  },
  submit: {
    heading: 'Nawr cyflwynwch eich hysbysiad',
    body: 'Parhewch i’r datganiad i gyflwyno eich hysbysiad.'
  },
  sections: {
    consignment: '1. Am y llwyth',
    arrival: '2. Cyrraedd a chyrchfan',
    parties: '3. Partïon y llwyth'
  },
  cards: {
    import: 'Manylion mewnforio',
    commodity: 'Nwydd',
    arrival: 'Manylion cyrraedd',
    consignor: 'Anfonwr neu allforiwr',
    identification: 'Rhifau adnabod',
    contact: 'Cyswllt'
  },
  labels: {
    commodityType: 'Beth ydych chi’n ei fewnforio?',
    countryOfOrigin: 'Gwlad tarddiad',
    category: 'Categori',
    arrivalStatus: 'A yw’r llwyth wedi cyrraedd?',
    arrivalTime: 'Amser cyrraedd',
    proposedPlaceOfLanding: 'Man glanio',
    name: 'Enw',
    address: 'Cyfeiriad',
    phone: 'Rhif ffôn',
    email: 'Cyfeiriad e-bost',
    genus: 'Genws',
    species: 'Rhywogaeth',
    commodityCode: 'Cod nwyddau',
    potatoVariety: 'Mathogyn',
    quantity: 'Nifer',
    potatoIntendedUse: 'Y defnydd arfaethedig',
    eppoCode: 'Cod EPPO',
    sizeOfTree: 'Maint y coed',
    phytosanitaryTreatments: 'Triniaethau ffytoiechydol a roddwyd',
    supplierIdentificationNumber: 'Rhif adnabod cyflenwr y planhigion',
    producerIdentificationNumber: 'Rhif adnabod cynhyrchydd y tatws',
    cropIdentificationNumber: 'Rhif adnabod y cnwd',
    consignmentNumber: 'Rhif y llwyth (dewisol)'
  },
  delete: 'Dileu’r hysbysiad',
  typeLabels: {
    potatoes: 'Tatws (hadyd neu fwyd)',
    'plants-for-planting': 'Planhigion i’w plannu',
    'wood-and-cut-trees': 'Pren a choed wedi’u torri'
  },
  categoryLabels: {
    'seed-potatoes': 'Tatws hadyd',
    'ware-potatoes': 'Tatws bwyd',
    'plants-for-planting': 'Planhigion i’w plannu',
    'trees-for-planting': 'Coed i’w plannu',
    'conifer-wood-with-bark':
      'Pren conwydd â rhisgl, neu risgl conwydd ar wahân',
    'conifer-wood-without-bark':
      'Pren conwydd heb risgl (o’r Eidal, Ffrainc, Portiwgal neu Sbaen)',
    'cut-coniferous-trees':
      'Coed conwydd wedi’u torri sy’n uwch na 3 metr o daldra',
    'hardwood-round-surface':
      'Pren castanwydden bêr, onnen neu blanwydden sy’n cadw’r cyfan neu ran o’i arwyneb crwn naturiol',
    'hardwood-chips':
      'Pren castanwydden bêr, onnen neu blanwydden yn sglodion nad ydynt wedi’u prosesu’n belenni nac yn friciau'
  },
  genusLabels: {
    Castanea: 'Castanea (castanwydden bêr)',
    Cedrus: 'Cedrus (cedrwydden)',
    Coffea: 'Coffea (coffi)',
    Fraxinus: 'Fraxinus (onnen)',
    Lavandula: 'Lavandula (lafant)',
    'Nerium oleander': 'Nerium oleander (rhoswydden Ffrengig)',
    'Olea europaea': 'Olea europaea (olewydden)',
    Picea: 'Picea (pyrwydden)',
    Pinus: 'Pinus (pinwydden)',
    Platanus: 'Platanus (planwydden)',
    'Polygala myrtifolia': 'Polygala myrtifolia (amrywiol ddeiliog myrtwydd)',
    Prunus: 'Prunus (eirin, ceirios ac ati)',
    Quercus: 'Quercus (derwen)',
    'Salvia rosmarinus': 'Salvia rosmarinus (rhosmari)',
    Ulmus: 'Ulmus (llwyfen)'
  },
  statusLabels: {
    'already-arrived': 'Ydy, mae wedi cyrraedd yn barod',
    'not-yet-arrived': 'Nac ydy, nid yw wedi cyrraedd eto'
  }
}
