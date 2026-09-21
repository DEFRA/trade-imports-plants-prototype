import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../../shared/copy.en.js'
import { copy as captionsCopy } from '../../../flow/section-captions/copy/copy.en.js'
import { copy as dashboardCopy } from '../../dashboard/copy/copy.en.js'
import { copy as typeCopy } from '../../commodity-type/copy/copy.en.js'
import { copy } from '../copy/copy.en.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'

const COMMODITY_TYPE_URL = /\/notifications\/[^/]+\/commodity-type$/
const DETAILS_URL = /\/notifications\/[^/]+\/commodities\/details$/
const DETAILS_EDIT_URL =
  /\/notifications\/[^/]+\/commodities\/details\?index=\d+$/
const LIST_URL = /\/notifications\/[^/]+\/commodities$/

const POTATOES = 'potatoes'
const PLANTS = 'plants-for-planting'
const WOOD = 'wood-and-cut-trees'
const SEED_POTATOES = 'seed-potatoes'
const TREES = 'trees-for-planting'
const HARDWOOD_CHIPS = 'hardwood-chips'
const MARIS_PIPER = 'Maris Piper'
const CATEGORY_RADIOS = 'input[name="category"]'

// accessible-autocomplete enhances the native <select>: the visible combobox
// input keeps the original id, and the hidden select still submits the value.
const GENUS_INPUT = 'input#genus'

const saveAndContinue = (page) =>
  page.getByRole('button', { name: sharedCopy.saveActions.saveAndContinue })

const categoryRadio = (page, category) =>
  page.getByRole('radio', {
    name: copy.categoryLabels[category],
    exact: true
  })

const fieldNamed = (page, field) =>
  page.getByLabel(copy.details.fields[field].label, { exact: true })

const startNotification = async (page) => {
  await page.goto('/')
  await page.getByRole('button', { name: dashboardCopy.startButton }).click()
  await expect(page).toHaveURL(COMMODITY_TYPE_URL)
}

// The opening run sends a trader from the entry question to the commodities
// list, and a list with no lines sends them straight on to this page.
const startAtDetails = async (page, commodityType) => {
  await startNotification(page)
  await page
    .getByRole('radio', {
      name: typeCopy.typeLabels[commodityType],
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(DETAILS_URL)
}

const chooseCategory = async (page, category) => {
  await categoryRadio(page, category).check()
  await page.getByRole('button', { name: copy.details.continue }).click()
  await expect(page).toHaveURL(DETAILS_EDIT_URL)
}

const fillPotatoLine = async (page) => {
  await fieldNamed(page, 'potatoVariety').fill(MARIS_PIPER)
  await fieldNamed(page, 'quantity').fill('250')
  await fieldNamed(page, 'potatoIntendedUse').fill('Planting')
}

test.describe('commodity details — choosing a category', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders the caption, the heading and the category question', async ({
    page
  }) => {
    await startAtDetails(page, POTATOES)

    await expect(
      page.getByText(captionsCopy.sections.aboutTheConsignment, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.details.heading, level: 1 })
    ).toBeVisible()
    await expect(
      page.getByRole('group', { name: copy.details.categoryLegend })
    ).toBeVisible()
  })

  test('offers only the categories the chosen commodity type allows', async ({
    page
  }) => {
    await startAtDetails(page, POTATOES)

    await expect(categoryRadio(page, SEED_POTATOES)).toBeVisible()
    await expect(categoryRadio(page, 'ware-potatoes')).toBeVisible()
    await expect(page.locator(CATEGORY_RADIOS)).toHaveCount(2)
  })

  test('offers the five wood categories with the preservative guidance', async ({
    page
  }) => {
    await startAtDetails(page, WOOD)

    await expect(page.locator(CATEGORY_RADIOS)).toHaveCount(5)
    await expect(
      page.getByRole('group', { name: copy.details.categoryLegend })
    ).toContainText(copy.details.categoryHintByCommodityType[WOOD])
  })

  test('hints the two plants categories that need explaining', async ({
    page
  }) => {
    await startAtDetails(page, PLANTS)

    const group = page.getByRole('group', {
      name: copy.details.categoryLegend
    })
    await expect(group).toContainText(copy.details.categoryHints[PLANTS])
    await expect(group).toContainText(copy.details.categoryHints[TREES])
  })

  test('shows no per-line field until a category is chosen', async ({
    page
  }) => {
    await startAtDetails(page, POTATOES)

    await expect(fieldNamed(page, 'quantity')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: copy.details.continue })
    ).toBeVisible()
  })

  test('continuing with no category shows the error and focuses the first radio', async ({
    page
  }) => {
    await startAtDetails(page, POTATOES)

    await page.getByRole('button', { name: copy.details.continue }).click()

    await expect(
      page.getByRole('group', { name: copy.details.categoryLegend })
    ).toContainText(copy.details.errors.category)

    const summaryLink = page
      .getByRole('alert')
      .getByRole('link', { name: copy.details.errors.category })
    await summaryLink.click()
    await expect(page.locator(CATEGORY_RADIOS).first()).toBeFocused()
  })

  test('has no serious or critical axe violations before or after the error', async ({
    page
  }) => {
    await startAtDetails(page, POTATOES)
    await expectNoSeriousOrCriticalViolations(
      page,
      'Commodity details, category question'
    )

    await page.getByRole('button', { name: copy.details.continue }).click()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.details.errors.category
      })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'Commodity details, category error state'
    )
  })
})

