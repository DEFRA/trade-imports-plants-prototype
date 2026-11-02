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
import { errorRow } from './rows/error-row.js'
import { changeAction, editableActions } from './rows/change-link.js'
import { dateText } from './rows/value-text.js'
import { anchorOf } from './incomplete-cards.js'
import { CYA_SLUG } from '../../../../../../../shared/kit.js'
import { partyOf } from '../../../parties/index.js'
import { partyEditHref } from '../../party-edit/edit-href.js'
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

const partyActions = (field, title, partyDisplayValues, journeyId) => {
  const actions = changeAction(journeyId, field, title)
  if (partyDisplayValues) {
    const partyRegistryEntry = partyOf(field)
    actions.items.push({
      href: partyEditHref(journeyId, partyRegistryEntry, CYA_SLUG),
      text: copy.editDetails,
      visuallyHiddenText: title
    })
  }
  return actions
}

/** The copy's fields that each card row shows, so a field's error lands on the
 * row that holds it. */
const ADDRESS_FIELDS = [
  'addressLine1',
  'addressLine2',
  'townOrCity',
  'county',
  'postcode',
  'countryCode'
]

const partyCard = (
  { field, id },
  title,
  { partyDisplayValuesById, partyFieldErrorsById, journeyId, readOnly }
) => {
  const partyDisplayValues = partyDisplayValuesById[field]
  const fieldErrors = partyFieldErrorsById[field] ?? {}
  const messagesFor = (fields) =>
    fields.map((name) => fieldErrors[name]).filter(Boolean)
  return {
    id,
    title,
    ...editableActions(
      readOnly,
      partyActions(field, title, partyDisplayValues, journeyId)
    ),
    rows: [
      errorRow(
        copy.labels.name,
        partyDisplayValues?.name,
        messagesFor(['name'])
      ),
      errorRow(
        copy.labels.address,
        partyDisplayValues &&
          [
            addressText(partyDisplayValues.address),
            partyDisplayValues.address?.country
          ]
            .filter(Boolean)
            .join(', '),
        messagesFor(ADDRESS_FIELDS)
      ),
      errorRow(
        copy.labels.phone,
        partyDisplayValues?.address?.phone,
        messagesFor(['phone'])
      ),
      errorRow(
        copy.labels.email,
        partyDisplayValues?.address?.email,
        messagesFor(['email'])
      )
    ]
  }
}

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
  { partyDisplayValuesById, partyFieldErrorsById },
  readOnly
) => {
  const journeyId = journey.journeyId
  const answerRow = (field, value = answers[field]) =>
    row(journeyId, readOnly, copy.labels[field], value, field)
  // Pre-resolve the reference-data-backed labels so the section builders can
  // stay synchronous. The readers self-load; buildSections is the natural
  // await point since it is already the async gateway to check-answers.
  const originCountryLabel = await countries.countryDisplayLabel(
    answers.countryOfOrigin
  )
  const proposedPlaceOfLandingLabel = scope.has('proposedPlaceOfLanding')
    ? await ports.label(answers.proposedPlaceOfLanding)
    : undefined
  return {
    answers,
    scope,
    evaluation,
    partyDisplayValuesById,
    partyFieldErrorsById,
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
  anchor: anchorOf('commodities'),
  cards: [
    {
      id: 'importDetails',
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

const arrivalSection = (context) => ({
  heading: copy.sections.arrival,
  cards: [
    {
      id: 'arrivalDetails',
      title: copy.cards.arrival,
      rows: arrivalRows(context)
    },
    partyCard(
      { field: 'placeOfDestination', id: 'placeOfDestination' },
      destinationCopy.headings[context.arrivalState],
      context
    )
  ]
})

const partiesSection = (context) => ({
  heading: copy.sections.parties,
  cards: [
    ...(context.scope.has('consignor')
      ? [
          partyCard(
            { field: 'consignor', id: 'consignor' },
            copy.cards.consignor,
            context
          )
        ]
      : []),
    {
      id: 'identificationNumbers',
      title: copy.cards.identification,
      rows: context.scopedRows(IDENTIFIERS)
    },
    partyCard(
      { field: 'contactAddress', id: 'contact' },
      copy.cards.contact,
      context
    )
  ]
})

/** `partyFieldErrorsById` names, for each role whose copy breaks the address
 * book's rules, the fields that break them. Read-only pages pass none. */
export const buildSections = async (
  journeyState,
  partyDisplayValuesById,
  readOnly,
  { partyFieldErrorsById = {} } = {}
) => {
  const context = await sectionContext(
    journeyState,
    { partyDisplayValuesById, partyFieldErrorsById },
    readOnly
  )
  return [
    consignmentSection(context),
    arrivalSection(context),
    partiesSection(context)
  ]
}
