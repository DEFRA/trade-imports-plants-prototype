import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { PAGE_SIZE } from '../../../../../../services/address-book/index.js'
import { copy as captionsCopy } from '../../flow/section-captions/copy/copy.en.js'
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
const PAGE_URL = /\/notifications\/[^/]+\/consignors\/select/
const JOURNEY_ID_SEGMENT = 2

const COUNTRY_INPUT = 'input#countryOfOrigin'
const FIRST_ROW_RADIO = '#consignor'

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
// results and Alpine Supplies on the last, so paging can be proved by what is
// on screen rather than by the link alone.
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

const backLink = (page) =>
  page.getByRole('link', { name: sharedCopy.layout.back, exact: true })

const saveAndContinue = (page) =>
  page.getByRole('button', { name: sharedCopy.saveActions.saveAndContinue })

const rowRadio = (page, name) =>
  page.getByRole('radio', {
    name: `${copy.selectRowPrefix} ${name}`,
    exact: true
  })

const selectedInset = (page, name) =>
  page.getByText(`${copy.selectedAddressPrefix} ${name}`, { exact: true })

const consignorPathOf = (reference) =>
  `/notifications/${reference}/consignors/select`

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
const startAtConsignor = async (page) => {
  const reference = await startNotification(page)
  await chooseCommodityType(page, WOOD_AND_CUT_TREES)
  await addLine(page, CUT_CONIFEROUS_TREES, WOOD_LINE_FIELDS)
  await saveOrigin(page, reference, FRANCE)
  await page.goto(consignorPathOf(reference))
  await expect(page).toHaveURL(PAGE_URL)
  return reference
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

test.describe('consignor-select feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders the caption, the heading, the description and the search box', async ({
    page
  }) => {
    await startAtConsignor(page)

    await expect(
      page.getByText(captionsCopy.sections.consignmentParties, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()
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

  test('is reachable from the overview consignor task row', async ({
    page
  }) => {
    const reference = await startAtConsignor(page)
    await page.goto(`/notifications/${reference}`)

    await page.getByRole('link', { name: hubCopy.rows.consignor.title }).click()

    await expect(page).toHaveURL(PAGE_URL)
  })

  test('shows the first page of the organisation address book with its count', async ({
    page
  }) => {
    await startAtConsignor(page)

    await expect(
      page.getByText(copy.resultsCaption(PAGE_SIZE, STUB_BOOK_SIZE), {
        exact: true
      })
    ).toBeVisible()
    await expect(rowRadio(page, TECH_IMPORTS)).toBeVisible()
    await expect(rowRadio(page, ALPINE)).toHaveCount(0)
  })

  test('offers the three save controls', async ({ page }) => {
    await startAtConsignor(page)

    await expect(saveAndContinue(page)).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: sharedCopy.saveActions.saveAndReturnToHub
      })
    ).toBeVisible()
    await expect(
      page.getByRole('link', {
        name: sharedCopy.saveActions.cancelAndReturnToHub
      })
    ).toBeVisible()
  })

  test('sends Back to the overview', async ({ page }) => {
    const reference = await startAtConsignor(page)

    await expect(backLink(page)).toHaveAttribute(
      'href',
      `/notifications/${reference}`
    )
  })

  test('narrows the results to the search term', async ({ page }) => {
    await startAtConsignor(page)

    await page.getByLabel(copy.search.label, { exact: true }).fill(DENMARK)
    await page.getByRole('button', { name: copy.search.button }).click()

    await expect(rowRadio(page, COPENHAGEN)).toBeVisible()
    await expect(rowRadio(page, TECH_IMPORTS)).toHaveCount(0)
  })

  test('says so rather than showing an empty table when nothing matches', async ({
    page
  }) => {
    await startAtConsignor(page)

    await page
      .getByLabel(copy.search.label, { exact: true })
      .fill(MATCHES_NOTHING)
    await page.getByRole('button', { name: copy.search.button }).click()

    await expect(page.getByText(copy.noMatches, { exact: true })).toBeVisible()
  })

  test('keeps a ticked row while the search narrows the results', async ({
    page
  }) => {
    await startAtConsignor(page)

    await rowRadio(page, TECH_IMPORTS).check()
    await page.getByLabel(copy.search.label, { exact: true }).fill(DENMARK)
    await page.getByRole('button', { name: copy.search.button }).click()

    await expect(selectedInset(page, TECH_IMPORTS)).toBeVisible()
  })

  test('carries a saved address through the paging links', async ({ page }) => {
    const reference = await startAtConsignor(page)
    await rowRadio(page, TECH_IMPORTS).check()
    await saveAndContinue(page).click()
    await page.goto(consignorPathOf(reference))

    await page
      .getByRole('link', { name: SECOND_PAGE_LINK, exact: true })
      .click()

    await expect(selectedInset(page, TECH_IMPORTS)).toBeVisible()
    await expect(rowRadio(page, TECH_IMPORTS)).toHaveCount(0)
  })
})

