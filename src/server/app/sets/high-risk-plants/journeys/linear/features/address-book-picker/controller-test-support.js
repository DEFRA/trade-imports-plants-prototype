import { beforeEach, describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../../../../../../config/nunjucks/nunjucks.js'
import { documentOf } from '../../../../../../../common/test-helpers/document-of.js'
import {
  addressBookAnswering,
  driveHandler,
  expectOneRefusalLogged,
  expectOneSaveFallbackLogged,
  resetMocksAndConfigAfterTests,
  unavailableBackendError
} from '../../../../../../engine/test-support.js'
import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import {
  sharedCopy,
  SURFACES,
  withTrail
} from '../../../../../../shared/kit.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import { STUB_BOOK } from '../../../../../../services/address-book/stub/index.js'
import { answerForPickedParty } from '../../parties/picked-party.js'
import {
  itSendsBackToWhereTheTraderCameFrom,
  useStubbedHighRiskPlantsJourney
} from '../../test-support.js'
import { copy as pickerCopy } from './copy/copy.en.js'
import { pickerTableRows } from './table-rows.js'
import {
  addressResponseForABookHoldingADeletedRecord,
  DELETED_ID,
  NOT_IN_THE_BOOK
} from './test-support.js'

const redirectAfterSave = ({ nextSlug, slug }, savePayload, journeyId) =>
  savePayload.exit === 'hub'
    ? hubPath(journeyId)
    : withTrail(pagePath(journeyId, nextSlug), [slug])

const saveAndReturnToHubLabelOf = ({
  saveAndReturnToHubLabel = sharedCopy.saveActions.saveAndReturnToHub
}) => saveAndReturnToHubLabel

const saveControlsFor = (picker) => [
  ['Save and continue', { action: 'save' }],
  [saveAndReturnToHubLabelOf(picker), { exit: 'hub' }]
]
const DENMARK = 'Denmark'
const MATCHES_NOTHING = 'nothing matches this'
const EDITED_NAME = 'Tech Imports (UK) Ltd'
const MARKUP_IN_A_NAME = '</span><a href="https://evil.example">x</a><span>'
const MARKUP_LINK = '<a href="https://evil.example"'

export const copied = (id) =>
  answerForPickedParty(STUB_BOOK.find((record) => record.id === id))

const rowIds = (result) => result.view.context.picker.rows.map((row) => row.id)

export const checkedId = (result) =>
  result.view.context.picker.rows.find((row) => row.checked)?.id

const pickedFrom = (primaryId, id) => ({
  ...copied(primaryId),
  pickedFromId: id
})

const savedWithFor =
  ({ post, seed }) =>
  (payload, { answers, ...driveOptions } = {}) =>
    driveHandler(post, { seed: seed(answers), payload, ...driveOptions })

const renderPageFor = (template) => (context) =>
  nunjucksConfig.options.compileOptions.environment.render(template, {
    userSession: { isAuthenticated: true },
    getAssetPath: (asset) => `/assets/${asset}`,
    ...context
  })

const describePageServed = ({
  pickerName,
  get,
  seed,
  previousPage,
  wholeCount,
  denmarkMatches,
  primaryId
}) => {
  describe(`GET ${pickerName} — the page it serves`, () => {
    useStubbedHighRiskPlantsJourney()

    it('Should render the results table on the full-width surface', async () => {
      const result = await driveHandler(get, { seed: seed() })

      expect(result.view.context.contentColumnClass).toBe(SURFACES.display)
    })

    it('Should raise no error summary when the page is opened from the overview', async () => {
      const result = await driveHandler(get, { seed: previousPage.seed })

      expect(result.view.context.errorSummary).toBeNull()
    })

    itSendsBackToWhereTheTraderCameFrom(get, {
      seed: previousPage.seed,
      previousPage: previousPage.slug
    })

    it('Should list every address for the role, and the role-less address, on one page', async () => {
      const result = await driveHandler(get, { seed: seed() })

      expect(result.view.context.picker.rows).toHaveLength(wholeCount)
      expect(result.view.context.picker.resultsCount).toBe(
        pickerCopy.resultsCount(wholeCount, wholeCount)
      )
    })

    it("Should carry each row's address lines and contact lines from the record it lists", async () => {
      const result = await driveHandler(get, { seed: seed() })
      const primaryRecord = STUB_BOOK.find((record) => record.id === primaryId)
      const primaryRow = result.view.context.picker.rows.find(
        (row) => row.id === primaryId
      )

      expect(primaryRow.addressLines).toEqual([
        primaryRecord.address.addressLine1,
        `${primaryRecord.address.townOrCity}, ${primaryRecord.address.postcode}`
      ])
      expect(primaryRow.contactLines).toEqual([
        primaryRecord.address.phone,
        primaryRecord.address.email
      ])
    })

    it('Should narrow the rows to the search term in the query string', async () => {
      const result = await driveHandler(get, {
        seed: seed(),
        query: { q: DENMARK }
      })

      expect(rowIds(result)).toEqual(denmarkMatches)
      expect(result.view.context.picker.query).toBe(DENMARK)
    })

    it('Should list no rows when nothing matches', async () => {
      const result = await driveHandler(get, {
        seed: seed(),
        query: { q: MATCHES_NOTHING }
      })

      expect(result.view.context.picker.rows).toEqual([])
    })
  })
}

const describeSelectionShown = ({
  pickerName,
  template,
  get,
  seed,
  fieldName,
  primaryId,
  primaryName,
  secondId
}) => {
  const renderPage = renderPageFor(template)

  describe(`GET ${pickerName} — the selection it shows`, () => {
    useStubbedHighRiskPlantsJourney()

    it('Should tick the record the copy was picked from', async () => {
      const result = await driveHandler(get, {
        seed: seed({ [fieldName]: copied(primaryId) })
      })

      expect(checkedId(result)).toBe(primaryId)
      expect(result.view.context.picker.tickedRecord.name).toBe(primaryName)
    })

    it('Should carry a selection the query string names over the stored one', async () => {
      const result = await driveHandler(get, {
        seed: seed({ [fieldName]: copied(primaryId) }),
        query: { selected: secondId }
      })

      expect(checkedId(result)).toBe(secondId)
    })

    it('Should show no selection for a record the book no longer holds', async () => {
      const result = await driveHandler(get, {
        seed: seed({ [fieldName]: pickedFrom(primaryId, NOT_IN_THE_BOOK) })
      })

      expect(result.view.context.picker.tickedRecord).toBeUndefined()
      expect(checkedId(result)).toBeUndefined()
    })

    it('Should escape a record name rather than render it as markup', async () => {
      const result = await driveHandler(get, { seed: seed() })
      const { picker } = result.view.context

      const rows = [{ ...picker.rows[0], name: MARKUP_IN_A_NAME }]
      const html = renderPage({
        ...result.view.context,
        picker: {
          ...picker,
          rows,
          tableRows: pickerTableRows(fieldName, rows, pickerCopy)
        }
      })

      expect(html).toContain('&lt;a href=')
      expect(html).not.toContain(MARKUP_LINK)
    })
  })
}

const describeSearching = (picker) => {
  const { pickerName, fieldName, primaryId, denmarkMatches } = picker
  const savedWith = savedWithFor(picker)

  describe(`POST ${pickerName} — searching`, () => {
    useStubbedHighRiskPlantsJourney()

    it('Should re-render the narrowed results without committing anything', async () => {
      const result = await savedWith({ action: 'search', q: DENMARK })

      expect(rowIds(result)).toEqual(denmarkMatches)
      expect(result.after[fieldName]).toBeUndefined()
      expect(result.view.context.errorSummary).toBeNull()
    })

    it('Should keep the search text in the box and save nothing', async () => {
      const result = await savedWith({ action: 'search', q: '' })

      expect(result.view.context.picker.query).toBe('')
      expect(result.after[fieldName]).toBeUndefined()
    })

    it('Should keep a row already ticked while the results change', async () => {
      const primaryRecord = STUB_BOOK.find((record) => record.id === primaryId)
      const result = await savedWith({
        action: 'search',
        q: primaryRecord.name,
        selected: primaryId
      })

      expect(checkedId(result)).toBe(primaryId)
    })
  })
}

const describeNothingChosen = (picker) => {
  const { pickerName, fieldName, primaryId } = picker
  const savedWith = savedWithFor(picker)

  describe(`POST ${pickerName} — a save with nothing chosen`, () => {
    useStubbedHighRiskPlantsJourney()

    it.each(saveControlsFor(picker))(
      'Should move on from %s, committing nothing and raising no error',
      async (_label, savePayload) => {
        const result = await savedWith(savePayload)

        expect(result.view).toBeUndefined()
        expect(result.after[fieldName]).toBeUndefined()
        expect(result.response).toEqual({
          redirect: redirectAfterSave(picker, savePayload, result.journeyId)
        })
      }
    )

    it('Should keep a copy already held, edited since it was picked', async () => {
      const edited = { ...copied(primaryId), name: EDITED_NAME }
      delete edited.pickedFromId

      const result = await savedWith(
        { action: 'save' },
        { answers: { [fieldName]: edited } }
      )

      expect(result.response).toEqual({
        redirect: redirectAfterSave(
          picker,
          { action: 'save' },
          result.journeyId
        )
      })
      expect(result.after[fieldName]).toEqual(edited)
    })
  })
}

const describeAddressNotInTheBook = (pickerConfig) => {
  const { pickerName, template, fieldName, errorText, primaryId } = pickerConfig
  const renderPage = renderPageFor(template)
  const savedWith = savedWithFor(pickerConfig)

  describe(`POST ${pickerName} — an address the book does not hold`, () => {
    useStubbedHighRiskPlantsJourney()

    it.each(saveControlsFor(pickerConfig))(
      'Should refuse the id on %s, linking the error to the first row and describing the group by it',
      async (_label, savePayload) => {
        const result = await savedWith({
          ...savePayload,
          [fieldName]: NOT_IN_THE_BOOK
        })

        expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
        expect(result.view.context.picker.error).toBe(errorText)
        expect(result.view.context.errorSummary.errorList).toEqual([
          { text: errorText, href: `#${fieldName}` }
        ])
        const document = documentOf(renderPage(result.view.context))
        expect(document.querySelectorAll(`#${fieldName}-error`)).toHaveLength(1)
        expect(
          document
            .querySelector(`#${fieldName}`)
            .closest('fieldset')
            .getAttribute('aria-describedby')
        ).toBe(`${fieldName}-error`)
        expect(result.after[fieldName]).toBeUndefined()
        expectOneRefusalLogged(result.logger, {
          journeyId: result.journeyId,
          errorCodes: [fieldName],
          reason: 'not-in-address-book',
          addressId: NOT_IN_THE_BOOK
        })
      }
    )

    it('Should refuse a source record id posted back once the book no longer holds it, committing nothing', async () => {
      const result = await savedWith(
        { action: 'save', [fieldName]: 'gone' },
        { answers: { [fieldName]: pickedFrom(primaryId, 'gone') } }
      )

      expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.view.context.picker.error).toBe(errorText)
      expect(result.after).toEqual(result.before)
    })
  })
}

