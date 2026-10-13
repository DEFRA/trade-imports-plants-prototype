// Provisional plants copy pending content review.
export const copy = {
  title: 'Notification submitted',
  reference: 'Your notification reference',
  body: 'Your notification has been submitted. Keep the reference for your records.',
  dateOfNotification: 'Date of notification:',
  // Ruled c-030/c-035: the same rule strings and banner heading as the
  // submitted check-answers view, reading the stored lateNotificationIndicator.
  late: {
    title: 'Important',
    heading: 'Your notification was made outside the required timing',
    accepted: 'It has still been accepted and recorded.',
    potatoes: (days) =>
      `Notifications for potatoes must be made at least ${days} days before the expected date of arrival.`,
    plantsAndWood: (days) =>
      `Notifications for plants for planting and wood must be made no later than ${days} days after the date of arrival.`
  },
  viewNotification: 'View your notification',
  returnToDashboard: 'Return to dashboard'
}
