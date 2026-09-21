// Native mapper from canonical UUID-keyed fulfilment to the backend
// notification body.
//
// The plants backend's `NotificationDto` carries no typed content fields —
// the whole engine state round-trips through the opaque `fulfilments`
// payload alongside it — so the projection is the envelope reference and
// nothing else. Every content field gets a home here as it is agreed, read
// off the fulfilment through `bridge/read-fulfilment.js`.

export const fulfilmentToNotification = (_fulfilment, referenceNumber) => ({
  referenceNumber
})
