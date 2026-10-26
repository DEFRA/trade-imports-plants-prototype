import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JSDOM } from 'jsdom'

import { config } from '../../../../../../../../config/config.js'
import { nunjucksConfig } from '../../../../../../../../config/nunjucks/nunjucks.js'
import {
  driveHandler,
  expectBackLinkIsPage,
  expectOneRefusalLogged,
  expectOneSaveFallbackLogged,
  unavailableBackendError
} from '../../../../../../engine/test-support.js'
import { hubPath } from '../../../../../../shared/paths.js'
import { RUN_ACTIVE } from '../../../../../../flow/run-state.js'
import { SURFACES } from '../../../../../../shared/kit.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import { PAGE_SIZE } from '../../../../../../services/address-book/index.js'
import {
  STUB_BOOK,
  STUB_BOOK_SIZE
} from '../../../../../../services/address-book/stub/index.js'
import { answerForPickedParty } from '../../parties/picked-party.js'
import { useStubbedHighRiskPlantsJourney } from '../../test-support.js'
import { copy as pickerCopy } from './copy/copy.en.js'
import { pickerTableRows } from './table-rows.js'
import {
  bookHoldingADeletedRecord,
  DELETED_ID,
  IMPORT_CO,
  NOT_IN_THE_BOOK,
  TECH_IMPORTS_ID,
  TECH_IMPORTS_NAME
} from './test-support.js'

const LAST_PAGE = 3
const DENMARK = 'Denmark'
const DENMARK_ROWS = ['copenhagen-exports-aps', 'aarhus-trading-aps']
const MATCHES_NOTHING = 'nothing matches this'
const ALPINE = 'alpine-supplies-gmbh'
const EDITED_NAME = 'Tech Imports (UK) Ltd'
const MARKUP_IN_A_NAME = '</span><a href="https://evil.example">x</a><span>'
const MARKUP_LINK = '<a href="https://evil.example"'

export const copied = (id) =>
  answerForPickedParty(STUB_BOOK.find((record) => record.id === id))

const rowIds = (result) => result.view.context.picker.rows.map((row) => row.id)

export const checkedId = (result) =>
  result.view.context.picker.rows.find((row) => row.checked)?.id

const pickedFrom = (id) => ({ ...copied(TECH_IMPORTS_ID), pickedFromId: id })

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

const describePageServed = ({ pickerName, get, seed, previousStep }) => {
  describe(`GET ${pickerName} — the page it serves`, () => {
    useStubbedHighRiskPlantsJourney()

    it('Should render the results table on the full-width surface', async () => {
      const result = await driveHandler(get, { seed: seed() })

      expect(result.view.context.contentColumnClass).toBe(SURFACES.display)
    })

    it('Should send Back to the overview and raise no error summary when the page is opened from the overview', async () => {
      const result = await driveHandler(get, { seed: previousStep.seed })

      expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
      expect(result.view.context.errorSummary).toBeNull()
    })

    it('Should send Back to the previous step while the opening run is on', async () => {
      const result = await driveHandler(get, {
        seed: previousStep.seed,
        openingRun: RUN_ACTIVE
      })

      expectBackLinkIsPage(result, previousStep.slug)
    })

    it('Should show the first page of the organisation book, counted against the whole', async () => {
      const result = await driveHandler(get, { seed: seed() })

      expect(result.view.context.picker.rows).toHaveLength(PAGE_SIZE)
      expect(result.view.context.picker.resultsCount).toBe(
        pickerCopy.resultsCount(PAGE_SIZE, STUB_BOOK_SIZE)
      )
      expect(result.view.context.picker.page).toBe(1)
    })

    it('Should narrow the rows to the search term in the query string', async () => {
      const result = await driveHandler(get, {
        seed: seed(),
        query: { q: DENMARK }
      })

      expect(rowIds(result)).toEqual(DENMARK_ROWS)
      expect(result.view.context.picker.query).toBe(DENMARK)
    })

    it('Should show the page the query string asks for', async () => {
      const result = await driveHandler(get, {
        seed: seed(),
        query: { page: String(LAST_PAGE) }
      })

      expect(result.view.context.picker.page).toBe(LAST_PAGE)
      expect(rowIds(result)).toContain(ALPINE)
    })

    it('Should list no rows and no paging when nothing matches', async () => {
      const result = await driveHandler(get, {
        seed: seed(),
        query: { q: MATCHES_NOTHING }
      })

      expect(result.view.context.picker.rows).toEqual([])
      expect(result.view.context.picker.pagination).toBeNull()
    })
  })
}

