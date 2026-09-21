// Provisional copy from journey-spec.json.
export const copy = {
  title: 'Identification numbers',
  fields: {
    supplierIdentificationNumber: {
      label: 'Identification number of the supplier of the plants',
      hint: "The supplier's plant passport registration number. For example, GB-12345."
    },
    producerIdentificationNumber: {
      label: 'Identification number of the producer of the potatoes',
      hint: "The producer's registration number. For example, from the Seed Potato Classification Scheme or the national register."
    },
    cropIdentificationNumber: {
      label: 'Crop identification number',
      hint: 'The number that identifies the crop the potatoes came from.'
    },
    consignmentNumber: {
      label: 'Consignment number (optional)',
      hint: 'Any reference you use to identify this consignment, or leave blank.'
    }
  },
  errors: {
    supplierIdentificationNumber: {
      required: 'Enter the identification number of the supplier',
      maxLength: 'Supplier identification number must be 58 characters or less'
    },
    producerIdentificationNumber: {
      required: 'Enter the identification number of the producer',
      maxLength: 'Producer identification number must be 58 characters or less'
    },
    cropIdentificationNumber: {
      required: 'Enter the crop identification number',
      maxLength: 'Crop identification number must be 58 characters or less'
    },
    consignmentNumber: {
      maxLength: 'Consignment number must be 58 characters or less',
      pattern:
        'Consignment number must only contain letters, numbers and underscores'
    }
  }
}
