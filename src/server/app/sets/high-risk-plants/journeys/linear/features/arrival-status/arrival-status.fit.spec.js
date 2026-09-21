import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as captionsCopy } from '../../flow/section-captions/copy/copy.en.js'
import { copy as commoditiesCopy } from '../commodities/copy/copy.en.js'
import { copy as commodityTypeCopy } from '../commodity-type/copy/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { PLANTS_WOOD_DAYS_AFTER_ARRIVAL } from '../timing-windows.js'
import {
  ALREADY_ARRIVED,
  ARRIVAL_STATUSES,
  NOT_YET_ARRIVED
} from './statuses.js'
import { copy } from './copy/copy.en.js'

const COMMODITY_TYPE_URL = /\/notifications\/[^/]+\/commodity-type$/
const COMMODITY_DETAILS_URL = /\/notifications\/[^/]+\/commodities\/details/
const COMMODITY_LIST_URL = /\/notifications\/[^/]+\/commodities$/
const ORIGIN_URL = /\/notifications\/[^/]+\/origin$/
const HUB_URL = /\/notifications\/[^/]+$/
const PAGE_URL = /\/notifications\/[^/]+\/arrival-status$/
const ARRIVAL_DETAILS_URL = /\/notifications\/[^/]+\/arrival-details$/
const JOURNEY_ID_SEGMENT = 2

const STATUS_INPUT_SELECTOR = 'input[name="arrivalStatus"]'
const COUNTRY_INPUT = 'input#countryOfOrigin'

const FRANCE = 'France'
const CUT_CONIFEROUS_TREES = 'cut-coniferous-trees'
const WOOD_AND_CUT_TREES = 'wood-and-cut-trees'
const POTATOES = 'potatoes'
const WARE_POTATOES = 'ware-potatoes'
const SPAIN = 'Spain'

const WOOD_LINE_FIELDS = {
  commodityCode: '06042020',
  quantity: '40',
  sizeOfTree: '3.5',
  phytosanitaryTreatments: 'Heat treatment'
}

const WARE_POTATO_LINE_FIELDS = {
  potatoVariety: 'Maris Piper',
  quantity: '250',
  potatoIntendedUse: 'Eating'
}

const backLink = (page) =>
  page.getByRole('link', { name: sharedCopy.layout.back, exact: true })

const saveAndContinue = (page) =>
  page.getByRole('button', { name: sharedCopy.saveActions.saveAndContinue })

const radioFor = (page, value) =>
  page.getByRole('radio', { name: copy.statusLabels[value], exact: true })

const arrivalStatusPathOf = (reference) =>
  `/notifications/${reference}/arrival-status`

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

/** A wood notification, walked as far as the arrival question. Wood and plants
 * for planting are the two commodity types this page is asked of. */
const startAtArrivalStatus = async (page) => {
  const reference = await startNotification(page)
  await chooseCommodityType(page, WOOD_AND_CUT_TREES)
  await addLine(page, CUT_CONIFEROUS_TREES, WOOD_LINE_FIELDS)
  await saveOrigin(page, reference, FRANCE)
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
    // `evaluateAll` does not auto-wait, so the radios are asserted present
    // before their values are read — otherwise a slow render reads an empty
    // list and the order assertion below passes judgement on nothing.
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

  test('offers the three save controls and sends Back to the overview', async ({
    page
  }) => {
    const reference = await startAtArrivalStatus(page)

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
    await expect(backLink(page)).toHaveAttribute(
      'href',
      `/notifications/${reference}`
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
    await page.goto(`/notifications/${reference}`)

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
    await addLine(page, WARE_POTATOES, WARE_POTATO_LINE_FIELDS)
    await saveOrigin(page, reference, SPAIN)

    await expect(page).toHaveURL(ARRIVAL_DETAILS_URL)
  })

  test('opens the arrival row on the overview at the details page for a potato notification', async ({
    page
  }) => {
    const reference = await startNotification(page)
    await chooseCommodityType(page, POTATOES)
    await addLine(page, WARE_POTATOES, WARE_POTATO_LINE_FIELDS)
    await saveOrigin(page, reference, SPAIN)
    await page.goto(`/notifications/${reference}`)

    await expect(
      page
        .locator('.govuk-task-list')
        .getByRole('link', { name: hubCopy.rows.arrival.title })
    ).toHaveAttribute('href', `/notifications/${reference}/arrival-details`)
  })

  test('opens the arrival row on the overview for a wood notification', async ({
    page
  }) => {
    const reference = await startAtArrivalStatus(page)
    await page.goto(`/notifications/${reference}`)

    await expect(
      page
        .locator('.govuk-task-list')
        .getByRole('link', { name: hubCopy.rows.arrival.title })
    ).toHaveAttribute('href', arrivalStatusPathOf(reference))
  })
})
