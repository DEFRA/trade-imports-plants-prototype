// PROVISIONAL COPY — a first draft for a design experiment. The task names
// are a sketch of what each notification asks, not its agreed content.

/**
 * A placeholder for a notification this prototype does not hold: its overview
 * page, showing the routing answers already filled in and the tasks still to
 * do.
 *
 * `types`, `groups` and `tasks` are keyed by values the controller holds.
 */
export const copy = {
  draft: 'Draft',
  placeholder: 'Placeholder',
  notice:
    'This is a placeholder. The rest of this notification is not part of this prototype yet, so you cannot fill it in or send it.',
  types: {
    'ched-a': 'Live animals notification (CHED-A)',
    'ched-p': 'Germinal products notification (CHED-P)',
    'ched-pp': 'Plants and plant products notification (CHED-PP)'
  },
  groups: {
    consignment: 'About the consignment',
    arrival: 'Arrival and destination',
    parties: 'Consignment parties',
    documents: 'Documents',
    submit: 'Check and submit'
  },
  tasks: {
    commodity: 'What are you importing?',
    origin: 'Where is this consignment coming from?',
    animals: 'Species and number of animals',
    germinal: 'Species and quantity',
    plants: 'Plant details and quantity',
    arrival: 'Arrival details',
    destination: 'Place of destination',
    consignor: 'Consignor or exporter',
    consignee: 'Consignee or importer',
    healthCertificate: 'Health certificate',
    phytosanitaryCertificate: 'Phytosanitary certificate',
    check: 'Check and submit'
  },
  statuses: {
    completed: 'Completed',
    notStarted: 'Not yet started',
    cannotStart: 'Cannot start yet'
  },
  filledIn: (answer) => `Filled in from your answers: ${answer}`,
  commodity: (name, code) => `${name} (${code})`,
  backToAnswers: 'Back to what you told us',
  returnToDashboard: 'Return to dashboard'
}
