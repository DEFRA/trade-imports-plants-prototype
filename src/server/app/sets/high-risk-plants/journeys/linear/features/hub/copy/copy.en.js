/**
 * The overview hub — the navigation root of a notification.
 *
 * `groups` holds one caption per numbered task-list group; `rows` holds the
 * title and hint of each task row, and each section's first page increment
 * adds its own row here.
 */
export const copy = {
  title: 'Overview',
  returnToDashboard: 'Return to dashboard',
  statuses: {
    completed: 'Completed',
    optional: 'Optional',
    inProgress: 'In progress',
    notYetStarted: 'Not yet started',
    cannotStartYet: 'Cannot start yet'
  },
  // AWAITING THE COPY PASS — 'Arrival and destination' and 'Consignment
  // parties' are new hub strings with no source behind them (journey-spec.json
  // pages[hub].provisionalCopy, decisions.json d-069).
  groups: {
    'about-the-consignment': '1. About the consignment',
    'arrival-and-destination': '2. Arrival and destination',
    'consignment-parties': '3. Consignment parties',
    'check-and-submit': '4. Check and submit'
  },
  rows: {
    review: { title: 'Check and submit' },
    contact: { title: 'Contact address for consignment' },
    identificationNumbers: { title: 'Identification numbers' },
    consignor: { title: 'Consignor or exporter' },
    commodities: { title: 'What are you importing?' },
    origin: { title: 'Where is this consignment coming from?' },
    arrival: { title: 'Arrival details' },
    destination: { title: 'Place of destination' }
  }
}
