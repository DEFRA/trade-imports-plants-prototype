// Welsh not yet written: every string carries the [Welsh needed] marker until
// a translator supplies it.
export const copy = {
  list: {
    title: '[Welsh needed] Saved transporters',
    prototypeNote:
      '[Welsh needed] This page shows a prototype-owned service working. Plants-frontend has no transporter register yet, so the transporters here are made up and kept only in this prototype.',
    search: {
      label: '[Welsh needed] Search saved transporters',
      hint: '[Welsh needed] Name, address or approval number',
      button: '[Welsh needed] Search'
    },
    add: '[Welsh needed] Add a transporter',
    resultsCaption: (shown, total) =>
      `[Welsh needed] Showing ${shown} of ${total} transporters`,
    noMatches: '[Welsh needed] No transporters match your search.',
    table: {
      name: '[Welsh needed] Name',
      address: '[Welsh needed] Address',
      approvalNumber: '[Welsh needed] Approval number',
      actionsHidden: '[Welsh needed] Actions'
    },
    delete: '[Welsh needed] Delete',
    pagination: {
      previous: '[Welsh needed] Previous',
      next: '[Welsh needed] Next'
    }
  },
  add: {
    title: '[Welsh needed] Add a transporter',
    name: '[Welsh needed] Name',
    transporterType: '[Welsh needed] Type of transporter',
    types: {
      commercial: '[Welsh needed] Commercial',
      private: '[Welsh needed] Private'
    },
    approvalNumber: '[Welsh needed] Approval number (optional)',
    addressLine1: '[Welsh needed] Address line 1',
    addressLine2: '[Welsh needed] Address line 2 (optional)',
    townOrCity: '[Welsh needed] Town or city',
    county: '[Welsh needed] County (optional)',
    postcode: '[Welsh needed] Postcode (optional)',
    country: '[Welsh needed] Country',
    countryPlaceholder: '[Welsh needed] Choose a country',
    save: '[Welsh needed] Save transporter',
    cancel: '[Welsh needed] Cancel'
  },
  remove: {
    title: (name) => `[Welsh needed] Are you sure you want to delete ${name}?`,
    body: '[Welsh needed] You will not be able to pick this transporter again.',
    confirm: '[Welsh needed] Yes, delete it',
    cancel: '[Welsh needed] No, go back'
  },
  errors: {
    name: '[Welsh needed] Enter the transporter’s name',
    transporterType: '[Welsh needed] Select the type of transporter',
    addressLine1: '[Welsh needed] Enter address line 1',
    townOrCity: '[Welsh needed] Enter the town or city',
    country: '[Welsh needed] Select the country',
    tooLong: {
      approvalNumber:
        '[Welsh needed] Approval number must be 100 characters or less',
      addressLine2:
        '[Welsh needed] Address line 2 must be 100 characters or less',
      county: '[Welsh needed] County must be 100 characters or less',
      postcode: '[Welsh needed] Postcode must be 12 characters or less'
    }
  }
}
