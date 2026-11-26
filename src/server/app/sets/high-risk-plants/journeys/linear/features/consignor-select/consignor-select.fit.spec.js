import {
  errorSummaryLinks,
  AARHUS,
  TECH_IMPORTS_NAME,
  NORTHGATE,
  WESTBROOK,
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
  saveAndReturnToHub,
  saveOrigin,
  searchBox,
  startNotification,
  startWoodNotificationAtPlaceOfDestination
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import {
  BASE,
  notificationPageWithTrail,
  pagePathWithTrail,
  pageUrlWithTrail,
  setUrl
} from '../../../../../../../../../fit/set-base.js'
import { TRAIL_START } from '../../../../../../shared/trail.js'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as captionsCopy } from '../../flow/section-captions/copy/copy.en.js'
import { copy as pickerCopy } from '../address-book-picker/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const HUB_URL = setUrl('/notifications/[^/]+$')
const PAGE_PATH = '/notifications/[^/]+/consignors/select'
const PAGE_URL = setUrl(PAGE_PATH)
const DESTINATION_PATH = '/notifications/[^/]+/destinations/select'
const TRAIL_TO_DESTINATION = ['origin', 'arrival-status', 'arrival-details']
const OVERVIEW_PAGE_URL = pageUrlWithTrail(PAGE_PATH, [TRAIL_START.overview])
const AFTER_DESTINATION_PAGE_URL = pageUrlWithTrail(PAGE_PATH, [
  ...TRAIL_TO_DESTINATION,
  'destinations/select'
])
const IDENTIFICATION_NUMBERS_URL = notificationPageWithTrail(
  'identification-numbers',
  ['consignors/select']
)

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

const saveTheConsignorAddress = async (page) => {
  await addressRowRadio(page, NORTHGATE).check()
  await saveAndContinue(page).click()
}

const saveTheDestinationAddress = async (page) => {
  await addressRowRadio(page, TECH_IMPORTS_NAME).check()
  await saveAndContinue(page).click()
}

describeSubmittedSearchPicker({
  pickerName: 'consignor',
  openPicker: startAtConsignor,
  roleAddress: NORTHGATE,
  denmarkMatch: AARHUS
})

describeAddressPicker({
  pickerName: 'consignor-select',
  openPicker: startAtConsignor,
  pathOf: consignorPathOf,
  notInBookError: copy.errors.consignor,
  hubRowTitle: hubCopy.rows.consignor.title,
  hubUrl: HUB_URL,
  pageUrl: PAGE_URL,
  afterSaveUrl: IDENTIFICATION_NUMBERS_URL,
  firstRowRadio: FIRST_ROW_RADIO,
  roleAddress: NORTHGATE,
  secondRoleAddress: WESTBROOK,
  rolelessAddress: 'Unlisted Traders Ltd',
  otherRoleAddress: 'Tech Imports Ltd',
  denmarkMatch: AARHUS,
  wholeCount: 9
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
      page.getByText(captionsCopy.sections.addresses, { exact: true })
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

    await expect(page).toHaveURL(OVERVIEW_PAGE_URL)
  })

  test('opened from the overview, saves the chosen address and returns to the overview', async ({
    page
  }) => {
    const reference = await startAtConsignor(page)
    await page.goto(`${BASE}/notifications/${reference}`)
    await page.getByRole('link', { name: hubCopy.rows.consignor.title }).click()
    await expect(page).toHaveURL(OVERVIEW_PAGE_URL)

    await addressRowRadio(page, NORTHGATE).check()
    await saveAndReturnToHub(page).click()

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

  test('sends Back to the place of destination after Save and continue from it', async ({
    page
  }) => {
    await startWoodNotificationAtPlaceOfDestination(page)
    await saveTheDestinationAddress(page)
    await expect(page).toHaveURL(AFTER_DESTINATION_PAGE_URL)

    await expect(backLink(page)).toHaveAttribute(
      'href',
      pagePathWithTrail(DESTINATION_PATH, TRAIL_TO_DESTINATION)
    )
    await backLink(page).click()

    await expect(page).toHaveURL(
      pageUrlWithTrail(DESTINATION_PATH, TRAIL_TO_DESTINATION)
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
    await expect(errorSummaryLinks(page, copy.errors.consignor)).toBeVisible()

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
    await saveTheConsignorAddress(page)
    await changeCommodityType(page, reference, POTATOES)
    await page.goto(`${BASE}/notifications/${reference}`)
    await expect(
      page.getByRole('link', { name: hubCopy.rows.consignor.title })
    ).toHaveCount(0)
    await page.goto(consignorPathOf(reference))
    await expect(page).toHaveURL(HUB_URL)
  })

  test('does not restore the saved consignor after switching back from potatoes', async ({
    page
  }) => {
    const reference = await startAtConsignor(page)
    await saveTheConsignorAddress(page)
    await changeCommodityType(page, reference, POTATOES)
    await changeCommodityType(page, reference, WOOD_AND_CUT_TREES)
    await page.goto(consignorPathOf(reference))
    await expect(page).toHaveURL(PAGE_URL)
    await expect(addressRowRadio(page, NORTHGATE)).not.toBeChecked()
  })
})
