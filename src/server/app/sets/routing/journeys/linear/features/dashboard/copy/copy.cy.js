// PROVISIONAL COPY, MACHINE-DRAFT Welsh — not reviewed by a translator. The
// spec supplies the title, the start button and the four action labels; every
// other string is a machine draft awaiting the copy pass. Do not ship
// user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Gwasanaeth hysbysu mewnforio',
  body:
    'Defnyddiwch y gwasanaeth hwn i roi gwybod i awdurdodau iechyd planhigion ' +
    'am blanhigion risg uchel i’w plannu, tatws, neu bren a choed wedi’u ' +
    'torri rydych chi’n eu mewnforio o aelod-wladwriaethau’r UE, fel sy’n ' +
    'ofynnol gan Gynllun Hysbysu Cenedlaethol Iechyd Planhigion. Byddwch yn ' +
    'ateb cyfres fer o gwestiynau am y llwyth, yna’n cyflwyno eich hysbysiad.',
  guidanceLink:
    'Gwiriwch a yw eich nwyddau’n risg uchel a phryd y mae’n rhaid i chi ' +
    'hysbysu (GOV.UK)',
  startButton: 'Dechrau hysbysiad newydd',
  notificationsHeading: 'Eich hysbysiadau',
  search: {
    heading: 'Hidlo hysbysiadau',
    label: 'Allweddair neu gyfeirnod',
    button: 'Chwilio',
    noResults: 'Ni chanfuwyd unrhyw hysbysiadau'
  },
  table: {
    reference: 'Cyfeirnod',
    status: 'Statws',
    commodity: 'Nwydd',
    origin: 'Tarddiad',
    arrival: 'Cyrraedd',
    consignor: 'Traddodwr',
    created: 'Dyddiad creu',
    submitted: 'Dyddiad cyflwyno',
    actions: 'Camau gweithredu'
  },
  sort: {
    label: 'Trefnu yn ôl',
    update: 'Diweddaru’r drefn',
    options: {
      arrivalNewest: 'Cyrraedd (mwyaf newydd i’r hynaf)',
      arrivalOldest: 'Cyrraedd (hynaf i’r mwyaf newydd)',
      createdNewest: 'Dyddiad creu (mwyaf newydd i’r hynaf)',
      createdOldest: 'Dyddiad creu (hynaf i’r mwyaf newydd)'
    }
  },
  pagination: {
    previous: 'Blaenorol',
    next: 'Nesaf',
    results: {
      none: 'Dim canlyniadau',
      one: 'Yn dangos 1 canlyniad',
      oneOf: (item, total) => `Yn dangos ${item} o ${total} o ganlyniadau`,
      many: (start, end, total) =>
        `Yn dangos ${start} i ${end} o ${total} o ganlyniadau`
    }
  },
  notSubmitted: 'Heb ei gyflwyno',
  actions: {
    view: 'Gweld',
    amend: 'Diwygio',
    resume: 'Ailddechrau',
    cancelAmend: 'Canslo diwygiad'
  },
  statusLate: 'Hwyr',
  actionHidden: (reference) => `hysbysiad ${reference}`,
  emptyText: 'Nid ydych wedi dechrau unrhyw hysbysiadau yn y sesiwn hon.'
}
