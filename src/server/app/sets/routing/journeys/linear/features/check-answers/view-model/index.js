import { collectionView } from '../../../../../../../engine/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as countries from '../../../../../../../services/countries/index.js'
import * as ports from '../../../../../../../services/ports/index.js'
import { lineFieldsFor } from '../../../../../services/commodities/index.js'
import { detailsHref } from '../../commodities/links.js'
import { addressText } from '../../address-book-picker/address-lines.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { row, readOnlyRow } from './rows/summary-row.js'
import { changeAction, editableActions } from './rows/change-link.js'
import { dateText } from './rows/value-text.js'
import { copy as arrivalEn } from '../../arrival-details/copy/copy.en.js'
import { copy as arrivalCy } from '../../arrival-details/copy/copy.cy.js'
import { copy as destinationEn } from '../../place-of-destination/copy/copy.en.js'
import { copy as destinationCy } from '../../place-of-destination/copy/copy.cy.js'
import { POTATO_ARRIVAL } from '../../arrival-details/fields.js'
import {
  ALREADY_ARRIVED,
  ARRIVAL_STATUS,
  NOT_YET_ARRIVED
} from '../../arrival-status/statuses.js'

const copy = copyFor({ en, cy })
const arrivalCopy = copyFor({ en: arrivalEn, cy: arrivalCy })
const destinationCopy = copyFor({ en: destinationEn, cy: destinationCy })

/**
 * Potatoes are never asked whether the consignment has arrived, so no arrival
 * status in scope selects the potato state. An unanswered status selects the
 * pre-arrival state for both the date label and destination heading.
 */
const arrivalStateOf = (answers, scope) => {
  if (!scope.has(ARRIVAL_STATUS)) {
    return POTATO_ARRIVAL
  }
  return answers[ARRIVAL_STATUS] === ALREADY_ARRIVED
    ? ALREADY_ARRIVED
    : NOT_YET_ARRIVED
}

const IDENTIFIERS = [
  'supplierIdentificationNumber',
  'producerIdentificationNumber',
  'cropIdentificationNumber',
  'consignmentNumber'
]

const partyCard = (field, title, party, journeyId, readOnly) => ({
  title,
  ...editableActions(readOnly, changeAction(journeyId, field, title)),
  rows: [
    readOnlyRow(copy.labels.name, party?.name),
    readOnlyRow(
      copy.labels.address,
      party &&
        [addressText(party.address), party.address?.country]
          .filter(Boolean)
          .join(', ')
    ),
    readOnlyRow(copy.labels.telephoneNumber, party?.address?.telephoneNumber),
    readOnlyRow(copy.labels.emailAddress, party?.address?.emailAddress)
  ]
})

const commodityCards = (answers, evaluation, journeyId, readOnly) =>
  collectionView(answers, ['commodityLines'], evaluation).map(
    ({ index, entry }) => {
      const title = `${copy.cards.commodity} ${index + 1}`
      const actions = changeAction(journeyId, 'commodityLines', title)
      actions.items[0].href = detailsHref(
        { params: { journeyId }, query: { change: '1' } },
        { index }
      )
      return {
        title,
        ...editableActions(readOnly, actions),
        rows: [
          readOnlyRow(
            copy.labels.category,
            copy.categoryLabels[entry.category]
          ),
          ...lineFieldsFor(entry.category).map((field) =>
            readOnlyRow(
              copy.labels[field],
              field === 'genus' ? copy.genusLabels[entry[field]] : entry[field]
            )
          )
        ]
      }
    }
  )

/**
 * Everything a section builder needs: the journey's answers and scope, the
 * identifiers the change links are built from, and the two row helpers that
 * close over them. Assembled once by `buildSections` and passed to each
 * section so the builders stay small and independently readable.
 */
const sectionContext = async (
  { journey, answers, scope, evaluation },
  parties,
  readOnly
) => {
  const journeyId = journey.journeyId
  const answerRow = (field, value = answers[field]) =>
    row(journeyId, readOnly, copy.labels[field], value, field)
  // Pre-resolve the reference-data-backed labels so the section builders can
  // stay synchronous. The readers self-load; buildSections is the natural
  // await point since it is already the async gateway to check-answers.
  const originCountryLabel = await countries.originLabel(
    answers.countryOfOrigin
  )
  const proposedPlaceOfLandingLabel = scope.has('proposedPlaceOfLanding')
    ? await ports.label(answers.proposedPlaceOfLanding)
    : undefined
  return {
    answers,
    scope,
    evaluation,
    parties,
    journeyId,
    readOnly,
    arrivalState: arrivalStateOf(answers, scope),
    originCountryLabel,
    proposedPlaceOfLandingLabel,
    answerRow,
    scopedRows: (fields) =>
      fields
        .filter((field) => scope.has(field))
        .map((field) => answerRow(field))
  }
}

const consignmentSection = ({
  answers,
  evaluation,
  journeyId,
  readOnly,
  answerRow,
  originCountryLabel
}) => ({
  heading: copy.sections.consignment,
  cards: [
    {
      title: copy.cards.import,
      rows: [
        answerRow('commodityType', copy.typeLabels[answers.commodityType]),
        answerRow('countryOfOrigin', originCountryLabel)
      ]
    },
    ...commodityCards(answers, evaluation, journeyId, readOnly)
  ]
})

const arrivalRows = ({
  answers,
  scope,
  arrivalState,
  journeyId,
  readOnly,
  answerRow,
  scopedRows,
  proposedPlaceOfLandingLabel
}) => [
  ...(scope.has('arrivalStatus')
    ? [answerRow('arrivalStatus', copy.statusLabels[answers.arrivalStatus])]
    : []),
  row(
    journeyId,
    readOnly,
    arrivalCopy.dateLabels[arrivalState],
    dateText(answers.arrivalDate),
    'arrivalDate'
  ),
  ...scopedRows(['arrivalTime']),
  ...(scope.has('proposedPlaceOfLanding')
    ? [answerRow('proposedPlaceOfLanding', proposedPlaceOfLandingLabel)]
    : [])
]

const arrivalSection = (context) => {
  const { arrivalState, parties, journeyId, readOnly } = context
  return {
    heading: copy.sections.arrival,
    cards: [
      { title: copy.cards.arrival, rows: arrivalRows(context) },
      partyCard(
        'placeOfDestination',
        destinationCopy.headings[arrivalState],
        parties.placeOfDestination,
        journeyId,
        readOnly
      )
    ]
  }
}

const partiesSection = ({
  scope,
  parties,
  journeyId,
  readOnly,
  scopedRows
}) => ({
  heading: copy.sections.parties,
  cards: [
    ...(scope.has('consignor')
      ? [
          partyCard(
            'consignor',
            copy.cards.consignor,
            parties.consignor,
            journeyId,
            readOnly
          )
        ]
      : []),
    { title: copy.cards.identification, rows: scopedRows(IDENTIFIERS) },
    partyCard(
      'contactAddress',
      copy.cards.contact,
      parties.contactAddress,
      journeyId,
      readOnly
    )
  ]
})

export const buildSections = async (journeyState, parties, readOnly) => {
  const context = await sectionContext(journeyState, parties, readOnly)
  return [
    consignmentSection(context),
    arrivalSection(context),
    partiesSection(context)
  ]
}
