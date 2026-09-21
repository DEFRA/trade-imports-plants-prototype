// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
// AWAITING THE COPY PASS — the English behind these strings is provisional
// (journey-spec.json pages[arrival-status].provisionalCopy). No source gives a
// Welsh sentence for any leaf here, so every one is machine-draft. "Prydain
// Fawr" is the Welsh for Great Britain: the proper noun is translated, so the
// heading is not an identical pair.
export const copy = {
  title: 'Ydy’r llwyth wedi cyrraedd Prydain Fawr?',
  legend: 'Ydy’r llwyth wedi cyrraedd Prydain Fawr?',
  statusLabels: {
    'already-arrived': 'Ydy, mae wedi cyrraedd yn barod',
    'not-yet-arrived': 'Nac ydy, nid yw wedi cyrraedd eto'
  },
  statusHints: {
    'already-arrived': (days) =>
      `Rydych yn gwneud hysbysiad ar ôl cyrraedd. Rhaid ei wneud heb fod yn hwyrach na ${days} diwrnod ar ôl y dyddiad cyrraedd. Byddwch yn rhoi’r dyddiad y cyrhaeddodd a ble mae nawr.`,
    'not-yet-arrived':
      'Rydych yn gwneud hysbysiad cyn cyrraedd. Byddwch yn rhoi’r dyddiad glanio disgwyliedig a’r cyrchfan arfaethedig.'
  },
  errors: {
    arrivalStatus: 'Dewiswch a yw’r llwyth wedi cyrraedd'
  }
}
