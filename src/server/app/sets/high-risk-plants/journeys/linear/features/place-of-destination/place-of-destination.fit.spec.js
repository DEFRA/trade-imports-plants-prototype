import {
  WOOD_LINE_FIELDS,
  addCommodityLine,
  backLink,
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
import { BASE, setUrl } from '../../../../../../../../../fit/set-base.js'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as captionsCopy } from '../../flow/section-captions/copy/copy.en.js'
import { copy as pickerCopy } from '../address-book-picker/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy as arrivalStatusCopy } from '../arrival-status/copy/copy.en.js'
import { ALREADY_ARRIVED } from '../arrival-status/statuses.js'
import { copy } from './copy/copy.en.js'

const ARRIVAL_STATUS_URL = setUrl('/notifications/[^/]+/arrival-status$')
const HUB_URL = setUrl('/notifications/[^/]+$')
const PAGE_URL = setUrl('/notifications/[^/]+/destinations/select')

const FIRST_ROW_RADIO = '#placeOfDestination'

const FRANCE = 'France'
const POTATOES = 'potatoes'
const SEED_POTATOES = 'seed-potatoes'
const WOOD_AND_CUT_TREES = 'wood-and-cut-trees'
const CUT_CONIFEROUS_TREES = 'cut-coniferous-trees'

const SEED_POTATO_LINE_FIELDS = {
  potatoVariety: 'Maris Piper',
  quantity: '250',
  potatoIntendedUse: 'Planting'
}

const destinationPathOf = (reference) =>
  `${BASE}/notifications/${reference}/destinations/select`

const startAtDestination = async (page) => {
  const reference = await startNotification(page)
  await chooseCommodityType(page, POTATOES)
  await addCommodityLine(page, SEED_POTATOES, SEED_POTATO_LINE_FIELDS)
  await saveOrigin(page, reference, FRANCE)
  await page.goto(destinationPathOf(reference))
  await expect(page).toHaveURL(PAGE_URL)
  return reference
}

const startAtDestinationAlreadyArrived = async (page) => {
  const reference = await startNotification(page)
  await chooseCommodityType(page, WOOD_AND_CUT_TREES)
  await addCommodityLine(page, CUT_CONIFEROUS_TREES, WOOD_LINE_FIELDS)
  await saveOrigin(page, reference, FRANCE)
  await expect(page).toHaveURL(ARRIVAL_STATUS_URL)
  await page
    .getByRole('radio', {
      name: arrivalStatusCopy.statusLabels[ALREADY_ARRIVED],
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
  await page.goto(destinationPathOf(reference))
  await expect(page).toHaveURL(PAGE_URL)
  return reference
}

describeSubmittedSearchPicker({
  pickerName: 'place of destination',
  openPicker: startAtDestination
})

describeAddressPicker({
  pickerName: 'place-of-destination',
  openPicker: startAtDestination,
  pathOf: destinationPathOf,
  notInBookError: copy.errors.placeOfDestination,
  hubRowTitle: hubCopy.rows.destination.title,
  hubUrl: HUB_URL,
  pageUrl: PAGE_URL,
  afterSaveUrl: /\/identification-numbers$/,
  firstRowRadio: FIRST_ROW_RADIO
})

test.describe('place-of-destination feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders the caption, the heading, the description and the search box', async ({
    page
  }) => {
    await startAtDestination(page)

    await expect(
      page.getByText(captionsCopy.sections.destination, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.headings.potatoes, level: 1 })
    ).toBeVisible()
    await expect(
      page.getByText(copy.descriptions.potatoes, { exact: true })
    ).toBeVisible()
    await expect(searchBox(page)).toBeVisible()
    await expect(
      page.getByText(pickerCopy.search.hint, { exact: true })
    ).toBeVisible()
  })

  test('is reachable from the overview destination task row', async ({
    page
  }) => {
    const reference = await startAtDestination(page)
    await page.goto(`${BASE}/notifications/${reference}`)

    await page
      .getByRole('link', { name: hubCopy.rows.destination.title })
      .click()

    await expect(page).toHaveURL(PAGE_URL)
  })

  test('offers the three save controls', async ({ page }) => {
    await startAtDestination(page)

    await expectThreeSaveControls(page)
  })

  test('sends Back to the arrival details in the opening run', async ({
    page
  }) => {
    const reference = await startAtDestination(page)

    await expect(backLink(page)).toHaveAttribute(
      'href',
      `${BASE}/notifications/${reference}/arrival-details`
    )
  })

  test('sends Back to the overview when opened from the overview', async ({
    page
  }) => {
    const reference = await startAtDestination(page)

    await visitOverviewThenOpen(page, reference, destinationPathOf(reference))

    await expect(backLink(page)).toHaveAttribute(
      'href',
      `${BASE}/notifications/${reference}`
    )
  })
})

test.describe('place-of-destination — accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('has no serious or critical axe violations on the initial render', async ({
    page
  }) => {
    await startAtDestination(page)
    await expect(
      page.getByRole('heading', { name: copy.headings.potatoes, level: 1 })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'Place of destination initial render'
    )
  })

  test('has no serious or critical axe violations in the error state', async ({
    page
  }) => {
    await startAtDestination(page)
    await postAnIdNotInTheBook(page)
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.placeOfDestination
      })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'Place of destination error state'
    )
  })
})

test.describe('place-of-destination — the question it asks once the consignment is here', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('asks a consignment already in Great Britain where it is now', async ({
    page
  }) => {
    await startAtDestinationAlreadyArrived(page)

    await expect(
      page.getByRole('heading', {
        name: copy.headings[ALREADY_ARRIVED],
        level: 1
      })
    ).toBeVisible()
    await expect(
      page.getByText(copy.descriptions[ALREADY_ARRIVED], { exact: true })
    ).toBeVisible()
  })
})
