// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
// AWAITING THE COPY PASS — the English behind these strings is provisional
// (journey-spec.json pages[commodities].provisionalCopy,
// pages[commodity-details].provisionalCopy). `details.title` is the
// live-animals string for the identical English page title; the type labels
// are the commodity-type bundle's, for the identical English sentences. Every
// other string is machine-draft.
export const copy = {
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
  list: {
    title: 'Nwyddau yn y llwyth',
    heading: 'Nwyddau yn y llwyth',
    empty: 'Nid ydych wedi ychwanegu unrhyw nwyddau eto.',
    addAnother: 'Ychwanegu nwydd arall',
    table: {
      caption: 'Y nwyddau rydych wedi’u hychwanegu',
      category: 'Categori',
      genusOrVariety: 'Genws neu fathogyn',
      quantity: 'Nifer',
      actionsHidden: 'Camau gweithredu'
    },
    change: 'Newid',
    changeHidden: (position) => `nwydd ${position}`,
    remove: 'Tynnu',
    removeHidden: (position) => `nwydd ${position}`,
    removed: {
      title: 'Nwyddau wedi’u tynnu',
      body: (count, typeLabel) =>
        count === 1
          ? `Gwnaethom dynnu 1 nwydd nad yw’n ${typeLabel}`
          : `Gwnaethom dynnu ${count} o nwyddau nad ydynt yn ${typeLabel}`
    },
    errors: {
      commodityLines: 'Ychwanegwch o leiaf un nwydd'
    }
  },
  details: {
    title: 'Manylion y nwyddau',
    heading: 'Manylion y nwyddau',
    categoryLegend: 'Pa gategori o nwyddau yw hwn?',
    categoryHints: {
      'plants-for-planting':
        'Llwyni, planhigion ifanc, toriadau a phlanhigion eraill i’w plannu nad ydynt yn goed.',
      'trees-for-planting':
        'Coed i’w plannu o unrhyw faint, gan gynnwys eginblanhigion a gwialenni. Byddwn yn gofyn am eu taldra.'
    },
    categoryHintByCommodityType: {
      'wood-and-cut-trees':
        'Nid oes angen hysbysu am bren sydd wedi’i drin â chadwolyn, oni bai ei fod yn goed conwydd wedi’u torri sy’n uwch na 3 metr.'
    },
    genusPlaceholder: 'Dewiswch genws',
    genusNoResults: 'Ni ddaethpwyd o hyd i unrhyw genws',
    fields: {
      genus: {
        label: 'Genws',
        hint: 'Dechreuwch deipio i chwilio am genws.'
      },
      species: {
        label: 'Rhywogaeth',
        hint: 'Er enghraifft, Quercus robur. Rhowch enw’r rhywogaeth fel y mae’n ymddangos ar y pasbort planhigion.'
      },
      commodityCode: {
        label: 'Cod nwyddau',
        hint: 'Cod nwyddau’r eitemau hyn o Dariff Masnach y DU. Er enghraifft, 0602 20 20.'
      },
      potatoVariety: {
        label: 'Mathogyn',
        hint: 'Er enghraifft, Maris Piper.'
      },
      quantity: {
        label: 'Nifer',
        hint: 'Er enghraifft, 250. Rhowch nifer y planhigion, cloron, coed neu unedau o bren fel rhif cyfan.'
      },
      potatoIntendedUse: {
        label: 'Y defnydd arfaethedig',
        hint: 'Er enghraifft, plannu, prosesu neu werthu’n ffres.'
      },
      eppoCode: {
        label: 'Cod EPPO',
        hint: 'Cod EPPO y planhigyn. Er enghraifft, QUERO ar gyfer Quercus robur.'
      },
      sizeOfTree: {
        label: 'Maint y coed',
        hint: 'Rhowch y taldra mewn metrau. Er enghraifft, 3.5.'
      },
      phytosanitaryTreatments: {
        label: 'Triniaethau ffytoiechydol a roddwyd',
        hint: 'Disgrifiwch unrhyw driniaeth ffytoiechydol y mae’r pren wedi’i chael, er enghraifft triniaeth wres (HT) neu sychu odyn (KD).'
      }
    },
    continue: 'Parhau',
    saveAndAddAnother: 'Cadw ac ychwanegu un arall',
    errors: {
      category: 'Dewiswch gategori’r nwyddau',
      genus: 'Dewiswch y genws',
      species: {
        required: 'Rhowch y rhywogaeth',
        maxLength: (max) => `Rhaid i’r rhywogaeth fod yn ${max} nod neu lai`
      },
      commodityCode: {
        required: 'Rhowch y cod nwyddau',
        maxLength: (max) => `Rhaid i’r cod nwyddau fod yn ${max} nod neu lai`
      },
      quantity: {
        required: 'Rhowch y nifer',
        invalid: 'Rhowch rif cyfan sy’n fwy na 0'
      },
      potatoVariety: {
        required: 'Rhowch y mathogyn',
        maxLength: (max) => `Rhaid i’r mathogyn fod yn ${max} nod neu lai`
      },
      potatoIntendedUse: {
        required: 'Rhowch y defnydd arfaethedig',
        maxLength: (max) =>
          `Rhaid i’r defnydd arfaethedig fod yn ${max} nod neu lai`
      },
      eppoCode: {
        required: 'Rhowch y cod EPPO',
        maxLength: (max) => `Rhaid i’r cod EPPO fod yn ${max} nod neu lai`
      },
      sizeOfTree: {
        required: 'Rhowch faint y coed',
        maxLength: (max) => `Rhaid i faint y coed fod yn ${max} nod neu lai`
      },
      phytosanitaryTreatments: {
        required: 'Rhowch y triniaethau ffytoiechydol a roddwyd',
        maxLength: (max) =>
          `Rhaid i’r triniaethau ffytoiechydol fod yn ${max} nod neu lai`
      }
    }
  }
}
