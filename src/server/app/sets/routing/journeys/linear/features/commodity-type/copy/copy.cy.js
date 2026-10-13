// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
// AWAITING THE COPY PASS — the English behind these strings is provisional
// (journey-spec.json pages[commodity-type].provisionalCopy). `title` and
// `legend` are the live-animals string for the identical English sentence
// (live-animals features/hub/copy/copy.cy.js rows.commodities.title); the
// hint, the option labels, the option hints and the error have no service
// counterpart and are machine-draft.
export const copy = {
  title: 'Beth ydych chi’n ei fewnforio?',
  legend: 'Beth ydych chi’n ei fewnforio?',
  hint: 'Dewiswch y math o nwyddau y mae’r hysbysiad hwn ar eu cyfer. Hysbyswch am datws, planhigion i’w plannu a phren mewn hysbysiadau ar wahân.',
  linesWarning:
    'Bydd newid eich ateb yn dileu’r nwyddau rydych eisoes wedi’u hychwanegu.',
  linesWarningIcon: 'Rhybudd',
  typeLabels: {
    potatoes: 'Tatws (hadyd neu fwyd)',
    'plants-for-planting': 'Planhigion i’w plannu',
    'wood-and-cut-trees': 'Pren a choed wedi’u torri'
  },
  typeHints: {
    potatoes: (days) =>
      `Rhaid i chi hysbysu o leiaf ${days} diwrnod cyn y dyddiad cyrraedd disgwyliedig.`,
    'plants-for-planting': (days) =>
      `Rhaid i chi hysbysu cyn cyrraedd, neu heb fod yn hwyrach na ${days} diwrnod ar ôl y dyddiad cyrraedd.`,
    'wood-and-cut-trees': (days) =>
      `Rhaid i chi hysbysu cyn cyrraedd, neu heb fod yn hwyrach na ${days} diwrnod ar ôl y dyddiad cyrraedd.`
  },
  errors: {
    commodityType: 'Dewiswch beth rydych chi’n ei fewnforio'
  }
}
