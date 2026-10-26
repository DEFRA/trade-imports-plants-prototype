import {
  ADDRESS_BOOK_PARTY,
  WOOD_LINE_FIELDS,
  addCommodityLine,
  addressRowRadio,
  backLink,
  changeCommodityType,
  visitOverviewThenOpen,
  chooseCommodityType,
  describeAddressPicker,
  describeSubmittedSearchPicker,
  expectNoSeriousOrCriticalViolations,
  expectThreeSaveControls,
  postAnIdNotInTheBook,
  saveAndContinue,
  saveOrigin,
  searchBox,
  startNotification
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import { BASE } from '../../../../../../../../../fit/set-base.js'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as captionsCopy } from '../../flow/section-captions/copy/copy.en.js'
import { copy as pickerCopy } from '../address-book-picker/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const HUB_URL = /\/notifications\/[^/]+$/
const PAGE_URL = /\/notifications\/[^/]+\/consignors\/select/

const FIRST_ROW_RADIO = '#consignor'

const FRANCE = 'France'
const POTATOES = 'potatoes'
const WOOD_AND_CUT_TREES = 'wood-and-cut-trees'
const CUT_CONIFEROUS_TREES = 'cut-coniferous-trees'

const consignorPathOf = (reference) =>
  `${BASE}/notifications/${reference}/consignors/select`

const startAtConsignor = async (page) => {
  const reference = await startNotification(page)
  await chooseCommodityType(page, WOOD_AND_CUT_TREES)
  await addCommodityLine(page, CUT_CONIFEROUS_TREES, WOOD_LINE_FIELDS)
  await saveOrigin(page, reference, FRANCE)
  await page.goto(consignorPathOf(reference))
  await expect(page).toHaveURL(PAGE_URL)
  return reference
}

const saveTheAddressBookParty = async (page) => {
  await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
  await saveAndContinue(page).click()
}

describeSubmittedSearchPicker({
  pickerName: 'consignor',
  openPicker: startAtConsignor
})

describeAddressPicker({
  pickerName: 'consignor-select',
  openPicker: startAtConsignor,
  pathOf: consignorPathOf,
  notInBookError: copy.errors.consignor,
  hubRowTitle: hubCopy.rows.consignor.title,
  hubUrl: HUB_URL,
  pageUrl: PAGE_URL,
  afterSaveUrl: /\/identification-numbers$/,
  firstRowRadio: FIRST_ROW_RADIO
})

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
    await expect(searchBox(page)).toBeVisible()
    await expect(
      page.getByText(pickerCopy.search.hint, { exact: true })
    ).toBeVisible()
  })

  test('is reachable from the overview consignor task row', async ({
    page
  }) => {
    const reference = await startAtConsignor(page)
    await page.goto(`${BASE}/notifications/${reference}`)

    await page.getByRole('link', { name: hubCopy.rows.consignor.title }).click()

    await expect(page).toHaveURL(PAGE_URL)
  })

  test('opened from the overview, saves the chosen address and returns to the overview', async ({
    page
  }) => {
    const reference = await startAtConsignor(page)
    await page.goto(`${BASE}/notifications/${reference}`)
    await page.getByRole('link', { name: hubCopy.rows.consignor.title }).click()
    await expect(page).toHaveURL(PAGE_URL)

    await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(HUB_URL)
    await expect(
      page
        .getByRole('listitem')
        .filter({
          has: page.getByRole('link', { name: hubCopy.rows.consignor.title })
        })
        .locator('.govuk-task-list__status')
    ).toHaveText(hubCopy.statuses.completed)
  })

  test('offers the three save controls', async ({ page }) => {
    await startAtConsignor(page)

    await expectThreeSaveControls(page)
  })

  test('sends Back to the place of destination in the opening run', async ({
    page
  }) => {
    const reference = await startAtConsignor(page)

    await expect(backLink(page)).toHaveAttribute(
      'href',
      `${BASE}/notifications/${reference}/destinations/select`
    )
  })

  test('sends Back to the overview when opened from the overview', async ({
    page
  }) => {
    const reference = await startAtConsignor(page)

    await visitOverviewThenOpen(page, reference, consignorPathOf(reference))

    await expect(backLink(page)).toHaveAttribute(
      'href',
      `${BASE}/notifications/${reference}`
    )
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
    await postAnIdNotInTheBook(page)
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

  test('hides the row and rejects a deep link after switching to potatoes', async ({
    page
  }) => {
    const reference = await startAtConsignor(page)
    await saveTheAddressBookParty(page)
    await changeCommodityType(page, reference, POTATOES)
    await page.goto(`${BASE}/notifications/${reference}`)
    await expect(
      page.getByRole('link', { name: hubCopy.rows.consignor.title })
    ).toHaveCount(0)
    await page.goto(consignorPathOf(reference))
    await expect(page).not.toHaveURL(PAGE_URL)
  })

  test('does not restore the saved consignor after switching back from potatoes', async ({
    page
  }) => {
    const reference = await startAtConsignor(page)
    await saveTheAddressBookParty(page)
    await changeCommodityType(page, reference, POTATOES)
    await changeCommodityType(page, reference, WOOD_AND_CUT_TREES)
    await page.goto(consignorPathOf(reference))
    await expect(page).toHaveURL(PAGE_URL)
    await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).not.toBeChecked()
  })
})