test.describe('consignor-select — saving an address', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('saves the chosen address, continues to identification numbers and shows it again on return', async ({
    page
  }) => {
    const reference = await startAtConsignor(page)

    await rowRadio(page, TECH_IMPORTS).check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(/\/identification-numbers$/)

    await page.goto(consignorPathOf(reference))
    await expect(rowRadio(page, TECH_IMPORTS)).toBeChecked()
    await expect(selectedInset(page, TECH_IMPORTS)).toBeVisible()
  })

  test('replaces the address already saved rather than keeping both', async ({
    page
  }) => {
    const reference = await startAtConsignor(page)
    await rowRadio(page, TECH_IMPORTS).check()
    await saveAndContinue(page).click()
    await page.goto(consignorPathOf(reference))

    await rowRadio(page, IMPORT_CO).check()
    await saveAndContinue(page).click()
    await page.goto(consignorPathOf(reference))

    await expect(rowRadio(page, IMPORT_CO)).toBeChecked()
    await expect(rowRadio(page, TECH_IMPORTS)).not.toBeChecked()
  })

  test('Save and return to overview saves the address and reaches the overview', async ({
    page
  }) => {
    const reference = await startAtConsignor(page)

    await rowRadio(page, TECH_IMPORTS).check()
    await page
      .getByRole('button', {
        name: sharedCopy.saveActions.saveAndReturnToHub
      })
      .click()

    await expect(page).toHaveURL(HUB_URL)

    await page.goto(consignorPathOf(reference))
    await expect(rowRadio(page, TECH_IMPORTS)).toBeChecked()
  })

  test('Cancel and return to overview reaches the overview without saving', async ({
    page
  }) => {
    const reference = await startAtConsignor(page)

    await rowRadio(page, TECH_IMPORTS).check()
    await page
      .getByRole('link', {
        name: sharedCopy.saveActions.cancelAndReturnToHub
      })
      .click()

    await expect(page).toHaveURL(HUB_URL)

    await page.goto(consignorPathOf(reference))
    await expect(rowRadio(page, TECH_IMPORTS)).not.toBeChecked()
  })
})

test.describe('consignor-select — the answers it refuses', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('continuing with nothing chosen shows the error and focuses the first row', async ({
    page
  }) => {
    await startAtConsignor(page)

    await saveAndContinue(page).click()

    await expect(page).toHaveURL(PAGE_URL)
    const summaryLink = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.consignor })
    await expect(summaryLink).toBeVisible()

    await summaryLink.click()
    await expect(page.locator(FIRST_ROW_RADIO)).toBeFocused()
  })

  test('recovers from the error once an address is chosen', async ({
    page
  }) => {
    await startAtConsignor(page)
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.consignor
      })
    ).toBeVisible()

    await rowRadio(page, TECH_IMPORTS).check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(/\/identification-numbers$/)
  })

  test('continuing with nothing found focuses the search box', async ({
    page
  }) => {
    await startAtConsignor(page)
    await page
      .getByLabel(copy.search.label, { exact: true })
      .fill(MATCHES_NOTHING)
    await page.getByRole('button', { name: copy.search.button }).click()
    await expect(page.getByText(copy.noMatches, { exact: true })).toBeVisible()

    await saveAndContinue(page).click()

    const summaryLink = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.consignor })
    await expect(summaryLink).toBeVisible()

    await summaryLink.click()
    await expect(
      page.getByLabel(copy.search.label, { exact: true })
    ).toBeFocused()
  })
})

test.describe('consignor-select — accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('has no serious or critical axe violations on the initial render', async ({
    page
  }) => {
    await startAtConsignor(page)
    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, 'Consignor initial render')
  })

  test('has no serious or critical axe violations in the error state', async ({
    page
  }) => {
    await startAtConsignor(page)
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.consignor
      })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, 'Consignor error state')
  })
})

test.describe('consignor scope and invalid selections', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('rejects a missing address-book id and preserves the search', async ({
    page
  }) => {
    await startAtConsignor(page)
    await page.getByLabel(copy.search.label, { exact: true }).fill('Imports')
    await page.locator(FIRST_ROW_RADIO).evaluate((input) => {
      input.value = 'missing-address'
      input.checked = true
    })
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('alert').getByRole('link', { name: copy.errors.consignor })
    ).toBeVisible()
    await expect(
      page.getByLabel(copy.search.label, { exact: true })
    ).toHaveValue('Imports')
  })

  test('hides the row and rejects a deep link after switching to potatoes', async ({
    page
  }) => {
    const reference = await startAtConsignor(page)
    await rowRadio(page, TECH_IMPORTS).check()
    await saveAndContinue(page).click()
    await page.goto(`/notifications/${reference}/commodity-type`)
    await page
      .getByRole('radio', {
        name: commodityTypeCopy.typeLabels.potatoes,
        exact: true
      })
      .check()
    await saveAndContinue(page).click()
    await page.goto(`/notifications/${reference}`)
    await expect(
      page.getByRole('link', { name: hubCopy.rows.consignor.title })
    ).toHaveCount(0)
    await page.goto(consignorPathOf(reference))
    await expect(page).not.toHaveURL(PAGE_URL)
    await page.goto(`/notifications/${reference}/commodity-type`)
    await page
      .getByRole('radio', {
        name: commodityTypeCopy.typeLabels[WOOD_AND_CUT_TREES],
        exact: true
      })
      .check()
    await saveAndContinue(page).click()
    await page.goto(consignorPathOf(reference))
    await expect(page).toHaveURL(PAGE_URL)
    await expect(rowRadio(page, TECH_IMPORTS)).not.toBeChecked()
  })
})
