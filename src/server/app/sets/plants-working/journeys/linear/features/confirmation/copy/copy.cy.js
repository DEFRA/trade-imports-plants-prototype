// MACHINE-DRAFT Welsh — not reviewed by a translator.
export const copy = {
  title: 'Hysbysiad wedi’i gyflwyno',
  reference: 'Cyfeirnod eich hysbysiad',
  body: 'Mae eich hysbysiad wedi’i gyflwyno. Cadwch y cyfeirnod ar gyfer eich cofnodion.',
  dateOfNotification: 'Dyddiad yr hysbysiad:',
  late: {
    title: 'Pwysig',
    heading: 'Gwnaed eich hysbysiad y tu allan i’r amser gofynnol',
    accepted: 'Mae wedi cael ei dderbyn a’i gofnodi o hyd.',
    potatoes: (days) =>
      `Rhaid gwneud hysbysiadau am datws o leiaf ${days} diwrnod cyn y dyddiad cyrraedd disgwyliedig.`,
    plantsAndWood: (days) =>
      `Rhaid gwneud hysbysiadau am blanhigion i’w plannu a phren heb fod yn hwyrach na ${days} diwrnod ar ôl y dyddiad cyrraedd.`
  },
  viewNotification: 'Gweld eich hysbysiad',
  returnToDashboard: 'Dychwelyd i’r dangosfwrdd'
}
