import {
  ADDRESS_BOOK_PARTY,
  WOOD_LINE_FIELDS,
  addCommodityLine,
  addressRowRadio,
  chooseCommodityType,
  expectNoSeriousOrCriticalViolations,
  saveAndContinue,
  saveOrigin,
  startNotification
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import {
  BASE,
  journeyIdFromPage
} from '../../../../../../../../../fit/set-base.js'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as pickerCopy } from '../address-book-picker/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const CONTACT_URL = /\/notifications\/[^/]+\/consignment\/contact\/select$/
const EDIT_URL = /\/notifications\/[^/]+\/consignment\/contact\/edit\?/

const FRANCE = 'France'
const WOOD_AND_CUT_TREES = 'wood-and-cut-trees'
const CUT_CONIFEROUS_TREES = 'cut-coniferous-trees'
const ADDRESS_BOOK_PARTY_POSTCODE = 'E14 9GE'
const EDITED_NAME = 'Tech Imports (UK) Ltd'
const CURRENT_CONTACT = pickerCopy.parties.contactAddress.current

const currentContactCard = (page) =>
  page.getByRole('region', { name: CURRENT_CONTACT })

const openContactEdit = async (page) => {
  const reference = await startNotification(page)
  await chooseCommodityType(page, WOOD_AND_CUT_TREES)
  await addCommodityLine(page, CUT_CONIFEROUS_TREES, WOOD_LINE_FIELDS)
  await saveOrigin(page, reference, FRANCE)
  const contactPath = `${BASE}/notifications/${reference}/consignment/contact/select`
  await page.goto(contactPath)
  await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
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
    await expect(page.getByLabel(copy.fields.name)).toHaveValue(
      ADDRESS_BOOK_PARTY
    )
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
    await expect(currentContactCard(page)).toContainText(ADDRESS_BOOK_PARTY)
    await expect(currentContactCard(page)).toContainText(
      ADDRESS_BOOK_PARTY_POSTCODE
    )
    await expect(currentContactCard(page)).not.toContainText(EDITED_NAME)
  })

  test('cancel leaves the copy as it was', async ({ page }) => {
    await page.getByLabel(copy.fields.name).fill(EDITED_NAME)
    await page.getByRole('button', { name: copy.cancel }).click()

    await expect(page).toHaveURL(CONTACT_URL)
    await expect(currentContactCard(page)).toContainText(ADDRESS_BOOK_PARTY)
    await expect(currentContactCard(page)).not.toContainText(EDITED_NAME)
  })

  test('edit page has no serious or critical axe violations', async ({
    page
  }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Edit address details')
  })
})