const describeAddressOfAnotherRole = (pickerConfig) => {
  const { pickerName, fieldName, errorText, wrongRoleId, get, seed } =
    pickerConfig
  const savedWith = savedWithFor(pickerConfig)

  describe(`${pickerName} — an address held for another picker's role`, () => {
    useStubbedHighRiskPlantsJourney()

    it("Should refuse a save naming a record that does not carry this picker's role, committing nothing", async () => {
      const result = await savedWith({
        action: 'save',
        [fieldName]: wrongRoleId
      })

      expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.view.context.picker.error).toBe(errorText)
      expect(result.after[fieldName]).toBeUndefined()
      expectOneRefusalLogged(result.logger, {
        journeyId: result.journeyId,
        errorCodes: [fieldName],
        reason: 'not-in-address-book',
        addressId: wrongRoleId
      })
    })

    it('Should show no selection for a stored answer picked from a record of another role', async () => {
      const result = await driveHandler(get, {
        seed: seed({ [fieldName]: copied(wrongRoleId) })
      })

      expect(result.view.context.picker.tickedRecord).toBeUndefined()
      expect(checkedId(result)).toBeUndefined()
    })
  })
}

const describeRefusalKeepsSearchAndPage = (pickerConfig) => {
  const { pickerName, fieldName, errorText, denmarkMatches } = pickerConfig
  const savedWith = savedWithFor(pickerConfig)

  describe(`POST ${pickerName} — a refused save keeps the search`, () => {
    useStubbedHighRiskPlantsJourney()

    it.each(saveControlsFor(pickerConfig))(
      'Should keep the search term and its results when %s is refused',
      async (_label, savePayload) => {
        const result = await savedWith({
          ...savePayload,
          q: DENMARK,
          [fieldName]: NOT_IN_THE_BOOK
        })

        expect(result.view.context.picker.query).toBe(DENMARK)
        expect(rowIds(result)).toEqual(denmarkMatches)
      }
    )

    it('Should point the refusal at the search box when the search found nothing', async () => {
      const result = await savedWith({
        action: 'save',
        q: MATCHES_NOTHING,
        [fieldName]: NOT_IN_THE_BOOK
      })

      expect(result.view.context.errorSummary.errorList).toEqual([
        { text: errorText, href: '#q' }
      ])
    })
  })
}

