import { collectionView } from '../../../../../../../engine/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as countries from '../../../../../../../services/countries/index.js'
import * as ports from '../../../../../../../services/ports/index.js'
import { lineFieldsFor } from '../../../../../services/commodities/index.js'
import { detailsPath } from '../../commodities/links.js'
import { addressParts } from '../../address-book-picker/address-lines.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { row, readOnlyRow } from './rows/summary-row.js'
import { errorRow, errorLinesRow } from './rows/error-row.js'
import { changeAction, editableActions } from './rows/change-link.js'
import { dateText } from './rows/value-text.js'
import { anchorOf } from './incomplete-cards.js'
import { CYA_SLUG, withTrail } from '../../../../../../../shared/kit.js'
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

const partyActions = ({
  field,
  title,
  partyDisplayValues,
  journeyId,
  changeLinkTrail,
  reviewPageTrail
}) => {
  const actions = changeAction({ journeyId, changeLinkTrail }, field, title)
  if (partyDisplayValues) {
    const partyRegistryEntry = partyOf(field)
    actions.items.push({
      href: partyEditHref(
        journeyId,
        partyRegistryEntry,
        CYA_SLUG,
        reviewPageTrail
      ),
      text: copy.editDetails,
      visuallyHiddenText: title
    })
  }
  return actions
}

const partyCard = (
  { field, id },
  title,
  {
    partyDisplayValuesById,
    partyFieldErrorsById,
    journeyId,
    changeLinkTrail,
    reviewPageTrail,
    readOnly
  }
) => {
  const nameAndContactFields = ['name', 'phone', 'email']
  const addressFields = [
    'addressLine1',
    'addressLine2',
    'townOrCity',
    'county',
    'postcode',
    'countryCode'
  ]
  const partyDisplayValues = partyDisplayValuesById[field]
  const fieldErrors = partyFieldErrorsById[field] ?? {}
  const messagesFor = (fields) =>
    fields.map((name) => fieldErrors[name]).filter(Boolean)
  return {
    id,
    title,
    ...editableActions({
      readOnly,
      actions: partyActions({
        field,
        title,
        partyDisplayValues,
        journeyId,
        changeLinkTrail,
        reviewPageTrail
      })
    }),
    rows: [
      errorRow(
        copy.labels.name,
        partyDisplayValues?.name,
        messagesFor(nameAndContactFields)
      ),
      errorLinesRow(
        copy.labels.address,
        partyDisplayValues &&
          [
            ...addressParts(partyDisplayValues.address),
            partyDisplayValues.address?.country
          ].filter(Boolean),
        messagesFor(addressFields)
      )
    ]
  }
}

const commodityCards = ({
  answers,
  evaluation,
  journeyId,
  changeLinkTrail,
  readOnly
}) =>
  collectionView(answers, ['commodityLines'], evaluation).map(
    ({ index, entry }) => {
      const title = `${copy.cards.commodity} ${index + 1}`
      const actions = changeAction(
        { journeyId, changeLinkTrail },
        'commodityLines',
        title
      )
      actions.items[0].href = withTrail(
        detailsPath(journeyId, index),
        changeLinkTrail
      )
      return {
        title,
        ...editableActions({ readOnly, actions }),
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

const sectionContext = async (
  { journey, answers, scope, evaluation },
  {
    partyDisplayValuesById,
    partyFieldErrorsById,
    changeLinkTrail,
    reviewPageTrail,
    readOnly
  }
) => {
  const journeyId = journey.journeyId
  const answerRow = (field, value = answers[field]) =>
    row(
      { journeyId, changeLinkTrail, readOnly },
      copy.labels[field],
      value,
      field
    )
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
    changeLinkTrail,
    reviewPageTrail,
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
  changeLinkTrail,
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
    ...commodityCards({
      answers,
      evaluation,
      journeyId,
      changeLinkTrail,
      readOnly
    })
  ]
})

const arrivalRows = ({
  answers,
  scope,
  arrivalState,
  journeyId,
  changeLinkTrail,
  readOnly,
  answerRow,
  scopedRows,
  proposedPlaceOfLandingLabel
}) => [
  ...(scope.has('arrivalStatus')
    ? [answerRow('arrivalStatus', copy.statusLabels[answers.arrivalStatus])]
    : []),
  row(
    { journeyId, changeLinkTrail, readOnly },
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

const addressesSection = (context) => ({
  heading: copy.sections.addresses,
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
  { partyFieldErrorsById = {}, changeLinkTrail, reviewPageTrail } = {}
) => {
  const context = await sectionContext(journeyState, {
    partyDisplayValuesById,
    partyFieldErrorsById,
    changeLinkTrail,
    reviewPageTrail,
    readOnly
  })
  return [
    consignmentSection(context),
    arrivalSection(context),
    addressesSection(context)
  ]
}
