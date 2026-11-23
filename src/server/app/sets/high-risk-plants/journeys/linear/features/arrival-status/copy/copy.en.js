/**
 * The arrival-status page — whether the consignment has already arrived.
 * `statusHints.already-arrived` takes the post-arrival window in days.
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
