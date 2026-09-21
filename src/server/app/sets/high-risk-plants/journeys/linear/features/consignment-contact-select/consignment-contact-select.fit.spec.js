import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { PAGE_SIZE } from '../../../../../../services/address-book/index.js'
import { copy as captionCopy } from '../../flow/section-captions/copy/copy.en.js'
import { copy as commoditiesCopy } from '../commodities/copy/copy.en.js'
import { copy as commodityTypeCopy } from '../commodity-type/copy/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const COMMODITY_TYPE_URL = /\/notifications\/[^/]+\/commodity-type$/
const COMMODITY_DETAILS_URL = /\/notifications\/[^/]+\/commodities\/details/
const COMMODITY_LIST_URL = /\/notifications\/[^/]+\/commodities$/
const ORIGIN_URL = /\/notifications\/[^/]+\/origin$/
const HUB_URL = /\/notifications\/[^/]+$/
const PAGE_URL = /\/notifications\/[^/]+\/consignment\/contact\/select/
const JOURNEY_ID_SEGMENT = 2

const COUNTRY_INPUT = 'input#countryOfOrigin'

const FRANCE = 'France'
const WOOD_AND_CUT_TREES = 'wood-and-cut-trees'
const CUT_CONIFEROUS_TREES = 'cut-coniferous-trees'

const WOOD_LINE_FIELDS = {
  commodityCode: '06042020',
  quantity: '40',
  sizeOfTree: '3.5',
  phytosanitaryTreatments: 'Heat treatment'
}

// Records the stub address book holds. Tech Imports is on the first page of
// results, Copenhagen Exports on the second and Alpine Supplies on the last, so
// paging can be proved by what is on screen rather than by the link alone.
const TECH_IMPORTS = 'Tech Imports Ltd'
const IMPORT_CO = 'Import Co UK'
const ALPINE = 'Alpine Supplies GmbH'
const STUB_BOOK_SIZE = 13
// govukPagination gives each number link a visually hidden "Page " prefix, so
// that — not the bare number — is the link's accessible name.
const SECOND_PAGE_LINK = 'Page 2'
const DENMARK = 'Denmark'
const COPENHAGEN = 'Copenhagen Exports ApS'
const MATCHES_NOTHING = 'nothing matches this'
const NOT_IN_THE_BOOK = 'not-in-this-book'

const backLink = (page) =>
  page.getByRole('link', { name: sharedCopy.layout.back, exact: true })

const saveAndContinue = (page) =>
  page.getByRole('button', { name: sharedCopy.saveActions.saveAndContinue })

const saveAndReturn = (page) =>
  page.getByRole('button', {
    name: sharedCopy.saveActions.saveAndReturnToHub
  })

const rowRadio = (page, name) =>
  page.getByRole('radio', {
    name: `${copy.selectRowPrefix} ${name}`,
    exact: true
  })

const selectedInset = (page, name) =>
  page.getByText(`${copy.selectedAddressPrefix} ${name}`, { exact: true })

const errorSummaryLink = (page) =>
  page
    .getByRole('alert')
    .getByRole('link', { name: copy.errors.contactAddress })

const contactPathOf = (reference) =>
  `/notifications/${reference}/consignment/contact/select`

const contactRow = (page) =>
  page.getByRole('listitem').filter({
    has: page.getByRole('link', {
      name: hubCopy.rows.contact.title,
      exact: true
    })
  })

const startNotification = async (page) => {
  await page.goto('/')
  await page.getByRole('button', { name: dashboardCopy.startButton }).click()
  await expect(page).toHaveURL(COMMODITY_TYPE_URL)
  return new URL(page.url()).pathname.split('/')[JOURNEY_ID_SEGMENT]
}