test.describe('commodity details — the fields a category asks for', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('asks a potato line for its variety, quantity and intended use', async ({
    page
  }) => {
    await startAtDetails(page, POTATOES)
    await chooseCategory(page, SEED_POTATOES)

    await expect(fieldNamed(page, 'potatoVariety')).toBeVisible()
    await expect(fieldNamed(page, 'quantity')).toBeVisible()
    await expect(fieldNamed(page, 'potatoIntendedUse')).toBeVisible()
    await expect(fieldNamed(page, 'genus')).toHaveCount(0)
    await expect(fieldNamed(page, 'commodityCode')).toHaveCount(0)
  })

  test('asks a trees-for-planting line for its size as well', async ({
    page
  }) => {
    await startAtDetails(page, PLANTS)
    await chooseCategory(page, TREES)

    await expect(fieldNamed(page, 'species')).toBeVisible()
    await expect(fieldNamed(page, 'eppoCode')).toBeVisible()
    await expect(fieldNamed(page, 'sizeOfTree')).toBeVisible()
  })

  test('asks a conifer wood line for treatments and no genus', async ({
    page
  }) => {
    await startAtDetails(page, WOOD)
    await chooseCategory(page, 'conifer-wood-with-bark')

    await expect(fieldNamed(page, 'phytosanitaryTreatments')).toBeVisible()
    await expect(fieldNamed(page, 'genus')).toHaveCount(0)
  })

  test('narrows the genus type-ahead to the hardwood genera', async ({
    page
  }) => {
    await startAtDetails(page, WOOD)
    await chooseCategory(page, HARDWOOD_CHIPS)

    const field = page.locator(GENUS_INPUT)
    await field.click()
    await field.fill('a')

    await expect(
      page.getByRole('option', { name: copy.genusLabels.Castanea })
    ).toBeVisible()
    await expect(
      page.getByRole('option', { name: copy.genusLabels.Picea })
    ).toHaveCount(0)
  })

  test('saves a line and shows it on the list', async ({ page }) => {
    await startAtDetails(page, POTATOES)
    await chooseCategory(page, SEED_POTATOES)
    await fillPotatoLine(page)

    await saveAndContinue(page).click()

    await expect(page).toHaveURL(LIST_URL)
    await expect(page.getByRole('table')).toContainText(MARIS_PIPER)
  })

  test('comes back for another line on Save and add another', async ({
    page
  }) => {
    await startAtDetails(page, POTATOES)
    await chooseCategory(page, SEED_POTATOES)
    await fillPotatoLine(page)

    await page
      .getByRole('button', { name: copy.details.saveAndAddAnother })
      .click()

    await expect(page).toHaveURL(DETAILS_URL)
    await expect(page.locator(`${CATEGORY_RADIOS}:checked`)).toHaveCount(0)
  })

  test('keeps what was typed when a required field is left blank', async ({
    page
  }) => {
    await startAtDetails(page, POTATOES)
    await chooseCategory(page, SEED_POTATOES)
    await fieldNamed(page, 'potatoVariety').fill(MARIS_PIPER)

    await saveAndContinue(page).click()

    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.details.errors.quantity.required
      })
    ).toBeVisible()
    await expect(fieldNamed(page, 'potatoVariety')).toHaveValue(MARIS_PIPER)
  })

  test('moves focus to the field an error-summary link names', async ({
    page
  }) => {
    await startAtDetails(page, POTATOES)
    await chooseCategory(page, SEED_POTATOES)

    await saveAndContinue(page).click()
    await page
      .getByRole('alert')
      .getByRole('link', { name: copy.details.errors.quantity.required })
      .click()

    await expect(fieldNamed(page, 'quantity')).toBeFocused()
  })

  test('refuses a quantity that is not a whole number above zero', async ({
    page
  }) => {
    await startAtDetails(page, POTATOES)
    await chooseCategory(page, SEED_POTATOES)
    await fillPotatoLine(page)
    await fieldNamed(page, 'quantity').fill('0')

    await saveAndContinue(page).click()

    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.details.errors.quantity.invalid
      })
    ).toBeVisible()
  })

  test('re-asks with the new fields when a saved line changes category', async ({
    page
  }) => {
    await startAtDetails(page, PLANTS)
    await chooseCategory(page, PLANTS)
    await expect(fieldNamed(page, 'sizeOfTree')).toHaveCount(0)

    await categoryRadio(page, TREES).check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(DETAILS_EDIT_URL)
    await expect(fieldNamed(page, 'sizeOfTree')).toBeVisible()
  })

  test('has no serious or critical axe violations with the fields revealed', async ({
    page
  }) => {
    await startAtDetails(page, PLANTS)
    await chooseCategory(page, TREES)

    await expectNoSeriousOrCriticalViolations(
      page,
      'Commodity details, fields revealed'
    )

    await saveAndContinue(page).click()
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'Commodity details, field error state'
    )
  })
})