const describeDeletedRecord = (picker) => {
  const { pickerName, get, seed, fieldName, errorText, primaryId } = picker
  const savedWith = savedWithFor(picker)

  describe(`${pickerName} — a record the organisation has deleted`, () => {
    useStubbedHighRiskPlantsJourney()
    resetMocksAndConfigAfterTests()

    beforeEach(() => {
      addressBookAnswering(addressResponseForABookHoldingADeletedRecord)
    })

    it('Should show no selection for a record deleted since it was chosen', async () => {
      const result = await driveHandler(get, {
        seed: seed({ [fieldName]: pickedFrom(primaryId, DELETED_ID) })
      })

      expect(result.view.context.picker.tickedRecord).toBeUndefined()
      expect(checkedId(result)).toBeUndefined()
    })

    it('Should refuse a save naming a record the organisation has deleted', async () => {
      const result = await savedWith({
        action: 'save',
        [fieldName]: DELETED_ID
      })

      expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.view.context.errorSummary.errorList).toEqual([
        { text: errorText, href: `#${fieldName}` }
      ])
      expect(result.after[fieldName]).toBeUndefined()
    })
  })
}

const describeAcceptedAnswers = (picker) => {
  const { pickerName, get, fieldName, primaryId, secondId } = picker
  const saveAndReturnToHubLabel = saveAndReturnToHubLabelOf(picker)
  const savedWith = savedWithFor(picker)

  describe(`POST ${pickerName} — accepted answers`, () => {
    useStubbedHighRiskPlantsJourney()

    it('Should commit a copy of the chosen record and move on to the next page that applies', async () => {
      const result = await savedWith({
        action: 'save',
        [fieldName]: primaryId
      })

      expect(result.response).toEqual({
        redirect: redirectAfterSave(
          picker,
          { action: 'save' },
          result.journeyId
        )
      })
      expect(result.after[fieldName]).toEqual(copied(primaryId))
    })

    it('Should accept the row carried in the hidden field when no radio is posted', async () => {
      const result = await savedWith({ action: 'save', selected: secondId })

      expect(result.after[fieldName]).toEqual(copied(secondId))
    })

    it(`Should honour ${saveAndReturnToHubLabel}`, async () => {
      const result = await savedWith({
        [fieldName]: primaryId,
        exit: 'hub'
      })

      expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
      expect(result.after[fieldName]).toEqual(copied(primaryId))
    })

    it('Should replace a copy already held rather than keeping both', async () => {
      const result = await savedWith(
        { action: 'save', [fieldName]: secondId },
        { answers: { [fieldName]: copied(primaryId) } }
      )

      expect(result.after[fieldName]).toEqual(copied(secondId))
    })

    it('Should tick the committed copy on the next GET', async () => {
      const saved = await savedWith({
        action: 'save',
        [fieldName]: primaryId
      })

      const result = await driveHandler(get, { seed: saved.after })

      expect(checkedId(result)).toBe(primaryId)
    })
  })
}

