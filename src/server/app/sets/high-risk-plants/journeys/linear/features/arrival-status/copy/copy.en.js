// AWAITING THE COPY PASS — the strings below are the journey spec's verbatim
// wording and have not been through a content review
// (journey-spec.json pages[arrival-status].provisionalCopy, decisions.json d-001).

/**
 * The arrival-status page — whether the consignment has already arrived.
 *
 * `statusHints.already-arrived` is a function rather than a string because it
 * quotes the post-arrival notification window in days. The controller passes
 * the constant from `features/timing-windows.js`, so the number is written
 * once and this bundle only says where it appears in the sentence. The
 * pre-arrival hint quotes no window and is a plain string.
 */
export const copy = {
  title: 'Has the consignment arrived in Great Britain?',
  legend: 'Has the consignment arrived in Great Britain?',
  statusLabels: {
    'already-arrived': 'Yes, it has already arrived',
    'not-yet-arrived': 'No, it has not arrived yet'
  },
  statusHints: {
    'already-arrived': (days) =>
      `You are making a post-arrival notification. It must be made no later than ${days} days after the date of arrival. You will give the date it arrived and where it is now.`,
    'not-yet-arrived':
      'You are making a pre-arrival notification. You will give the expected date of landing and the intended destination.'
  },
  errors: {
    arrivalStatus: 'Select whether the consignment has arrived'
  }
}
