import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import {
  copy as sharedCopy,
  validatorDefaults
} from '../../../../../../shared/copy.en.js'
import { copy as captionsCopy } from '../../flow/section-captions/copy/copy.en.js'
import { copy as arrivalStatusCopy } from '../arrival-status/copy/copy.en.js'
import { ALREADY_ARRIVED, NOT_YET_ARRIVED } from '../arrival-status/statuses.js'
import { copy as commoditiesCopy } from '../commodities/copy/copy.en.js'
import { copy as commodityTypeCopy } from '../commodity-type/copy/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const COMMODITY_TYPE_URL = /\/notifications\/[^/]+\/commodity-type$/
const COMMODITY_DETAILS_URL = /\/notifications\/[^/]+\/commodities\/details/
const COMMODITY_LIST_URL = /\/notifications\/[^/]+\/commodities$/
const ORIGIN_URL = /\/notifications\/[^/]+\/origin$/
const ARRIVAL_STATUS_URL = /\/notifications\/[^/]+\/arrival-status$/
const PAGE_URL = /\/notifications\/[^/]+\/arrival-details$/
const HUB_URL = /\/notifications\/[^/]+$/
// Continue from here goes on to the place of destination, the last step of the
// opening run, rather than straight back to the overview.
const DESTINATION_URL = /\/notifications\/[^/]+\/destinations\/select$/
const JOURNEY_ID_SEGMENT = 2

const DATE_INPUT = 'input#arrivalDate'
const TIME_INPUT = 'input#arrivalTime'
// accessible-autocomplete enhances the native <select>: the visible combobox
// input keeps the original id, and the hidden select still submits the value.
const PORT_INPUT = 'input#proposedPlaceOfLanding'
const PORT_SELECT = 'select[name="proposedPlaceOfLanding"]'
const UNOFFERED_PORT = 'GB ZZZ'
const COUNTRY_INPUT = 'input#countryOfOrigin'

const POTATOES = 'potatoes'
const WARE_POTATOES = 'ware-potatoes'
const WOOD_AND_CUT_TREES = 'wood-and-cut-trees'
const CUT_CONIFEROUS_TREES = 'cut-coniferous-trees'
const SPAIN = 'Spain'
const FRANCE = 'France'

const A_DATE = '27/3/2026'
const A_PAST_DATE = '1/1/2020'
const A_TIME = '14:30'
const DOVER = 'Port of Dover (GB DVR)'

const WARE_POTATO_LINE_FIELDS = {
  potatoVariety: 'Maris Piper',
  quantity: '250',
  potatoIntendedUse: 'Eating'
}

const WOOD_LINE_FIELDS = {
  commodityCode: '06042020',
  quantity: '40',
  sizeOfTree: '3.5',
  phytosanitaryTreatments: 'Heat treatment'
}

const backLink = (page) =>
  page.getByRole('link', { name: sharedCopy.layout.back, exact: true })

const saveAndContinue = (page) =>
  page.getByRole('button', { name: sharedCopy.saveActions.saveAndContinue })

const arrivalDetailsPathOf = (reference) =>
  `/notifications/${reference}/arrival-details`

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

const chooseFromAutocomplete = async (page, selector, name) => {
  const field = page.locator(selector)
  await field.click()
  await field.fill(name)
  await page.getByRole('option', { name, exact: true }).click()
}

const saveOrigin = async (page, reference, country) => {
  await page.goto(`/notifications/${reference}/origin`)
  await expect(page).toHaveURL(ORIGIN_URL)
  await chooseFromAutocomplete(page, COUNTRY_INPUT, country)
  await saveAndContinue(page).click()
}

/** A ware-potato notification, walked as far as the arrival details. Potatoes
 * are never asked the arrival question, so the run lands here from origin. */
const startAtPotatoDetails = async (page) => {
  const reference = await startNotification(page)
  await chooseCommodityType(page, POTATOES)
  await addLine(page, WARE_POTATOES, WARE_POTATO_LINE_FIELDS)
  await saveOrigin(page, reference, SPAIN)
  await expect(page).toHaveURL(PAGE_URL)
  return reference
}

/** A wood notification, walked as far as the arrival details through the
 * arrival question, answering it with the status given. */