const describeSelectionShown = ({
  pickerName,
  template,
  get,
  seed,
  fieldName
}) => {
  const renderPage = renderPageFor(template)

  describe(`GET ${pickerName} — the selection it shows`, () => {
    useStubbedHighRiskPlantsJourney()

    it('Should tick the record the copy was picked from', async () => {
      const result = await driveHandler(get, {
        seed: seed({ [fieldName]: copied(TECH_IMPORTS_ID) })
      })

      expect(checkedId(result)).toBe(TECH_IMPORTS_ID)
      expect(result.view.context.picker.tickedRecord.name).toBe(
        TECH_IMPORTS_NAME
      )
    })

    it('Should carry a selection the query string names over the stored one', async () => {
      const result = await driveHandler(get, {
        seed: seed({ [fieldName]: copied(TECH_IMPORTS_ID) }),
        query: { selected: IMPORT_CO }
      })

      expect(checkedId(result)).toBe(IMPORT_CO)
    })

    it('Should show no selection for a record the book no longer holds', async () => {
      const result = await driveHandler(get, {
        seed: seed({ [fieldName]: pickedFrom(NOT_IN_THE_BOOK) })
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
  const { pickerName, fieldName } = picker
  const savedWith = savedWithFor(picker)

  describe(`POST ${pickerName} — searching`, () => {
    useStubbedHighRiskPlantsJourney()

    it('Should re-render the narrowed results without committing anything', async () => {
      const result = await savedWith({ action: 'search', q: DENMARK })

      expect(rowIds(result)).toEqual(DENMARK_ROWS)
      expect(result.after[fieldName]).toBeUndefined()
      expect(result.view.context.errorSummary).toBeNull()
    })

    it('Should start a new search at the first page', async () => {
      const result = await savedWith({
        action: 'search',
        q: '',
        page: String(LAST_PAGE)
      })

      expect(result.view.context.picker.page).toBe(1)
    })

    it('Should keep a row already ticked while the results change', async () => {
      const result = await savedWith({
        action: 'search',
        q: 'Imports',
        selected: TECH_IMPORTS_ID
      })

      expect(checkedId(result)).toBe(TECH_IMPORTS_ID)
    })
  })
}

const describeNothingChosen = (picker) => {
  const { pickerName, fieldName } = picker
  const savedWith = savedWithFor(picker)

  describe(`POST ${pickerName} — a save with nothing chosen`, () => {
    useStubbedHighRiskPlantsJourney()

    it('Should move on to the overview, committing nothing and raising no error', async () => {
      const result = await savedWith({ action: 'save' })

      expect(result.view).toBeUndefined()
      expect(result.after[fieldName]).toBeUndefined()
      expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    })

    it('Should move on from Save and return to overview, committing nothing', async () => {
      const result = await savedWith({ exit: 'hub' })

      expect(result.after[fieldName]).toBeUndefined()
      expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    })

    it('Should keep a copy already held, edited since it was picked', async () => {
      const edited = { ...copied(TECH_IMPORTS_ID), name: EDITED_NAME }
      delete edited.pickedFromId

      const result = await savedWith(
        { action: 'save' },
        { answers: { [fieldName]: edited } }
      )

      expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
      expect(result.after[fieldName]).toEqual(edited)
    })
  })
}

const describeAddressNotInTheBook = (pickerConfig) => {
  const { pickerName, template, fieldName, errorText } = pickerConfig
  const renderPage = renderPageFor(template)
  const savedWith = savedWithFor(pickerConfig)

  describe(`POST ${pickerName} — an address the book does not hold`, () => {
    useStubbedHighRiskPlantsJourney()

    it('Should refuse the id, linking the error to the first row and describing the group by it', async () => {
      const result = await savedWith({
        action: 'save',
        [fieldName]: NOT_IN_THE_BOOK
      })

      expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.view.context.picker.error).toBe(errorText)
      expect(result.view.context.errorSummary.errorList).toEqual([
        { text: errorText, href: `#${fieldName}` }
      ])
      const document = new JSDOM(renderPage(result.view.context)).window
        .document
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
    })

    it('Should refuse the id on Save and return to overview too', async () => {
      const result = await savedWith({
        exit: 'hub',
        [fieldName]: NOT_IN_THE_BOOK
      })

      expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.after[fieldName]).toBeUndefined()
    })

    it('Should refuse a source record id posted back once the book no longer holds it, committing nothing', async () => {
      const result = await savedWith(
        { action: 'save', [fieldName]: 'gone' },
        { answers: { [fieldName]: pickedFrom('gone') } }
      )

      expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.view.context.picker.error).toBe(errorText)
      expect(result.after).toEqual(result.before)
    })
  })
}

const describeRefusalKeepsSearchAndPage = (pickerConfig) => {
  const { pickerName, fieldName, errorText } = pickerConfig
  const savedWith = savedWithFor(pickerConfig)

  describe(`POST ${pickerName} — a refused save keeps the search and page`, () => {
    useStubbedHighRiskPlantsJourney()

    it('Should keep the refused search term so the results are still there', async () => {
      const result = await savedWith({
        action: 'save',
        q: DENMARK,
        [fieldName]: NOT_IN_THE_BOOK
      })

      expect(result.view.context.picker.query).toBe(DENMARK)
      expect(rowIds(result)).toEqual(DENMARK_ROWS)
    })

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

    it('Should re-render the page the refusal was made on and link it to that page’s first row', async () => {
      const result = await savedWith({
        action: 'save',
        page: String(LAST_PAGE),
        [fieldName]: NOT_IN_THE_BOOK
      })

      const { picker, errorSummary } = result.view.context
      expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(picker.page).toBe(LAST_PAGE)
      expect(rowIds(result)).toContain(ALPINE)
      expect(picker.rows[0].idPrefix).toBe(fieldName)
      expect(errorSummary.errorList[0].href).toBe(`#${picker.rows[0].idPrefix}`)
    })
  })
}

const describeDeletedRecord = (picker) => {
  const { pickerName, get, seed, fieldName, errorText } = picker
  const savedWith = savedWithFor(picker)

  describe(`${pickerName} — a record the organisation has deleted`, () => {
    const originalMode = config.get('stubMode')

    useStubbedHighRiskPlantsJourney()

    beforeEach(() => {
      config.set('stubMode', false)
      vi.stubGlobal('fetch', bookHoldingADeletedRecord())
    })

    afterEach(() => {
      config.set('stubMode', originalMode)
      vi.unstubAllGlobals()
    })

    it('Should show no selection for a record deleted since it was chosen', async () => {
      const result = await driveHandler(get, {
        seed: seed({ [fieldName]: pickedFrom(DELETED_ID) })
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
  const { pickerName, get, fieldName } = picker
  const savedWith = savedWithFor(picker)

  describe(`POST ${pickerName} — accepted answers`, () => {
    useStubbedHighRiskPlantsJourney()

    it('Should commit a copy of the chosen record and move on to the overview', async () => {
      const result = await savedWith({
        action: 'save',
        [fieldName]: TECH_IMPORTS_ID
      })

      expect(result.after[fieldName]).toEqual(copied(TECH_IMPORTS_ID))
      expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    })

    it('Should accept the row carried in the hidden field when no radio is posted', async () => {
      const result = await savedWith({ action: 'save', selected: ALPINE })

      expect(result.after[fieldName]).toEqual(copied(ALPINE))
    })

    it('Should honour Save and return to overview', async () => {
      const result = await savedWith({
        [fieldName]: TECH_IMPORTS_ID,
        exit: 'hub'
      })

      expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
      expect(result.after[fieldName]).toEqual(copied(TECH_IMPORTS_ID))
    })

    it('Should replace a copy already held rather than keeping both', async () => {
      const result = await savedWith(
        { action: 'save', [fieldName]: IMPORT_CO },
        { answers: { [fieldName]: copied(TECH_IMPORTS_ID) } }
      )

      expect(result.after[fieldName]).toEqual(copied(IMPORT_CO))
    })

    it('Should tick the committed copy on the next GET', async () => {
      const saved = await savedWith({
        action: 'save',
        [fieldName]: TECH_IMPORTS_ID
      })

      const result = await driveHandler(get, { seed: saved.after })

      expect(checkedId(result)).toBe(TECH_IMPORTS_ID)
    })
  })
}

const describeSaveFailures = (picker) => {
  const { pickerName, fieldName } = picker
  const savedWith = savedWithFor(picker)

  describe(`POST ${pickerName} — save failures`, () => {
    useStubbedHighRiskPlantsJourney()

    it('Should re-render a backend request failure at 500 with the banner and the selection, logging the fallback', async () => {
      const failure = unavailableBackendError('save answers')

      const result = await savedWith(
        { action: 'save', [fieldName]: TECH_IMPORTS_ID },
        { saveFailure: failure }
      )

      expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
      expect(result.view.context.recoverableError).toBe(true)
      expect(checkedId(result)).toBe(TECH_IMPORTS_ID)
      expectOneSaveFallbackLogged(result.logger, {
        journeyId: result.journeyId,
        err: failure
      })
    })

    it('Should rethrow a programming error rather than re-rendering the page', async () => {
      await expect(
        savedWith(
          { action: 'save', [fieldName]: TECH_IMPORTS_ID },
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
 * @param {string} picker.errorText - the error shown for an address not in the book
 * @param {object} picker.previousStep - the page the opening run's Back link opens
 * @param {string} picker.previousStep.slug - that page's slug
 * @param {object} picker.previousStep.seed - answers that make that page apply
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
}
