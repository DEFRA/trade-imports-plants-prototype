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
  draft: '[Welsh needed] Draft',
  placeholder: '[Welsh needed] Placeholder',
  notice:
    '[Welsh needed] This is a placeholder. The rest of this notification is not part of this prototype yet, so you cannot fill it in or send it.',
  types: {
    'ched-a': '[Welsh needed] Live animals notification (CHED-A)',
    'ched-p': '[Welsh needed] Germinal products notification (CHED-P)',
    'ched-pp': '[Welsh needed] Plants and plant products notification (CHED-PP)'
  },
  groups: {
    consignment: '[Welsh needed] About the consignment',
    arrival: '[Welsh needed] Arrival and destination',
    parties: '[Welsh needed] Consignment parties',
    documents: '[Welsh needed] Documents',
    submit: '[Welsh needed] Check and submit'
  },
  tasks: {
    commodity: '[Welsh needed] What are you importing?',
    origin: '[Welsh needed] Where is this consignment coming from?',
    animals: '[Welsh needed] Species and number of animals',
    germinal: '[Welsh needed] Species and quantity',
    plants: '[Welsh needed] Plant details and quantity',
    arrival: '[Welsh needed] Arrival details',
    destination: '[Welsh needed] Place of destination',
    consignor: '[Welsh needed] Consignor or exporter',
    consignee: '[Welsh needed] Consignee or importer',
    healthCertificate: '[Welsh needed] Health certificate',
    phytosanitaryCertificate: '[Welsh needed] Phytosanitary certificate',
    check: '[Welsh needed] Check and submit'
  },
  statuses: {
    completed: '[Welsh needed] Completed',
    notStarted: '[Welsh needed] Not yet started',
    cannotStart: '[Welsh needed] Cannot start yet'
  },
  filledIn: (answer) => `[Welsh needed] Filled in from your answers: ${answer}`,
  commodity: (name, code) => `[Welsh needed] ${name} (${code})`,
  backToAnswers: '[Welsh needed] Back to what you told us',
  returnToDashboard: '[Welsh needed] Return to dashboard'
}
