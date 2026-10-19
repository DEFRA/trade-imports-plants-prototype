import {
  BASE,
  journeyIdFromPage
} from '../../../../../../../../../fit/set-base.js'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as commoditiesCopy } from '../commodities/copy/copy.en.js'
import { copy as commodityTypeCopy } from '../commodity-type/copy/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as contactCopy } from '../consignment-contact-select/copy/copy.en.js'
import { copy as pickerCopy } from '../address-book-picker/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const COMMODITY_TYPE_URL = /\/notifications\/[^/]+\/commodity-type$/
const COMMODITY_DETAILS_URL = /\/notifications\/[^/]+\/commodities\/details/
const COMMODITY_LIST_URL = /\/notifications\/[^/]+\/commodities$/
const CONTACT_URL = /\/notifications\/[^/]+\/consignment\/contact\/select$/
const EDIT_URL = /\/notifications\/[^/]+\/consignment\/contact\/edit\?/

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

const TECH_IMPORTS = 'Tech Imports Ltd'
const TECH_IMPORTS_POSTCODE = 'E14 9GE'
const EDITED_NAME = 'Tech Imports (UK) Ltd'
const CURRENT_CONTACT = pickerCopy.parties.contactAddress.current

const saveAndContinue = (page) =>
  page.getByRole('button', { name: sharedCopy.saveActions.saveAndContinue })

const currentContactCard = (page) =>
  page.getByRole('region', { name: CURRENT_CONTACT })

const startNotification = async (page) => {
  await page.goto(BASE)
  await page.getByRole('button', { name: dashboardCopy.startButton }).click()
  await expect(page).toHaveURL(COMMODITY_TYPE_URL)
  return journeyIdFromPage(page)
}

const addWoodLine = async (page) => {
  await page
    .getByRole('radio', {
      name: commodityTypeCopy.typeLabels[WOOD_AND_CUT_TREES],
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(COMMODITY_DETAILS_URL)
  await page
    .getByRole('radio', {
      name: commoditiesCopy.categoryLabels[CUT_CONIFEROUS_TREES],
      exact: true
    })
    .check()
  await page
    .getByRole('button', { name: commoditiesCopy.details.continue })
    .click()
  for (const [field, value] of Object.entries(WOOD_LINE_FIELDS)) {
    await page
      .getByLabel(commoditiesCopy.details.fields[field].label, { exact: true })
      .fill(value)
  }
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(COMMODITY_LIST_URL)
}

const saveOrigin = async (page, reference) => {
  await page.goto(`${BASE}/notifications/${reference}/origin`)
  const field = page.locator(COUNTRY_INPUT)
  await field.click()
  await field.fill(FRANCE)
  await page.getByRole('option', { name: FRANCE, exact: true }).click()
  await saveAndContinue(page).click()
}

const openContactEdit = async (page) => {
  const reference = await startNotification(page)
  await addWoodLine(page)
  await saveOrigin(page, reference)
  const contactPath = `${BASE}/notifications/${reference}/consignment/contact/select`
  await page.goto(contactPath)
  await page
    .getByRole('radio', {
      name: `${contactCopy.selectRowPrefix} ${TECH_IMPORTS}`,
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
  await page.goto(contactPath)
  await currentContactCard(page)
    .getByRole('link', { name: new RegExp(`^${pickerCopy.editDetails}`) })
    .click()
  await expect(page).toHaveURL(EDIT_URL)
}

test.describe('edit a copied address', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openContactEdit(page)
  })

  test('opens pre-filled from the copy, captioned with the role, with County', async ({
    page
  }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: copy.title })
    ).toBeVisible()
    await expect(
      page.getByText(pickerCopy.parties.contactAddress.title, { exact: true })
    ).toBeVisible()
    await expect(page.getByLabel(copy.fields.name)).toHaveValue(TECH_IMPORTS)
    await expect(page.getByLabel(copy.fields.county)).toBeVisible()
    await expect(page.getByLabel(copy.fields.countryCode)).toHaveValue('GB')
  })

  test('saves the edit to this notification and returns to the picker', async ({
    page
  }) => {
    await page.getByLabel(copy.fields.name).fill(EDITED_NAME)
    await page.getByRole('button', { name: copy.save }).click()

    await expect(page).toHaveURL(CONTACT_URL)
    await expect(currentContactCard(page)).toContainText(EDITED_NAME)
  })

  test('shows the address-book message for a field that breaks the rules, and saves nothing', async ({
    page
  }) => {
    await page.getByLabel(copy.fields.name).fill(EDITED_NAME)
    await page.getByLabel(copy.fields.postcode).fill('')
    await page.getByRole('button', { name: copy.save }).click()

    const link = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.postcode.required })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.getByLabel(copy.fields.postcode)).toBeFocused()

    await page.goto(
      `${BASE}/notifications/${journeyIdFromPage(page)}/consignment/contact/select`
    )
    await expect(currentContactCard(page)).toContainText(TECH_IMPORTS)
    await expect(currentContactCard(page)).toContainText(TECH_IMPORTS_POSTCODE)
    await expect(currentContactCard(page)).not.toContainText(EDITED_NAME)
  })

  test('cancel leaves the copy as it was', async ({ page }) => {
    await page.getByLabel(copy.fields.name).fill(EDITED_NAME)
    await page.getByRole('button', { name: copy.cancel }).click()

    await expect(page).toHaveURL(CONTACT_URL)
    await expect(currentContactCard(page)).toContainText(TECH_IMPORTS)
    await expect(currentContactCard(page)).not.toContainText(EDITED_NAME)
  })

  test('edit page has no serious or critical axe violations', async ({
    page
  }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )
    expect(
      seriousOrCritical,
      `Edit address details: ${JSON.stringify(seriousOrCritical, null, 2)}`
    ).toEqual([])
  })
})
