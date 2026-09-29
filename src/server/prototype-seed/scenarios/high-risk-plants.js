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
 *
 * Each example is also a story in the walkthrough report: `label` is its name
 * and `story` says why it is there.
 */
export const examples = [
  {
    label: 'Draft, just started',
    slug: 'draft-just-started',
    fixture: 'warePotatoes',
    through: 'commodities/details',
    story:
      'A trader has started a notification for ware potatoes and left it after the first question.'
  },
  {
    label: 'Draft, part way through',
    slug: 'draft-midway',
    fixture: 'plantsForPlanting',
    through: 'destinations/select',
    featured: 2,
    headline: 'Save a notification and come back to it later',
    story:
      'A trader bringing in plants for planting answers about half the questions, leaves, and finds the draft waiting on their dashboard.'
  },
  {
    label: 'Submitted',
    slug: 'submitted',
    fixture: 'seedPotatoes',
    submit: true,
    featured: 1,
    headline: 'Send a notification from start to finish',
    story:
      'A trader bringing in seed potatoes answers every question, checks their answers and sends the notification.'
  },
  {
    label: 'Submitted, then amended',
    slug: 'amended',
    fixture: 'woodWithoutBark',
    submit: true,
    amend: true,
    featured: 3,
    headline: 'Change a notification after sending it',
    story:
      'A trader sends a notification for wood without bark, then starts to change it.'
  },
  {
    label: 'Submitted late (the potatoes arrived yesterday)',
    slug: 'submitted-late',
    fixture: 'warePotatoesLate',
    submit: true,
    story:
      'A trader whose potatoes arrived yesterday sends the notification late, so the dashboard shows it as late.'
  },
  {
    label: 'Amendment started, then cancelled',
    slug: 'amendment-cancelled',
    fixture: 'woodWithoutBark',
    submit: true,
    amend: true,
    cancelAmend: true,
    story:
      'A trader starts to change a notification they sent, then changes their mind and keeps the one they sent.'
  },
  {
    label:
      'A new draft copied from the submitted example, arriving at Felixstowe',
    slug: 'copied',
    copy: 'submitted',
    answers: {
      'arrival-details': { proposedPlaceOfLanding: 'GB FXT' }
    },
    featured: 4,
    headline: 'Start a new notification from an earlier one',
    story:
      'A trader reuses the answers from an earlier notification, with the goods arriving at Felixstowe instead.'
  },
  {
    label: 'Deleted draft',
    slug: 'deleted',
    fixture: 'warePotatoes',
    delete: true,
    story: 'A trader answers every question, then deletes the draft.'
  },
  {
    label: 'Another organisation’s submitted notification',
    slug: 'another-organisation',
    fixture: 'seedPotatoes',
    submit: true,
    organisationId: 'example-organisation-b',
    answers: {
      'identification-numbers': { producerIdentificationNumber: 'P999' }
    },
    story:
      'A notification sent by a different organisation. People signed in to other organisations never see it.'
  }
]
