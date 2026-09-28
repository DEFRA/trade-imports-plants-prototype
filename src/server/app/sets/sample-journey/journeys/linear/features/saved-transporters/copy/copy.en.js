export const copy = {
  list: {
    title: 'Saved transporters',
    prototypeNote:
      'This page shows a prototype-owned service working. Plants-frontend has no transporter register yet, so the transporters here are made up and kept only in this prototype.',
    search: {
      label: 'Search saved transporters',
      hint: 'Name, address or approval number',
      button: 'Search'
    },
    add: 'Add a transporter',
    resultsCaption: (shown, total) =>
      `Showing ${shown} of ${total} transporters`,
    noMatches: 'No transporters match your search.',
    table: {
      name: 'Name',
      address: 'Address',
      approvalNumber: 'Approval number',
      actionsHidden: 'Actions'
    },
    delete: 'Delete',
    pagination: {
      previous: 'Previous',
      next: 'Next'
    }
  },
  add: {
    title: 'Add a transporter',
    name: 'Name',
    transporterType: 'Type of transporter',
    types: {
      commercial: 'Commercial',
      private: 'Private'
    },
    approvalNumber: 'Approval number (optional)',
    addressLine1: 'Address line 1',
    addressLine2: 'Address line 2 (optional)',
    townOrCity: 'Town or city',
    county: 'County (optional)',
    postcode: 'Postcode (optional)',
    country: 'Country',
    countryPlaceholder: 'Choose a country',
    save: 'Save transporter',
    cancel: 'Cancel'
  },
  remove: {
    title: (name) => `Are you sure you want to delete ${name}?`,
    body: 'You will not be able to pick this transporter again.',
    confirm: 'Yes, delete it',
    cancel: 'No, go back'
  },
  errors: {
    name: 'Enter the transporter’s name',
    transporterType: 'Select the type of transporter',
    addressLine1: 'Enter address line 1',
    townOrCity: 'Enter the town or city',
    country: 'Select the country',
    tooLong: {
      approvalNumber: 'Approval number must be 100 characters or less',
      addressLine2: 'Address line 2 must be 100 characters or less',
      county: 'County must be 100 characters or less',
      postcode: 'Postcode must be 12 characters or less'
    }
  }
}
