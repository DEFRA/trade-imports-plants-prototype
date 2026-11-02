// PROVISIONAL COPY — awaiting the copy pass. The spec marks this page
// provisionalCopy: true, so every string here is a draft the content designer
// has still to settle.
export const copy = {
  title: 'Import notification service',
  // The sentence renders only when the view model supplies a guidance URL.
  // No URL exists yet, so the link text waits here for one rather than
  // rendering a '#' href.
  guidanceLink:
    'Check whether your goods are high-risk and when you must notify (GOV.UK)',
  startButton: 'Create new',
  notificationsHeading: 'Notifications',
  summary: {
    heading: 'Summary',
    actionNeeded: 'Action needed',
    actionNeededHint: 'Tasks requiring your attention',
    viewTasks: 'View tasks',
    statusUpdated: 'Status updated',
    statusUpdatedHint: 'Changes in the past 24 hours',
    viewUpdates: 'View updates'
  },
  search: {
    label: 'Search by',
    hint: 'Keyword, notification number, commodity, consignee or consignor',
    button: 'Search',
    noResults: 'No notifications found'
  },
  filters: {
    show: 'Additional filters',
    statusLegend: 'Status',
    statuses: { draft: 'Draft', submitted: 'Submitted', amend: 'Amending' },
    commodity: 'Commodity',
    lateOnly: 'Late notifications only',
    dateFrom: 'Arriving from',
    dateTo: 'Arriving by',
    dateHint: 'For example, 27 3 2026',
    apply: 'Apply filters',
    clear: 'Clear filters',
    noMatches: 'No notifications match your filters',
    errors: {
      invalid: 'Date must be a real date',
      beforeFrom:
        'The “arriving by” date must be the same as or after the “arriving from” date'
    }
  },
  tabsLabel: 'Notifications by status',
  tabs: {
    inProgress: 'In progress',
    drafts: 'Draft',
    completed: 'Completed'
  },
  tabHeadings: {
    inProgress: 'Notifications in progress',
    drafts: 'Draft notifications',
    completed: 'Completed notifications'
  },
  table: {
    reference: 'Reference',
    status: 'Notification status',
    commodity: 'Commodity',
    origin: 'Origin',
    arrival: 'Arrival date',
    consignor: 'Consignor',
    created: 'Date created',
    submitted: 'Date submitted'
  },
  sort: {
    label: 'Sort by:',
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