const describeSaveFailures = (picker) => {
  const { pickerName, fieldName, primaryId } = picker
  const savedWith = savedWithFor(picker)

  describe(`POST ${pickerName} — save failures`, () => {
    useStubbedHighRiskPlantsJourney()

    it('Should re-render a backend request failure at 500 with the banner and the selection, logging the fallback', async () => {
      const failure = unavailableBackendError('save answers')

      const result = await savedWith(
        { action: 'save', [fieldName]: primaryId },
        { saveFailure: failure }
      )

      expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
      expect(result.view.context.recoverableError).toBe(true)
      expect(checkedId(result)).toBe(primaryId)
      expectOneSaveFallbackLogged(result.logger, {
        journeyId: result.journeyId,
        err: failure
      })
    })

    it('Should rethrow a programming error rather than re-rendering the page', async () => {
      await expect(
        savedWith(
          { action: 'save', [fieldName]: primaryId },
          { saveFailure: new TypeError('programming failure') }
        )
      ).rejects.toThrow(new TypeError('programming failure'))
    })
  })
}

/**
 * Declares the controller tests every address picker shares, driving the
 * page's real handlers against the stub address book.
 *
 * @param {object} picker
 * @param {string} picker.pickerName - names the picker in the group titles
 * @param {string} picker.template - the page template, as the view engine resolves it
 * @param {Function} picker.get - the picker's GET handler
 * @param {Function} picker.post - the picker's POST handler
 * @param {(answers?: object) => object} picker.seed - the answers a notification opens the picker with
 * @param {string} picker.fieldName - the answer name the page collects
 * @param {string} picker.nextSlug - the slug of the page Save and continue opens
 * @param {string} picker.errorText - the error shown for an address not in the book
 * @param {object} picker.previousPage - the page Back opens
 * @param {string} picker.previousPage.slug - that page's slug
 * @param {object} picker.previousPage.seed - answers that make that page apply
 * @param {number} picker.wholeCount - how many stub records carry this picker's role, or none
 * @param {string[]} picker.denmarkMatches - the stub record ids a "Denmark" search lists on this picker
 * @param {string} picker.primaryId - a stub record id carrying this picker's role
 * @param {string} picker.primaryName - that record's name
 * @param {string} picker.secondId - a second stub record id carrying this picker's role
 * @param {string} [picker.wrongRoleId] - a stub record id carrying only another picker's role; when given, the picker must refuse it
 * @param {string} [picker.saveAndReturnToHubLabel] - the picker's own words for the save-and-return control, defaulting to the shared copy
 */
export const describeAddressBookPickerController = (picker) => {
  describePageServed(picker)
  describeSelectionShown(picker)
  describeSearching(picker)
  describeNothingChosen(picker)
  describeAddressNotInTheBook(picker)
  describeRefusalKeepsSearchAndPage(picker)
  describeDeletedRecord(picker)
  describeAcceptedAnswers(picker)
  describeSaveFailures(picker)
  if (picker.wrongRoleId) {
    describeAddressOfAnotherRole(picker)
  }
}
