import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { commodityTypes } from '../../../../services/commodities/index.js'
import { copy as captionsCopy } from '../../flow/section-captions/copy/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import {
  PLANTS_WOOD_DAYS_AFTER_ARRIVAL,
  POTATO_DAYS_BEFORE_ARRIVAL
} from '../timing-windows.js'
import { copy } from './copy/copy.en.js'

const HUB_URL = /\/notifications\/[^/]+$/
const PAGE_URL = /\/notifications\/[^/]+\/commodity-type$/
// The opening run goes on to the commodities list, and a consignment with no
// line goes straight on to the entry sub-page.
const COMMODITY_DETAILS_URL = /\/notifications\/[^/]+\/commodities\/details$/
const TYPE_INPUT_SELECTOR = 'input[name="commodityType"]'
const HUB_PATH_SEGMENTS = 3

const HINT_DAYS = {
  potatoes: POTATO_DAYS_BEFORE_ARRIVAL,
  'plants-for-planting': PLANTS_WOOD_DAYS_AFTER_ARRIVAL,
  'wood-and-cut-trees': PLANTS_WOOD_DAYS_AFTER_ARRIVAL
}

const backLink = (page) =>
  page.getByRole('link', { name: sharedCopy.layout.back, exact: true })

const radioFor = (page, value) =>
  page.getByRole('radio', { name: copy.typeLabels[value], exact: true })

const saveAndContinue = (page) =>
  page.getByRole('button', { name: sharedCopy.saveActions.saveAndContinue })

const startAtCommodityType = async (page) => {
  await page.goto('/')
  await page.getByRole('button', { name: dashboardCopy.startButton }).click()
  await expect(page).toHaveURL(PAGE_URL)
}

const hubPathOf = (page) =>
  new URL(page.url()).pathname.split('/').slice(0, HUB_PATH_SEGMENTS).join('/')

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

