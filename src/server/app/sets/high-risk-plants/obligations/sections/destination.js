// Where the consignment is going, or — once it is here — where it is being
// kept. One notification-level answer for every commodity type: reg 24A(2)(c)
// asks potatoes for their intended destination and reg 26(2)(b) asks plants
// and wood for the intended destination or the current location. The matter
// owed is the same one, so it is one obligation and never a gate; which of the
// three sentences a notifier is shown is the page's business, decided from the
// arrival status.
//
// The answer is a reference to a record in the organisation's address book —
// `{ addressId }` — and never a copy of the address. The details are resolved
// on read, so an address the trader later corrects is corrected everywhere.
export const placeOfDestination = {
  id: '7eb0d717-f852-43f7-9377-c6a9c301d702',
  name: 'placeOfDestination',
  status: 'mandatory'
}
