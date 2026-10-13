// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
// AWAITING THE COPY PASS — the English behind the headings and the
// descriptions is provisional (journey-spec.json
// pages[place-of-destination].provisionalCopy). `title` is the spec's own
// Welsh (pages[place-of-destination].titleCy). Everything from `search` down —
// the picker chrome — is the live-animals party-picker Welsh for the identical
// English (live-animals features/addresses/copy/copy.cy.js, the `picker.*`
// block), and is machine-draft there too — apart from `pagination`, which the
// animals picker has no counterpart for and which is the dashboard's own Welsh
// (features/dashboard/copy/copy.cy.js). The pre-arrival headings are `title`,
// so the page is called what the hub task row that leads to it is called.
// "ble mae nawr" in the already-arrived heading and "cyrchfan arfaethedig" in
// the already-arrived description are reused from the sibling
// arrival-status/copy/copy.cy.js so the pair of pages stays consistent —
// machine-draft there too. The already-arrived heading and the descriptions
// are machine-draft.
const PAGE_NAME = 'Man cyrchfan'

export const copy = {
  title: PAGE_NAME,
  headings: {
    potatoes: PAGE_NAME,
    'not-yet-arrived': PAGE_NAME,
    'already-arrived': 'Ble mae’r llwyth nawr?'
  },
  descriptions: {
    potatoes:
      'Lle bydd y nwyddau’n cael eu cadw ar ôl cyrraedd. Dyma lle gallai arolygydd iechyd planhigion gynnal archwiliad ar hap.',
    'not-yet-arrived':
      'Lle bydd y nwyddau’n cael eu cadw ar ôl cyrraedd. Dyma lle gallai arolygydd iechyd planhigion gynnal archwiliad ar hap.',
    'already-arrived':
      'Rhowch y cyfeiriad lle mae’r llwyth yn cael ei gadw. Os yw’n dal ar ei ffordd i’w gyrchfan arfaethedig, rhowch y gyrchfan honno. Gallai arolygydd iechyd planhigion gynnal archwiliad ar hap yma.'
  },
  search: {
    label: 'Chwilio',
    hint: 'Enw, cyfeiriad neu wlad',
    button: 'Chwilio'
  },
  selectedAddressPrefix: 'Cyfeiriad a ddewiswyd:',
  errorPrefix: 'Gwall:',
  noMatches: 'Nid oes unrhyw gyfeiriadau’n cyfateb i’ch chwiliad.',
  resultsCaption: (shown, total) => `Yn dangos ${shown} o ${total} cyfeiriad`,
  pagination: {
    previous: 'Blaenorol',
    next: 'Nesaf'
  },
  table: {
    selectHidden: 'Dewis',
    name: 'Enw',
    address: 'Cyfeiriad',
    country: 'Gwlad',
    actionsHidden: 'Camau gweithredu'
  },
  selectRowPrefix: 'Dewis',
  viewDetails: 'Gweld manylion',
  viewDetailsFor: 'ar gyfer',
  errors: {
    placeOfDestination: 'Dewiswch fan cyrchfan o’r rhestr'
  }
}
