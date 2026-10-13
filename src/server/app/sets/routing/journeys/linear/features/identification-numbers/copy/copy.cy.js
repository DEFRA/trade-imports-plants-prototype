// MACHINE-DRAFT Welsh — awaiting translation review.
export const copy = {
  title: 'Rhifau adnabod',
  fields: {
    supplierIdentificationNumber: {
      label: 'Rhif adnabod cyflenwr y planhigion',
      hint: 'Rhif cofrestru pasbort planhigion y cyflenwr. Er enghraifft, GB-12345.'
    },
    producerIdentificationNumber: {
      label: 'Rhif adnabod cynhyrchydd y tatws',
      hint: 'Rhif cofrestru’r cynhyrchydd. Er enghraifft, o’r Cynllun Dosbarthu Tatws Hadyd neu’r gofrestr genedlaethol.'
    },
    cropIdentificationNumber: {
      label: 'Rhif adnabod y cnwd',
      hint: 'Y rhif sy’n adnabod y cnwd y daeth y tatws ohono.'
    },
    consignmentNumber: {
      label: 'Rhif y llwyth (dewisol)',
      hint: 'Unrhyw gyfeirnod rydych yn ei ddefnyddio i adnabod y llwyth hwn, neu gadewch yn wag.'
    }
  },
  errors: {
    supplierIdentificationNumber: {
      maxLength:
        'Rhaid i rhif adnabod cyflenwr y planhigion fod yn 58 nod neu lai',
      required: 'Nodwch rhif adnabod cyflenwr y planhigion'
    },
    producerIdentificationNumber: {
      maxLength:
        'Rhaid i rhif adnabod cynhyrchydd y tatws fod yn 58 nod neu lai',
      required: 'Nodwch rhif adnabod cynhyrchydd y tatws'
    },
    cropIdentificationNumber: {
      maxLength: 'Rhaid i rhif adnabod y cnwd fod yn 58 nod neu lai',
      required: 'Nodwch rhif adnabod y cnwd'
    },
    consignmentNumber: {
      maxLength: 'Rhaid i rhif y llwyth fod yn 58 nod neu lai',
      pattern:
        'Rhaid i rif y llwyth gynnwys llythrennau, rhifau a thanlinellau yn unig'
    }
  }
}