const startAtWoodDetails = async (page, status) => {
  const reference = await startNotification(page)
  await chooseCommodityType(page, WOOD_AND_CUT_TREES)
  await addLine(page, CUT_CONIFEROUS_TREES, WOOD_LINE_FIELDS)
  await saveOrigin(page, reference, FRANCE)
  await expect(page).toHaveURL(ARRIVAL_STATUS_URL)
  await page
    .getByRole('radio', {
      name: arrivalStatusCopy.statusLabels[status],
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
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

test.describe('arrival-details — a potato notification', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders the caption, the heading and the three save controls', async ({
    page
  }) => {
    const reference = await startAtPotatoDetails(page)

    await expect(
      page.getByText(captionsCopy.sections.arrival, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()
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

  test('asks for the expected date of arrival, the time and the place of landing', async ({
    page
  }) => {
    await startAtPotatoDetails(page)

    await expect(
      page.getByLabel(copy.dateLabels.potatoes, { exact: true })
    ).toBeVisible()
    await expect(page.getByText(copy.dateHints.potatoes)).toBeVisible()
    await expect(
      page.getByLabel(copy.time.label, { exact: true })
    ).toBeVisible()
    await expect(page.getByText(copy.time.hint)).toBeVisible()
    await expect(
      page.getByLabel(copy.placeOfLanding.label, { exact: true })
    ).toBeVisible()
    await expect(page.locator(PORT_INPUT)).toBeVisible()
    await expect(page.getByText(copy.placeOfLanding.hint)).toBeVisible()
  })

  test('offers the ports the reference-data service holds', async ({
    page
  }) => {
    await startAtPotatoDetails(page)

    await chooseFromAutocomplete(page, PORT_INPUT, DOVER)

    await expect(page.locator(PORT_INPUT)).toHaveValue(DOVER)
  })

  test('saves all three answers, reaches the destination and shows them again on return', async ({
    page
  }) => {
    const reference = await startAtPotatoDetails(page)

    await page.locator(DATE_INPUT).fill(A_DATE)
    await page.locator(TIME_INPUT).fill(A_TIME)
    await chooseFromAutocomplete(page, PORT_INPUT, DOVER)
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(DESTINATION_URL)

    await page.goto(arrivalDetailsPathOf(reference))
    await expect(page.locator(DATE_INPUT)).toHaveValue(A_DATE)
    await expect(page.locator(TIME_INPUT)).toHaveValue(A_TIME)
    await expect(page.locator(PORT_INPUT)).toHaveValue(DOVER)
  })

  test('completes the arrival row on the overview', async ({ page }) => {
    const reference = await startAtPotatoDetails(page)

    await page.locator(DATE_INPUT).fill(A_DATE)
    await page.locator(TIME_INPUT).fill(A_TIME)
    await chooseFromAutocomplete(page, PORT_INPUT, DOVER)
    await saveAndContinue(page).click()
    await page.goto(`/notifications/${reference}`)

    const taskList = page.locator('.govuk-task-list')
    const arrivalRow = taskList
      .getByRole('listitem')
      .filter({ hasText: hubCopy.rows.arrival.title })
    await expect(arrivalRow).toContainText(hubCopy.statuses.completed)
  })

  test('is reachable from the overview arrival task row', async ({ page }) => {
    const reference = await startAtPotatoDetails(page)
    await page.goto(`/notifications/${reference}`)

    await page.getByRole('link', { name: hubCopy.rows.arrival.title }).click()

    await expect(page).toHaveURL(PAGE_URL)
  })

  test('Cancel and return to overview reaches the overview without saving', async ({
    page
  }) => {
    const reference = await startAtPotatoDetails(page)

    await page.locator(DATE_INPUT).fill(A_DATE)
    await page
      .getByRole('link', {
        name: sharedCopy.saveActions.cancelAndReturnToHub
      })
      .click()

    await expect(page).toHaveURL(HUB_URL)

    await page.goto(arrivalDetailsPathOf(reference))
    await expect(page.locator(DATE_INPUT)).toHaveValue('')
  })
})

test.describe('arrival-details — the question a plants notification is asked', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('asks for the expected date of landing while the consignment is on its way', async ({
    page
  }) => {
    await startAtWoodDetails(page, NOT_YET_ARRIVED)

    await expect(
      page.getByLabel(copy.dateLabels[NOT_YET_ARRIVED], { exact: true })
    ).toBeVisible()
  })

  test('asks when the consignment first arrived once it is here', async ({
    page
  }) => {
    await startAtWoodDetails(page, ALREADY_ARRIVED)

    await expect(
      page.getByLabel(copy.dateLabels[ALREADY_ARRIVED], { exact: true })
    ).toBeVisible()
  })

  test('asks for no time and no place of landing', async ({ page }) => {
    await startAtWoodDetails(page, NOT_YET_ARRIVED)

    await expect(page.locator(TIME_INPUT)).toHaveCount(0)
    await expect(page.locator(PORT_INPUT)).toHaveCount(0)
  })

  test('keeps the date when the status switches, because the date is always asked', async ({
    page
  }) => {
    const reference = await startAtWoodDetails(page, NOT_YET_ARRIVED)
    await page.locator(DATE_INPUT).fill(A_PAST_DATE)
    await saveAndContinue(page).click()

    await page.goto(`/notifications/${reference}/arrival-status`)
    await page
      .getByRole('radio', {
        name: arrivalStatusCopy.statusLabels[ALREADY_ARRIVED],
        exact: true
      })
      .check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(PAGE_URL)
    await expect(page.locator(DATE_INPUT)).toHaveValue(A_PAST_DATE)
  })

  test('accepts a past date, because a late notification is recorded not refused', async ({
    page
  }) => {
    const reference = await startAtWoodDetails(page, ALREADY_ARRIVED)

    await page.locator(DATE_INPUT).fill(A_PAST_DATE)
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(DESTINATION_URL)
    await page.goto(arrivalDetailsPathOf(reference))
    await expect(page.locator(DATE_INPUT)).toHaveValue(A_PAST_DATE)
  })
})

test.describe('arrival-details — the answers it refuses', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('continuing with nothing entered shows every error and focuses the date', async ({
    page
  }) => {
    await startAtPotatoDetails(page)

    await saveAndContinue(page).click()

    await expect(page).toHaveURL(PAGE_URL)
    const summary = page.getByRole('alert')
    await expect(
      summary.getByRole('link', { name: copy.errors.arrivalDate.required })
    ).toBeVisible()
    await expect(
      summary.getByRole('link', { name: copy.errors.arrivalTime })
    ).toBeVisible()
    await expect(
      summary.getByRole('link', {
        name: copy.errors.proposedPlaceOfLanding
      })
    ).toBeVisible()

    await summary
      .getByRole('link', { name: copy.errors.arrivalDate.required })
      .click()
    await expect(page.locator(DATE_INPUT)).toBeFocused()
  })

  test('refuses a date that is not a real day and keeps what was typed', async ({
    page
  }) => {
    await startAtPotatoDetails(page)

    await page.locator(DATE_INPUT).fill('31/2/2026')
    await page.locator(TIME_INPUT).fill(A_TIME)
    await chooseFromAutocomplete(page, PORT_INPUT, DOVER)
    await saveAndContinue(page).click()

    await expect(
      page
        .getByRole('alert')
        .getByRole('link', { name: copy.errors.arrivalDate.invalid })
    ).toBeVisible()
    await expect(page.locator(DATE_INPUT)).toHaveValue('31/2/2026')
    await expect(page.locator(TIME_INPUT)).toHaveValue(A_TIME)
    await expect(page.locator(PORT_INPUT)).toHaveValue(DOVER)
  })

  test('refuses a future date once the consignment has arrived', async ({
    page
  }) => {
    await startAtWoodDetails(page, ALREADY_ARRIVED)

    await page.locator(DATE_INPUT).fill('1/1/2099')
    await saveAndContinue(page).click()

    await expect(
      page
        .getByRole('alert')
        .getByRole('link', { name: copy.errors.arrivalDate.inFuture })
    ).toBeVisible()
  })

  test('refuses a time that is not on the 24-hour clock', async ({ page }) => {
    await startAtPotatoDetails(page)

    await page.locator(DATE_INPUT).fill(A_DATE)
    await page.locator(TIME_INPUT).fill('2.30pm')
    await chooseFromAutocomplete(page, PORT_INPUT, DOVER)
    await saveAndContinue(page).click()

    const summaryLink = page
      .getByRole('alert')
      .getByRole('link', { name: validatorDefaults.time })
    await expect(summaryLink).toBeVisible()

    await summaryLink.click()
    await expect(page.locator(TIME_INPUT)).toBeFocused()
  })

  test('refuses a place of landing the ports service does not hold', async ({
    page
  }) => {
    await startAtPotatoDetails(page)

    await page.locator(DATE_INPUT).fill(A_DATE)
    await page.locator(TIME_INPUT).fill(A_TIME)
    // The list is closed, so the only way to send a port the service does not
    // hold is to put it in the select the picker submits. The visible combobox
    // is left untouched on purpose: the picker rewrites the select from the
    // combobox text whenever that input loses focus.
    await page.locator(PORT_SELECT).evaluate((select, code) => {
      const option = document.createElement('option')
      option.value = code
      select.append(option)
      select.value = code
    }, UNOFFERED_PORT)
    await saveAndContinue(page).click()

    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.proposedPlaceOfLanding
      })
    ).toBeVisible()
  })

  test('recovers once every answer is given', async ({ page }) => {
    await startAtPotatoDetails(page)
    await saveAndContinue(page).click()
    await expect(page.getByRole('alert')).toBeVisible()

    await page.locator(DATE_INPUT).fill(A_DATE)
    await page.locator(TIME_INPUT).fill(A_TIME)
    await chooseFromAutocomplete(page, PORT_INPUT, DOVER)
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(DESTINATION_URL)
  })
})

test.describe('arrival-details — accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('has no serious or critical axe violations on the initial render', async ({
    page
  }) => {
    await startAtPotatoDetails(page)
    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'Arrival details initial render'
    )
  })

  test('has no serious or critical axe violations in the error state', async ({
    page
  }) => {
    await startAtPotatoDetails(page)
    await saveAndContinue(page).click()
    await expect(
      page
        .getByRole('alert')
        .getByRole('link', { name: copy.errors.arrivalDate.required })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'Arrival details error state'
    )
  })
})
