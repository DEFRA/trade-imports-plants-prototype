import {
  BASE,
  journeyIdFromPage,
  pageUrlWithTrail,
  setUrl
} from '../../../../../../../../../fit/set-base.js'
import {
  errorSummaryLinks,
  WOOD_LINE_FIELDS,
  addCommodityLine,
  backLink,
  chooseCommodityType,
  expectNoSeriousOrCriticalViolations,
  expectThreeSaveControls,
  overwriteRadioInputs,
  saveAndContinue,
  saveAndReturnToHub,
  startNotification
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { TRAIL_START } from '../../../../../../shared/trail.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { commodityTypes } from '../../../../services/commodities/index.js'
import { copy as captionsCopy } from '../../flow/section-captions/copy/copy.en.js'
import { copy as commoditiesCopy } from '../commodities/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import {
  PLANTS_WOOD_DAYS_AFTER_ARRIVAL,
  POTATO_DAYS_BEFORE_ARRIVAL
} from '../timing-windows.js'
import { copy } from './copy/copy.en.js'

const HUB_URL = setUrl('/notifications/[^/]+$')
const PAGE_PATH = '/notifications/[^/]+/commodity-type'
const DETAILS_PATH = '/notifications/[^/]+/commodities/details'
const PAGE_URL_FROM_DASHBOARD = pageUrlWithTrail(PAGE_PATH, [
  TRAIL_START.dashboard
])
const DETAILS_URL_FROM_DASHBOARD = pageUrlWithTrail(DETAILS_PATH, [
  TRAIL_START.dashboard,
  'commodity-type'
])
const PAGE_URL_FROM_OVERVIEW = pageUrlWithTrail(PAGE_PATH, [
  TRAIL_START.overview
])
const PAGE_URL_WITHOUT_TRAIL = setUrl(PAGE_PATH)
const DETAILS_URL_FROM_DEEP_LINK = pageUrlWithTrail(DETAILS_PATH, [
  'commodity-type'
])
const TYPE_INPUT_SELECTOR = 'input[name="commodityType"]'

const WOOD_AND_CUT_TREES = 'wood-and-cut-trees'

const HINT_DAYS = {
  potatoes: POTATO_DAYS_BEFORE_ARRIVAL,
  'plants-for-planting': PLANTS_WOOD_DAYS_AFTER_ARRIVAL,
  [WOOD_AND_CUT_TREES]: PLANTS_WOOD_DAYS_AFTER_ARRIVAL
}

const radioFor = (page, value) =>
  page.getByRole('radio', { name: copy.typeLabels[value], exact: true })

const hubPathOf = (page) => `${BASE}/notifications/${journeyIdFromPage(page)}`

const commodityTypeErrorSummaryLink = (page) =>
  errorSummaryLinks(page, copy.errors.commodityType)

const expectCommodityTypeErrorBesideOptions = (page) =>
  expect(page.getByRole('group', { name: copy.legend })).toContainText(
    copy.errors.commodityType
  )

const saveWoodTypeWithCutConiferousLineThenReopen = async (page) => {
  const pageUrl = page.url()
  await chooseCommodityType(page, WOOD_AND_CUT_TREES)
  await addCommodityLine(page, 'cut-coniferous-trees', WOOD_LINE_FIELDS)
  await page.goto(pageUrl)
}

const expectCutConiferousLineHeld = async (page) => {
  await page.goto(`${hubPathOf(page)}/commodities`)
  await expect(page).toHaveURL(setUrl('/notifications/[^/]+/commodities$'))
  await expect(
    page.getByRole('row').filter({
      hasText: commoditiesCopy.categoryLabels['cut-coniferous-trees']
    })
  ).toHaveCount(1)
}