const chooseCommodityType = async (page, commodityType) => {
  await page
    .getByRole('radio', {
      name: commodityTypeCopy.typeLabels[commodityType],
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(COMMODITY_DETAILS_URL)
}

const addLine = async (page, category, values) => {
  await page
    .getByRole('radio', {
      name: commoditiesCopy.categoryLabels[category],
      exact: true
    })
    .check()
  await page
    .getByRole('button', { name: commoditiesCopy.details.continue })
    .click()
  for (const [field, value] of Object.entries(values)) {
    await page
      .getByLabel(commoditiesCopy.details.fields[field].label, { exact: true })
      .fill(value)
  }
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(COMMODITY_LIST_URL)
}

// The country list enhances a native select, so the visible combobox keeps the
// field's own id.
const chooseCountry = async (page, name) => {
  const field = page.locator(COUNTRY_INPUT)
  await field.click()
  await field.fill(name)
  await page.getByRole('option', { name, exact: true }).click()
}

const saveOrigin = async (page, reference, country) => {
  await page.goto(`/notifications/${reference}/origin`)
  await expect(page).toHaveURL(ORIGIN_URL)
  await chooseCountry(page, country)
  await saveAndContinue(page).click()
}

// A wood notification with the prerequisite origin answered.
const startAtContact = async (page) => {
  const reference = await startNotification(page)
  await chooseCommodityType(page, WOOD_AND_CUT_TREES)
  await addLine(page, CUT_CONIFEROUS_TREES, WOOD_LINE_FIELDS)
  await saveOrigin(page, reference, FRANCE)
  await page.goto(contactPathOf(reference))
  await expect(page).toHaveURL(PAGE_URL)
  return reference
}

// A blank save is allowed on this page, so the refusal has to be provoked with
// an id the book does not hold.
const postAnIdNotInTheBook = async (page) => {
  await page
    .getByRole('radio')
    .first()
    .evaluate((input) => {
      input.value = 'not-in-this-book'
      input.checked = true
    })
  await saveAndContinue(page).click()
}

const expectNoSeriousOrCriticalViolations = async (page, subject) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const seriousOrCritical = results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )

  expect(
    seriousOrCritical,
    `${subject} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

test.describe('consignment-contact-select feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders the heading, the description and the search box', async ({
    page
  }) => {
    await startAtContact(page)

    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()
    await expect(
      page.getByText(captionCopy.sections.consignmentParties, { exact: true })
    ).toHaveCount(0)
    await expect(
      page.getByText(copy.description, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByLabel(copy.search.label, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText(copy.search.hint, { exact: true })
    ).toBeVisible()
  })

  test('is reachable from the overview contact task row', async ({ page }) => {
    const reference = await startAtContact(page)
    await page.goto(`/notifications/${reference}`)

    await page
      .getByRole('link', { name: hubCopy.rows.contact.title, exact: true })
      .click()

    await expect(page).toHaveURL(PAGE_URL)
  })

  test('shows the first page of the organisation address book with its count', async ({
    page
  }) => {
    await startAtContact(page)

    await expect(
      page.getByText(copy.resultsCaption(PAGE_SIZE, STUB_BOOK_SIZE), {
        exact: true
      })
    ).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(PAGE_SIZE)
    await expect(rowRadio(page, TECH_IMPORTS)).toBeVisible()
    await expect(rowRadio(page, ALPINE)).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: SECOND_PAGE_LINK, exact: true })
    ).toBeVisible()
  })

  test('offers the three save controls', async ({ page }) => {
    await startAtContact(page)

    await expect(saveAndContinue(page)).toBeVisible()
    await expect(saveAndReturn(page)).toBeVisible()
    await expect(
      page.getByRole('link', {
        name: sharedCopy.saveActions.cancelAndReturnToHub
      })
    ).toBeVisible()
  })

  test('sends Back to the overview', async ({ page }) => {
    const reference = await startAtContact(page)

    await expect(backLink(page)).toHaveAttribute(
      'href',
      `/notifications/${reference}`
    )
    await backLink(page).click()
    await expect(page).toHaveURL(HUB_URL)
  })

  test('narrows the results to the search term', async ({ page }) => {
    await startAtContact(page)

    await page.getByLabel(copy.search.label, { exact: true }).fill(DENMARK)
    await page.getByRole('button', { name: copy.search.button }).click()

    await expect(rowRadio(page, COPENHAGEN)).toBeVisible()
    await expect(rowRadio(page, TECH_IMPORTS)).toHaveCount(0)
  })

  test('says so rather than showing an empty table when nothing matches', async ({
    page
  }) => {
    await startAtContact(page)

    await page
      .getByLabel(copy.search.label, { exact: true })
      .fill(MATCHES_NOTHING)
    await page.getByRole('button', { name: copy.search.button }).click()

    await expect(page.getByText(copy.noMatches, { exact: true })).toBeVisible()
  })

  test('keeps a ticked row while the search narrows the results', async ({
    page
  }) => {
    await startAtContact(page)

    await rowRadio(page, TECH_IMPORTS).check()
    await page.getByLabel(copy.search.label, { exact: true }).fill(DENMARK)
    await page.getByRole('button', { name: copy.search.button }).click()

    await expect(selectedInset(page, TECH_IMPORTS)).toBeVisible()
  })

  test('carries a saved address through the paging links', async ({ page }) => {
    const reference = await startAtContact(page)
    await rowRadio(page, TECH_IMPORTS).check()
    await saveAndContinue(page).click()
    await page.goto(contactPathOf(reference))

    await page
      .getByRole('link', { name: SECOND_PAGE_LINK, exact: true })
      .click()

    await expect(selectedInset(page, TECH_IMPORTS)).toBeVisible()
    await expect(rowRadio(page, TECH_IMPORTS)).toHaveCount(0)
  })

  test('carries a newly ticked address through the paging links', async ({
    page
  }) => {
    await startAtContact(page)
    await rowRadio(page, TECH_IMPORTS).check()

    await page
      .getByRole('link', { name: SECOND_PAGE_LINK, exact: true })
      .click()

    await expect(selectedInset(page, TECH_IMPORTS)).toBeVisible()
    await expect(rowRadio(page, TECH_IMPORTS)).toHaveCount(0)
  })
})

test.describe('consignment-contact-select — saving an address', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('saves the chosen address, returns to the overview with the row complete and shows it again on return', async ({
    page
  }) => {
    const reference = await startAtContact(page)

    await rowRadio(page, TECH_IMPORTS).check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(HUB_URL)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.completed)

    await page.goto(contactPathOf(reference))
    await expect(rowRadio(page, TECH_IMPORTS)).toBeChecked()
    await expect(selectedInset(page, TECH_IMPORTS)).toBeVisible()
  })

  test('a row ticked on the second page saves, and re-entering shows it as the selected address', async ({
    page
  }) => {
    const reference = await startAtContact(page)
    await page
      .getByRole('link', { name: SECOND_PAGE_LINK, exact: true })
      .click()
    await expect(rowRadio(page, COPENHAGEN)).toBeVisible()

    await rowRadio(page, COPENHAGEN).check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(HUB_URL)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.completed)

    // Re-entering opens on page one of the whole book, where the chosen record
    // is not rendered — the picker still knows it, and says so in the inset.
    await page.goto(contactPathOf(reference))
    await expect(selectedInset(page, COPENHAGEN)).toBeVisible()
    await expect(rowRadio(page, COPENHAGEN)).toHaveCount(0)
  })

  test('replaces the address already saved rather than keeping both', async ({
    page
  }) => {
    const reference = await startAtContact(page)
    await rowRadio(page, TECH_IMPORTS).check()
    await saveAndContinue(page).click()
    await page.goto(contactPathOf(reference))

    await rowRadio(page, IMPORT_CO).check()
    await saveAndContinue(page).click()
    await page.goto(contactPathOf(reference))

    await expect(rowRadio(page, IMPORT_CO)).toBeChecked()
    await expect(rowRadio(page, TECH_IMPORTS)).not.toBeChecked()
  })

  test('Save and return to overview saves the address and reaches the overview', async ({
    page
  }) => {
    const reference = await startAtContact(page)

    await rowRadio(page, TECH_IMPORTS).check()
    await saveAndReturn(page).click()

    await expect(page).toHaveURL(HUB_URL)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.completed)

    await page.goto(contactPathOf(reference))
    await expect(rowRadio(page, TECH_IMPORTS)).toBeChecked()
  })

  test('Cancel and return to overview reaches the overview without saving', async ({
    page
  }) => {
    const reference = await startAtContact(page)

    await rowRadio(page, TECH_IMPORTS).check()
    await page
      .getByRole('link', {
        name: sharedCopy.saveActions.cancelAndReturnToHub
      })
      .click()

    await expect(page).toHaveURL(HUB_URL)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.notYetStarted)

    await page.goto(contactPathOf(reference))
    await expect(rowRadio(page, TECH_IMPORTS)).not.toBeChecked()
  })
})

test.describe('consignment-contact-select — a blank save', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  for (const action of [
    sharedCopy.saveActions.saveAndContinue,
    sharedCopy.saveActions.saveAndReturnToHub
  ]) {
    test(`blank contact permits ${action} and leaves the task not yet started`, async ({
      page
    }) => {
      const reference = await startAtContact(page)

      await page.getByRole('button', { name: action, exact: true }).click()

      await expect(page).toHaveURL(HUB_URL)
      await expect(contactRow(page)).toContainText(
        hubCopy.statuses.notYetStarted
      )

      await page.goto(contactPathOf(reference))
      await expect(
        page.getByText(new RegExp(`^${copy.selectedAddressPrefix}`))
      ).toHaveCount(0)
      await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
    })
  }
})

test.describe('consignment-contact-select — the answers it refuses', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('rejects an id the address book does not hold, focuses the first row and preserves the search', async ({
    page
  }) => {
    await startAtContact(page)
    await page.getByLabel(copy.search.label, { exact: true }).fill('Imports')

    await postAnIdNotInTheBook(page)

    await expect(page).toHaveURL(PAGE_URL)
    await expect(errorSummaryLink(page)).toBeVisible()
    await expect(
      page.getByLabel(copy.search.label, { exact: true })
    ).toHaveValue('Imports')
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
    await expect(page.getByRole('radio').first()).not.toHaveValue(
      NOT_IN_THE_BOOK
    )

    await errorSummaryLink(page).click()
    await expect(page.getByRole('radio').first()).toBeFocused()
  })

  test('recovers from the error once an address is chosen', async ({
    page
  }) => {
    await startAtContact(page)
    await postAnIdNotInTheBook(page)
    await expect(errorSummaryLink(page)).toBeVisible()

    await rowRadio(page, TECH_IMPORTS).check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(HUB_URL)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.completed)
  })
})

test.describe('consignment-contact-select — accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('has no serious or critical axe violations on the initial render', async ({
    page
  }) => {
    await startAtContact(page)
    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, 'Contact initial render')
  })

  test('has no serious or critical axe violations in the error state', async ({
    page
  }) => {
    await startAtContact(page)
    await postAnIdNotInTheBook(page)
    await expect(errorSummaryLink(page)).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, 'Contact error state')
  })
})
