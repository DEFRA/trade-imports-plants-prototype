import {
  addCommodityLine,
  chooseCommodityType,
  backLink,
  visitOverviewThenOpen,
  expectNoSeriousOrCriticalViolations,
  expectThreeSaveControls,
  saveAndContinue,
  saveOrigin,
  startNotification,
  startWoodNotificationWithOriginSaved
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import { BASE, setUrl } from '../../../../../../../../../fit/set-base.js'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as captionsCopy } from '../../flow/section-captions/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { PLANTS_WOOD_DAYS_AFTER_ARRIVAL } from '../timing-windows.js'
import {
  ALREADY_ARRIVED,
  ARRIVAL_STATUSES,
  NOT_YET_ARRIVED
} from './statuses.js'
import { copy } from './copy/copy.en.js'

const HUB_URL = setUrl('/notifications/[^/]+$')
const PAGE_URL = setUrl('/notifications/[^/]+/arrival-status$')
const ARRIVAL_DETAILS_URL = setUrl('/notifications/[^/]+/arrival-details$')

const STATUS_INPUT_SELECTOR = 'input[name="arrivalStatus"]'

const POTATOES = 'potatoes'
const WARE_POTATOES = 'ware-potatoes'
const SPAIN = 'Spain'

const WARE_POTATO_LINE_FIELDS = {
  potatoVariety: 'Maris Piper',
  quantity: '250',
  potatoIntendedUse: 'Eating'
}

const radioFor = (page, value) =>
  page.getByRole('radio', { name: copy.statusLabels[value], exact: true })

const arrivalStatusPathOf = (reference) =>
  `${BASE}/notifications/${reference}/arrival-status`

const startAtArrivalStatus = async (page) => {
  const reference = await startWoodNotificationWithOriginSaved(page)
  await expect(page).toHaveURL(PAGE_URL)
  return reference
}

