/**
 * The example notifications the high-risk-plants set starts with, and gets back
 * after Reset.
 *
 * Each one is made by replaying the real pages with a fixture from the set's
 * happy path (`journeys/linear/flow/fixtures/happy-path.json`), so it always
 * looks exactly like a notification a trader made. The grammar is described in
 * `../grammar.js` and in docs/designers/example-data.md.
 *
 * `slug` is the example's stable id: its example link keeps working after the
 * prototype restarts, even though the reference number changes. Never rename a
 * slug someone may have shared.
 */
export const examples = [
  {
    label: 'Draft, just started',
    slug: 'draft-just-started',
    fixture: 'warePotatoes',
    through: 'commodities/details'
  },
  {
    label: 'Draft, part way through',
    slug: 'draft-midway',
    fixture: 'plantsForPlanting',
    through: 'destinations/select'
  },
  {
    label: 'Submitted',
    slug: 'submitted',
    fixture: 'seedPotatoes',
    submit: true
  },
  {
    label: 'Submitted, then amended',
    slug: 'amended',
    fixture: 'woodWithoutBark',
    submit: true,
    amend: true
  },
  {
    label: 'Submitted late (the potatoes arrived yesterday)',
    slug: 'submitted-late',
    fixture: 'warePotatoesLate',
    submit: true
  },
  {
    label: 'Amendment started, then cancelled',
    slug: 'amendment-cancelled',
    fixture: 'woodWithoutBark',
    submit: true,
    amend: true,
    cancelAmend: true
  },
  {
    label:
      'A new draft copied from the submitted example, arriving at Felixstowe',
    slug: 'copied',
    copy: 'submitted',
    answers: {
      'arrival-details': { proposedPlaceOfLanding: 'GB FXT' }
    }
  },
  {
    label: 'Deleted draft',
    slug: 'deleted',
    fixture: 'warePotatoes',
    delete: true
  },
  {
    label: 'Another organisation’s submitted notification',
    slug: 'another-organisation',
    fixture: 'seedPotatoes',
    submit: true,
    organisationId: 'example-organisation-b',
    answers: {
      'identification-numbers': { producerIdentificationNumber: 'P999' }
    }
  }
]