test.describe('commodity-type feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotification(page)
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
    await radioFor(page, 'potatoes').check()
    await saveAndContinue(page).click()
    await expect(page).toHaveURL(DETAILS_URL_FROM_DASHBOARD)
    await page.goto(hubPathOf(page))
    await page
      .getByRole('link', { name: hubCopy.rows.commodities.title })
      .click()

    await expect(page).toHaveURL(PAGE_URL_FROM_OVERVIEW)
  })

  test('offers the three service commodity types, each with its timing hint', async ({
    page
  }) => {
    const group = page.getByRole('group', { name: copy.legend })
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
    await expectThreeSaveControls(page)
  })

  test('sends Back to the dashboard while the notification has no answer', async ({
    page
  }) => {
    await expect(backLink(page)).toHaveAttribute('href', BASE)
  })

  test('saves a choice, goes on to the commodities and shows it again on return', async ({
    page
  }) => {
    const pageUrl = page.url()

    await radioFor(page, 'plants-for-planting').check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(DETAILS_URL_FROM_DASHBOARD)

    await page.goto(pageUrl)
    await expect(radioFor(page, 'plants-for-planting')).toBeChecked()
  })

  test('sends Back to the overview when opened by its address once an answer is saved', async ({
    page
  }) => {
    const pageUrl = page.url().split('?')[0]
    const hubPath = hubPathOf(page)

    await radioFor(page, 'potatoes').check()
    await saveAndContinue(page).click()
    await expect(page).toHaveURL(DETAILS_URL_FROM_DASHBOARD)

    await page.goto(pageUrl)

    await expect(backLink(page)).toHaveAttribute('href', hubPath)
  })

  test('Save and return to overview saves the choice and reaches the overview', async ({
    page
  }) => {
    const pageUrl = page.url()

    await radioFor(page, WOOD_AND_CUT_TREES).check()
    await saveAndReturnToHub(page).click()

    await expect(page).toHaveURL(HUB_URL)

    await page.goto(pageUrl)
    await expect(radioFor(page, WOOD_AND_CUT_TREES)).toBeChecked()
  })

  test('Cancel and return to overview opens the dashboard when nothing is saved, without saving', async ({
    page
  }) => {
    const pageUrl = page.url()

    await radioFor(page, 'potatoes').check()
    await page
      .getByRole('link', {
        name: sharedCopy.saveActions.cancelAndReturnToHub
      })
      .click()
    await expect(page).toHaveURL(`${BASE}`)

    await page.goto(pageUrl)
    await expect(page.locator(`${TYPE_INPUT_SELECTOR}:checked`)).toHaveCount(0)
  })

  test('continuing with nothing chosen shows the error and focuses the first radio', async ({
    page
  }) => {
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(PAGE_URL_FROM_DASHBOARD)
    await expectCommodityTypeErrorBesideOptions(page)

    const summaryLink = commodityTypeErrorSummaryLink(page)
    await expect(summaryLink).toBeVisible()

    await summaryLink.click()
    await expect(page.locator(TYPE_INPUT_SELECTOR).first()).toBeFocused()
  })

  test('rejects a value the service does not offer and checks nothing', async ({
    page
  }) => {
    await overwriteRadioInputs(page, {
      inputSelector: TYPE_INPUT_SELECTOR,
      postedValue: 'bulbs'
    })
    await saveAndContinue(page).click()

    await expect(commodityTypeErrorSummaryLink(page)).toBeVisible()
    await expect(page.locator(`${TYPE_INPUT_SELECTOR}:checked`)).toHaveCount(0)
  })

  test('Save and return to overview with nothing submitted stays on the page, shows the error and keeps the saved type and line', async ({
    page
  }) => {
    const pageUrl = page.url()
    await saveWoodTypeWithCutConiferousLineThenReopen(page)

    await overwriteRadioInputs(page, {
      inputSelector: TYPE_INPUT_SELECTOR,
      postedValue: null
    })
    await saveAndReturnToHub(page).click()

    await expect(page).toHaveURL(PAGE_URL_FROM_DASHBOARD)
    await expect(commodityTypeErrorSummaryLink(page)).toBeVisible()
    await expectCommodityTypeErrorBesideOptions(page)

    await page.goto(pageUrl)
    await expect(radioFor(page, WOOD_AND_CUT_TREES)).toBeChecked()
    await expectCutConiferousLineHeld(page)
  })

  test('Save and return to overview with a value the service does not offer stays on the page, checks nothing and keeps the line', async ({
    page
  }) => {
    await saveWoodTypeWithCutConiferousLineThenReopen(page)

    await overwriteRadioInputs(page, {
      inputSelector: TYPE_INPUT_SELECTOR,
      postedValue: 'bulbs'
    })
    await saveAndReturnToHub(page).click()

    await expect(page).toHaveURL(PAGE_URL_FROM_DASHBOARD)
    await expect(commodityTypeErrorSummaryLink(page)).toBeVisible()
    await expect(page.locator(`${TYPE_INPUT_SELECTOR}:checked`)).toHaveCount(0)

    await expectCutConiferousLineHeld(page)
  })

  test('recovers from the error once a choice is made', async ({ page }) => {
    await saveAndContinue(page).click()
    await expect(commodityTypeErrorSummaryLink(page)).toBeVisible()

    await radioFor(page, 'potatoes').check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(DETAILS_URL_FROM_DASHBOARD)
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
    await expect(commodityTypeErrorSummaryLink(page)).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'Commodity type error state'
    )
  })
})

test.describe('commodity-type as the journey entry page', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotification(page)
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

      await expect(deepLinkPage).toHaveURL(PAGE_URL_WITHOUT_TRAIL)

      await radioFor(deepLinkPage, 'potatoes').check()
      await saveAndContinue(deepLinkPage).click()

      await expect(deepLinkPage).toHaveURL(DETAILS_URL_FROM_DEEP_LINK)
    } finally {
      await deepLinkContext.close()
    }
  })
})