test.describe('arrival-status feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders the caption and the legend as the page heading', async ({
    page
  }) => {
    await startAtArrivalStatus(page)

    await expect(
      page.getByText(captionsCopy.sections.arrival, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.legend, level: 1 })
    ).toBeVisible()
  })

  test('asks about Great Britain rather than England', async ({ page }) => {
    await startAtArrivalStatus(page)

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toContainText('Great Britain')
    await expect(heading).not.toContainText('England')
  })

  test('offers both statuses, already arrived first, each with its timing hint', async ({
    page
  }) => {
    await startAtArrivalStatus(page)

    const group = page.getByRole('group', { name: copy.legend })
    const radios = group.locator(STATUS_INPUT_SELECTOR)
    await expect(radios).toHaveCount(ARRIVAL_STATUSES.length)
    const renderedValues = await radios.evaluateAll((inputs) =>
      inputs.map((input) => input.value)
    )

    expect(renderedValues).toEqual([ALREADY_ARRIVED, NOT_YET_ARRIVED])
    await expect(group).toContainText(
      copy.statusHints[ALREADY_ARRIVED](PLANTS_WOOD_DAYS_AFTER_ARRIVAL)
    )
    await expect(group).toContainText(copy.statusHints[NOT_YET_ARRIVED])
  })

  test('offers the three save controls and sends Back to origin in the opening run', async ({
    page
  }) => {
    const reference = await startAtArrivalStatus(page)

    await expectThreeSaveControls(page)
    await expect(backLink(page)).toHaveAttribute(
      'href',
      `${BASE}/notifications/${reference}/origin`
    )
  })

  test('sends Back to the overview when opened from the overview', async ({
    page
  }) => {
    const reference = await startAtArrivalStatus(page)

    await visitOverviewThenOpen(page, reference, arrivalStatusPathOf(reference))

    await expect(backLink(page)).toHaveAttribute(
      'href',
      `${BASE}/notifications/${reference}`
    )
  })

  test('saves a choice, reaches the arrival details and shows it again on return', async ({
    page
  }) => {
    const reference = await startAtArrivalStatus(page)

    await radioFor(page, ALREADY_ARRIVED).check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ARRIVAL_DETAILS_URL)

    await page.goto(arrivalStatusPathOf(reference))
    await expect(radioFor(page, ALREADY_ARRIVED)).toBeChecked()
  })

  test('is reachable from the overview arrival task row', async ({ page }) => {
    const reference = await startAtArrivalStatus(page)
    await page.goto(`${BASE}/notifications/${reference}`)

    await page.getByRole('link', { name: hubCopy.rows.arrival.title }).click()

    await expect(page).toHaveURL(PAGE_URL)
  })

  test('Save and return to overview saves the choice and reaches the overview', async ({
    page
  }) => {
    const reference = await startAtArrivalStatus(page)

    await radioFor(page, NOT_YET_ARRIVED).check()
    await page
      .getByRole('button', {
        name: sharedCopy.saveActions.saveAndReturnToHub
      })
      .click()

    await expect(page).toHaveURL(HUB_URL)

    await page.goto(arrivalStatusPathOf(reference))
    await expect(radioFor(page, NOT_YET_ARRIVED)).toBeChecked()
  })

  test('Cancel and return to overview reaches the overview without saving', async ({
    page
  }) => {
    const reference = await startAtArrivalStatus(page)

    await radioFor(page, ALREADY_ARRIVED).check()
    await page
      .getByRole('link', {
        name: sharedCopy.saveActions.cancelAndReturnToHub
      })
      .click()

    await expect(page).toHaveURL(HUB_URL)

    await page.goto(arrivalStatusPathOf(reference))
    await expect(page.locator(`${STATUS_INPUT_SELECTOR}:checked`)).toHaveCount(
      0
    )
  })

  test('continuing with nothing chosen shows the error and focuses the first radio', async ({
    page
  }) => {
    await startAtArrivalStatus(page)

    await saveAndContinue(page).click()

    await expect(page).toHaveURL(PAGE_URL)
    await expect(page.getByRole('group', { name: copy.legend })).toContainText(
      copy.errors.arrivalStatus
    )

    const summaryLink = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.arrivalStatus })
    await expect(summaryLink).toBeVisible()

    await summaryLink.click()
    await expect(page.locator(STATUS_INPUT_SELECTOR).first()).toBeFocused()
  })

  test('rejects a status the page does not offer and checks nothing', async ({
    page
  }) => {
    await startAtArrivalStatus(page)

    await page
      .locator(STATUS_INPUT_SELECTOR)
      .first()
      .evaluate((input) => {
        input.value = 'maybe'
        input.checked = true
      })
    await saveAndContinue(page).click()

    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.arrivalStatus
      })
    ).toBeVisible()
    await expect(page.locator(`${STATUS_INPUT_SELECTOR}:checked`)).toHaveCount(
      0
    )
  })

  test('recovers from the error once a choice is made', async ({ page }) => {
    await startAtArrivalStatus(page)
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.arrivalStatus
      })
    ).toBeVisible()

    await radioFor(page, NOT_YET_ARRIVED).check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ARRIVAL_DETAILS_URL)
  })

  test('has no serious or critical axe violations on the initial render', async ({
    page
  }) => {
    await startAtArrivalStatus(page)
    await expect(
      page.getByRole('heading', { name: copy.legend, level: 1 })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'Arrival status initial render'
    )
  })

  test('has no serious or critical axe violations in the error state', async ({
    page
  }) => {
    await startAtArrivalStatus(page)
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.arrivalStatus
      })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'Arrival status error state'
    )
  })
})

test.describe('arrival-status — the question potatoes are never asked', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('sends a potato notification from origin past the question to the details', async ({
    page
  }) => {
    const reference = await startNotification(page)
    await chooseCommodityType(page, POTATOES)
    await addCommodityLine(page, WARE_POTATOES, WARE_POTATO_LINE_FIELDS)
    await saveOrigin(page, reference, SPAIN)

    await expect(page).toHaveURL(ARRIVAL_DETAILS_URL)
  })

  test('opens the arrival row on the overview at the details page for a potato notification', async ({
    page
  }) => {
    const reference = await startNotification(page)
    await chooseCommodityType(page, POTATOES)
    await addCommodityLine(page, WARE_POTATOES, WARE_POTATO_LINE_FIELDS)
    await saveOrigin(page, reference, SPAIN)
    await page.goto(`${BASE}/notifications/${reference}`)

    await expect(
      page
        .locator('.govuk-task-list')
        .getByRole('link', { name: hubCopy.rows.arrival.title })
    ).toHaveAttribute(
      'href',
      `${BASE}/notifications/${reference}/arrival-details`
    )
  })

  test('opens the arrival row on the overview for a wood notification', async ({
    page
  }) => {
    const reference = await startAtArrivalStatus(page)
    await page.goto(`${BASE}/notifications/${reference}`)

    await expect(
      page
        .locator('.govuk-task-list')
        .getByRole('link', { name: hubCopy.rows.arrival.title })
    ).toHaveAttribute('href', arrivalStatusPathOf(reference))
  })
})
