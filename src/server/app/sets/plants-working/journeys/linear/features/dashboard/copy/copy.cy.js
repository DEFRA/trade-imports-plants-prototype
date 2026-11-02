// PROVISIONAL COPY, MACHINE-DRAFT Welsh — not reviewed by a translator. The
// spec supplies the title, the start button and the four action labels; every
// other string is a machine draft awaiting the copy pass. Do not ship
// user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Gwasanaeth hysbysu mewnforio',
  guidanceLink:
    'Gwiriwch a yw eich nwyddau’n risg uchel a phryd y mae’n rhaid i chi ' +
    'hysbysu (GOV.UK)',
  startButton: '[Welsh needed] Create new',
  notificationsHeading: '[Welsh needed] Notifications',
  summary: {
    heading: '[Welsh needed] Summary',
    actionNeeded: '[Welsh needed] Action needed',
    actionNeededHint: '[Welsh needed] Tasks requiring your attention',
    viewTasks: '[Welsh needed] View tasks',
    statusUpdated: '[Welsh needed] Status updated',
    statusUpdatedHint: '[Welsh needed] Changes in the past 24 hours',
    viewUpdates: '[Welsh needed] View updates'
  },
  search: {
    label: '[Welsh needed] Search by',
    hint: '[Welsh needed] Keyword, notification number, commodity, consignee or consignor',
    button: 'Chwilio',
    noResults: 'Ni chanfuwyd unrhyw hysbysiadau'
  },
  filters: {
    show: '[Welsh needed] Additional filters',
    statusLegend: '[Welsh needed] Status',
    statuses: {
      draft: '[Welsh needed] Draft',
      submitted: '[Welsh needed] Submitted',
      amend: '[Welsh needed] Amending'
    },
    commodity: '[Welsh needed] Commodity',
    lateOnly: '[Welsh needed] Late notifications only',
    dateFrom: '[Welsh needed] Arriving from',
    dateTo: '[Welsh needed] Arriving by',
    dateHint: '[Welsh needed] For example, 27 3 2026',
    apply: '[Welsh needed] Apply filters',
    clear: '[Welsh needed] Clear filters',
    noMatches: '[Welsh needed] No notifications match your filters',
    errors: {
      invalid: '[Welsh needed] Date must be a real date',
      beforeFrom:
        '[Welsh needed] The “arriving by” date must be the same as or after the “arriving from” date'
    }
  },
  tabsLabel: '[Welsh needed] Notifications by status',
  tabs: {
    inProgress: '[Welsh needed] In progress',
    drafts: '[Welsh needed] Draft',
    completed: '[Welsh needed] Completed'
  },
  tabHeadings: {
    inProgress: '[Welsh needed] Notifications in progress',
    drafts: '[Welsh needed] Draft notifications',
    completed: '[Welsh needed] Completed notifications'
  },
  table: {
    reference: 'Cyfeirnod',
    status: '[Welsh needed] Notification status',
    commodity: 'Nwydd',
    origin: 'Tarddiad',
    arrival: '[Welsh needed] Arrival date',
    consignor: 'Traddodwr',
    created: 'Dyddiad creu',
    submitted: 'Dyddiad cyflwyno'
  },
  sort: {
    label: '[Welsh needed] Sort by:',
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
