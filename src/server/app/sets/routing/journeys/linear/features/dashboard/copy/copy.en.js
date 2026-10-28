// PROVISIONAL COPY — awaiting the copy pass. The spec marks this page
// provisionalCopy: true, so every string here is a draft the content designer
// has still to settle.
export const copy = {
  title: 'Import notification service',
  body: 'Use this service to tell the authorities about plants, live animals and germinal products you are importing. Tell us what you are importing and we will find the right notification for you, then fill in what you have already told us.',
  // The sentence renders only when the view model supplies a guidance URL.
  // No URL exists yet, so the link text waits here for one rather than
  // rendering a '#' href.
  guidanceLink:
    'Check whether your goods are high-risk and when you must notify (GOV.UK)',
  startButton: 'Start a new notification',
  directStart: {
    body: 'High-risk plants only: if you already know this is the notification you need, you can skip the questions.',
    button: 'Skip the questions and start a high-risk plants notification'
  },
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
  statusLate: 'Late',
  actionHidden: (reference) => `notification ${reference}`,
  emptyText: 'You have not started any notifications in this session.'
}