test.describe('commodity-type feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtCommodityType(page)
  })

  test('renders the caption, the legend as the page heading and the hint', async ({
    page
  }) => {
    await expect(
      page.getByText(captionsCopy.sections.aboutTheConsignment, {
        exact: true
      })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.legend, level: 1 })
    ).toBeVisible()
    await expect(page.getByRole('group', { name: copy.legend })).toContainText(
      copy.hint
    )
    await expect(page.getByText(copy.linesWarning)).toBeHidden()
  })

  test('is also reachable from the overview commodities task row', async ({
    page
  }) => {
    await page.goto(hubPathOf(page))
    await page
      .getByRole('link', { name: hubCopy.rows.commodities.title })
      .click()

    await expect(page).toHaveURL(PAGE_URL)
  })

  test('offers the three service commodity types, each with its timing hint', async ({
    page
  }) => {
    const group = page.getByRole('group', { name: copy.legend })
    // `evaluateAll` does not auto-wait, so the radios are asserted present
    // before their values are read — otherwise a slow render reads an empty
    // list and the order assertion below passes judgement on nothing.
    const radios = group.locator(TYPE_INPUT_SELECTOR)
    await expect(radios).toHaveCount(commodityTypes().length)
    const renderedValues = await radios.evaluateAll((inputs) =>
      inputs.map((input) => input.value)
    )

    expect(renderedValues).toEqual([...commodityTypes()])
    for (const value of commodityTypes()) {
      await expect(radioFor(page, value)).toBeVisible()
      await expect(group).toContainText(copy.typeHints[value](HINT_DAYS[value]))
    }
  })

  test('offers the three save controls', async ({ page }) => {
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

  test('sends Back to the dashboard while the notification has no answer', async ({
    page
  }) => {
    await expect(backLink(page)).toHaveAttribute('href', '/')
  })

  test('saves a choice, goes on to the commodities and shows it again on return', async ({
    page
  }) => {
    const pageUrl = page.url()

    await radioFor(page, 'plants-for-planting').check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(COMMODITY_DETAILS_URL)

    await page.goto(pageUrl)
    await expect(radioFor(page, 'plants-for-planting')).toBeChecked()
  })

  test('sends Back to the overview once an answer is saved', async ({
    page
  }) => {
    const pageUrl = page.url()
    const hubPath = hubPathOf(page)

    await radioFor(page, 'potatoes').check()
    await saveAndContinue(page).click()
    await expect(page).toHaveURL(COMMODITY_DETAILS_URL)

    await page.goto(pageUrl)

    await expect(backLink(page)).toHaveAttribute('href', hubPath)
  })

  test('Save and return to overview saves the choice and reaches the overview', async ({
    page
  }) => {
    const pageUrl = page.url()

    await radioFor(page, 'wood-and-cut-trees').check()
    await page
      .getByRole('button', {
        name: sharedCopy.saveActions.saveAndReturnToHub
      })
      .click()

    await expect(page).toHaveURL(HUB_URL)

    await page.goto(pageUrl)
    await expect(radioFor(page, 'wood-and-cut-trees')).toBeChecked()
  })

  test('Cancel and return to overview reaches the overview without saving', async ({
    page
  }) => {
    const pageUrl = page.url()

    await radioFor(page, 'potatoes').check()
    await page
      .getByRole('link', {
        name: sharedCopy.saveActions.cancelAndReturnToHub
      })
      .click()

    await expect(page).toHaveURL(HUB_URL)

    await page.goto(pageUrl)
    await expect(page.locator(`${TYPE_INPUT_SELECTOR}:checked`)).toHaveCount(0)
  })

  test('continuing with nothing chosen shows the error and focuses the first radio', async ({
    page
  }) => {
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(PAGE_URL)
    await expect(page.getByRole('group', { name: copy.legend })).toContainText(
      copy.errors.commodityType
    )

    const summaryLink = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.commodityType })
    await expect(summaryLink).toBeVisible()

    await summaryLink.click()
    await expect(page.locator(TYPE_INPUT_SELECTOR).first()).toBeFocused()
  })

  test('rejects a value the service does not offer and checks nothing', async ({
    page
  }) => {
    await page
      .locator(TYPE_INPUT_SELECTOR)
      .first()
      .evaluate((input) => {
        input.value = 'bulbs'
        input.checked = true
      })
    await saveAndContinue(page).click()

    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.commodityType
      })
    ).toBeVisible()
    await expect(page.locator(`${TYPE_INPUT_SELECTOR}:checked`)).toHaveCount(0)
  })

  test('recovers from the error once a choice is made', async ({ page }) => {
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.commodityType
      })
    ).toBeVisible()

    await radioFor(page, 'potatoes').check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(COMMODITY_DETAILS_URL)
  })

  test('has no serious or critical axe violations on the initial render', async ({
    page
  }) => {
    await expect(
      page.getByRole('heading', { name: copy.legend, level: 1 })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'Commodity type initial render'
    )
  })

  test('has no serious or critical axe violations in the error state', async ({
    page
  }) => {
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.commodityType
      })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'Commodity type error state'
    )
  })
})

test.describe('commodity-type as the journey entry page', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtCommodityType(page)
  })

  test('bounces a deep link from a session that never created the notification, and saving carries on through the section', async ({
    browser,
    page
  }) => {
    const notificationHubPath = hubPathOf(page)
    const deepLinkContext = await browser.newContext({
      baseURL: new URL(page.url()).origin
    })

    try {
      const deepLinkPage = await deepLinkContext.newPage()
      await signIn(deepLinkPage)
      await deepLinkPage.goto(notificationHubPath)

      await expect(deepLinkPage).toHaveURL(PAGE_URL)

      await radioFor(deepLinkPage, 'potatoes').check()
      await saveAndContinue(deepLinkPage).click()

      await expect(deepLinkPage).toHaveURL(COMMODITY_DETAILS_URL)
    } finally {
      await deepLinkContext.close()
    }
  })
})
