export const copy = {
  title: 'Import notification service',
  body:
    'Use this service to tell the plant health authorities about high-risk ' +
    'plants for planting, potatoes, or wood and cut trees you are importing ' +
    'from EU member states, as required by the Plant Health National ' +
    'Notification Scheme. You will answer a short set of questions about the ' +
    'consignment, then submit your notification.',
  guidanceLink:
    'Check whether your goods are high-risk and when you must notify (GOV.UK)',
  startButton: 'Start a new notification',
  notificationsHeading: 'Your notifications',
  search: {
    heading: 'Filter notifications',
    label: 'Keyword or reference',
    button: 'Search',
    noResults: 'No notifications found'
  },
  table: {
    reference: 'Reference',
    status: 'Status',
    commodity: 'Commodity',
    origin: 'Origin',
    arrival: 'Arrival',
    consignor: 'Consignor',
    created: 'Date created',
    submitted: 'Date submitted',
    actions: 'Actions'
  },
  sort: {
    label: 'Sort by',
    update: 'Update sort',
    options: {
      arrivalNewest: 'Arrival (newest to oldest)',
      arrivalOldest: 'Arrival (oldest to newest)',
      createdNewest: 'Date created (newest to oldest)',
      createdOldest: 'Date created (oldest to newest)'
    }
  },
  pagination: {
    previous: 'Previous',
    next: 'Next',
    results: {
      none: 'No Results',
      one: 'Showing 1 Result',
      oneOf: (item, total) => `Showing ${item} of ${total} Results`,
      many: (start, end, total) =>
        `Showing ${start} to ${end} of ${total} Results`
    }
  },
  notSubmitted: 'Not submitted',
  actions: {
    view: 'View',
    amend: 'Amend',
    resume: 'Resume',
    cancelAmend: 'Cancel amendment'
  },
  amendRefused: {
    title: 'Important',
    body: 'This notification could not be amended.'
  },
  statusLate: 'Late',
  actionHidden: (reference) => `notification ${reference}`,
  emptyText: 'You have not started any notifications in this session.'
}
