// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
// AWAITING THE COPY PASS — the English behind these strings is provisional
// (journey-spec.json pages[arrival-details].provisionalCopy). Two strings have
// a source: `title` from pages[arrival-details].titleCy, and
// `placeOfLanding.noResults`, the live-animals string for the identical English
// (live-animals features/transport/copy/copy.cy.js) — both carried over from
// the animals port-of-entry page. "Prydain Fawr" is the Welsh for Great
// Britain: the proper noun is translated, so those pairs are not identical.
export const copy = {
  title: 'Manylion cyrraedd',
  dateLabels: {
    potatoes: 'Dyddiad cyrraedd disgwyliedig',
    'not-yet-arrived': 'Dyddiad glanio disgwyliedig ym Mhrydain Fawr',
    'already-arrived': 'Y dyddiad y cyrhaeddodd y llwyth Brydain Fawr gyntaf'
  },
  dateHints: {
    potatoes:
      'Er enghraifft, 27/3/2026. Os yw’r tatws wedi cyrraedd yn barod, rhowch y dyddiad y cyrhaeddon nhw.',
    'not-yet-arrived': 'Er enghraifft, 27/3/2026',
    'already-arrived': 'Er enghraifft, 27/3/2026'
  },
  time: {
    label: 'Amser cyrraedd disgwyliedig',
    hint: 'Defnyddiwch y cloc 24 awr. Er enghraifft, 14:30.'
  },
  placeOfLanding: {
    label: 'Man glanio arfaethedig',
    hint: 'Lle bydd y tatws yn dod i mewn i Brydain Fawr. Dechreuwch deipio i chwilio yn ôl enw neu god y porthladd.',
    placeholder: 'Dewiswch fan glanio',
    noResults: 'Dim porthladdoedd wedi’u darganfod'
  },
  errors: {
    arrivalDate: {
      required: 'Rhowch y dyddiad cyrraedd',
      invalid: 'Rhowch ddyddiad cyrraedd go iawn',
      inFuture: 'Ni all y dyddiad y cyrhaeddodd y llwyth fod yn y dyfodol'
    },
    arrivalTime: 'Rhowch yr amser cyrraedd disgwyliedig',
    proposedPlaceOfLanding: 'Dewiswch y man glanio arfaethedig'
  }
}
