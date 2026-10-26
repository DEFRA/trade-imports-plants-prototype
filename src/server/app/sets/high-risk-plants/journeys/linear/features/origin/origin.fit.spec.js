import {
  addCommodityLine,
  chooseCommodityType,
  chooseCountryOfOrigin,
  backLink,
  visitOverviewThenOpen,
  expectNoSeriousOrCriticalViolations,
  expectThreeSaveControls,
  saveAndContinue,
  startNotification,
  startNotificationAtOrigin
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import { BASE, setUrl } from '../../../../../../../../../fit/set-base.js'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { countryAndSubdivisionEntries } from '../../../../../../services/_capture/fixtures.js'
import { copy as captionsCopy } from '../../flow/section-captions/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const HUB_URL = setUrl('/notifications/[^/]+$')
const ORIGIN_URL = setUrl('/notifications/[^/]+/origin$')
const ARRIVAL_DETAILS_URL = setUrl('/notifications/[^/]+/arrival-details$')

const COUNTRY_INPUT = 'input#countryOfOrigin'
const COUNTRY_SELECT = 'select[name="countryOfOrigin"]'

const FRANCE = 'France'
const NORWAY = 'Norway'
const SPAIN = 'Spain'

const WARE_POTATOES = 'ware-potatoes'
const CUT_CONIFEROUS_TREES = 'cut-coniferous-trees'
const EU_MEMBER_STATES = 'eu-member-states'

const originPathOf = (reference) => `${BASE}/notifications/${reference}/origin`

test.describe('origin feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders the caption, the heading and the label, with no hint', async ({
    page
  }) => {
    await startNotificationAtOrigin(page)

    await expect(
      page.getByText(captionsCopy.sections.aboutTheConsignment, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()
    await expect(
      page.getByText(copy.country.label, { exact: true })
    ).toBeVisible()
    const country = page.locator(COUNTRY_INPUT)
    const typeAheadInstruction = await page
      .locator('#countryOfOrigin__assistiveHint')
      .textContent()
    await expect(country).toHaveAccessibleName(copy.country.label)
    await expect(country).toHaveAccessibleDescription(
      typeAheadInstruction.trim()
    )
  })

  test('invites a search in the empty box', async ({ page }) => {
    await startNotificationAtOrigin(page)

    await expect(page.locator(COUNTRY_INPUT)).toHaveAttribute(
      'placeholder',
      copy.country.searchPlaceholder
    )
  })

  test('is reachable from the overview origin task row', async ({ page }) => {
    const reference = await startNotificationAtOrigin(page)
    await page.goto(`${BASE}/notifications/${reference}`)

    await page.getByRole('link', { name: hubCopy.rows.origin.title }).click()

    await expect(page).toHaveURL(ORIGIN_URL)
  })

  test('offers the select text ahead of every country and territory the service primes, by name', async ({
    page
  }) => {
    await startNotificationAtOrigin(page)

    const rendered = await page
      .locator(`${COUNTRY_SELECT} option`)
      .evaluateAll((options) =>
        options.map((option) => ({
          code: option.value,
          name: option.textContent
        }))
      )

    expect(rendered).toEqual([
      { code: '', name: copy.country.selectText },
      ...countryAndSubdivisionEntries()
    ])
  })

  test('offers the three save controls', async ({ page }) => {
    await startNotificationAtOrigin(page)

    await expectThreeSaveControls(page)
  })

  test('sends Back to the commodities list in the opening run', async ({
    page
  }) => {
    const reference = await startNotificationAtOrigin(page)

    await expect(backLink(page)).toHaveAttribute(
      'href',
      `${BASE}/notifications/${reference}/commodities`
    )
  })

  test('sends Back to the overview once the notification has an answer and the page is opened from the overview', async ({
    page
  }) => {
    const reference = await startNotificationAtOrigin(page)

    await visitOverviewThenOpen(page, reference, originPathOf(reference))

    await expect(backLink(page)).toHaveAttribute(
      'href',
      `${BASE}/notifications/${reference}`
    )
  })

  test('saves a country, reaches the arrival details and shows it again on return', async ({
    page
  }) => {
    const reference = await startNotificationAtOrigin(page)

    await chooseCountryOfOrigin(page, FRANCE)
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ARRIVAL_DETAILS_URL)

    await page.goto(originPathOf(reference))
    await expect(page.locator(COUNTRY_INPUT)).toHaveValue(FRANCE)
  })

  test('Save and return to overview saves the country and reaches the overview', async ({
    page
  }) => {
    const reference = await startNotificationAtOrigin(page)

    await chooseCountryOfOrigin(page, FRANCE)
    await page
      .getByRole('button', {
        name: sharedCopy.saveActions.saveAndReturnToHub
      })
      .click()

    await expect(page).toHaveURL(HUB_URL)

    await page.goto(originPathOf(reference))
    await expect(page.locator(COUNTRY_INPUT)).toHaveValue(FRANCE)
  })

  test('Cancel and return to overview reaches the overview without saving', async ({
    page
  }) => {
    const reference = await startNotificationAtOrigin(page)

    await chooseCountryOfOrigin(page, FRANCE)
    await page
      .getByRole('link', {
        name: sharedCopy.saveActions.cancelAndReturnToHub
      })
      .click()

    await expect(page).toHaveURL(HUB_URL)

    await page.goto(originPathOf(reference))
    await expect(page.locator(COUNTRY_INPUT)).toHaveValue('')
  })

  test('continuing with nothing chosen shows the error and focuses the field', async ({
    page
  }) => {
    await startNotificationAtOrigin(page)

    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ORIGIN_URL)
    const summaryLink = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.countryRequired })
    await expect(summaryLink).toBeVisible()

    await summaryLink.click()
    await expect(page.locator(COUNTRY_INPUT)).toBeFocused()
  })

  test('recovers from the error once a country is chosen', async ({ page }) => {
    await startNotificationAtOrigin(page)
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.countryRequired
      })
    ).toBeVisible()

    await chooseCountryOfOrigin(page, FRANCE)
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ARRIVAL_DETAILS_URL)
  })

  test('has no serious or critical axe violations on the initial render', async ({
    page
  }) => {
    await startNotificationAtOrigin(page)
    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, 'Origin initial render')
  })

  test('has no serious or critical axe violations in the error state', async ({
    page
  }) => {
    await startNotificationAtOrigin(page)
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.countryRequired
      })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, 'Origin error state')
  })
})

test.describe('country of origin type-ahead', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtOrigin(page)
  })

  test('offers the whole country list on focus, without typing', async ({
    page
  }) => {
    await page.locator(COUNTRY_INPUT).click()

    await expect(
      page.getByRole('option', { name: FRANCE, exact: true })
    ).toBeVisible()
    await expect(page.getByRole('option')).toHaveCount(
      countryAndSubdivisionEntries().length
    )
  })

  test('tells the user when nothing matches what they typed', async ({
    page
  }) => {
    await page.locator(COUNTRY_INPUT).fill('zzzzzz')

    await expect(page.getByText(copy.country.noResults)).toBeVisible()
  })
})

test.describe('country of origin without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('native select submits and persists the country code', async ({
    page
  }) => {
    await signIn(page)
    const reference = await startNotificationAtOrigin(page)
    const select = page.locator(COUNTRY_SELECT)

    await select.selectOption({ label: FRANCE })
    await saveAndContinue(page).click()
    await expect(page).toHaveURL(ARRIVAL_DETAILS_URL)

    await page.goto(originPathOf(reference))
    await expect(select.locator('option:checked')).toHaveText(FRANCE)
  })
})

test.describe('origin — the country list narrowed by the commodities', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('shows the ware-potato scope guidance and refuses a country outside the four', async ({
    page
  }) => {
    const reference = await startNotification(page)
    await chooseCommodityType(page, 'potatoes')
    await addCommodityLine(page, WARE_POTATOES, {
      potatoVariety: 'Maris Piper',
      quantity: '250',
      potatoIntendedUse: 'Eating'
    })
    await page.goto(originPathOf(reference))

    await expect(
      page.getByText(copy.guidance[WARE_POTATOES], { exact: true })
    ).toBeVisible()

    await chooseCountryOfOrigin(page, FRANCE)
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ORIGIN_URL)
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.narrowing[WARE_POTATOES]
      })
    ).toBeVisible()
  })

  test('accepts one of the four ware-potato countries', async ({ page }) => {
    const reference = await startNotification(page)
    await chooseCommodityType(page, 'potatoes')
    await addCommodityLine(page, WARE_POTATOES, {
      potatoVariety: 'Maris Piper',
      quantity: '250',
      potatoIntendedUse: 'Eating'
    })
    await page.goto(originPathOf(reference))

    await chooseCountryOfOrigin(page, SPAIN)
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ARRIVAL_DETAILS_URL)
  })

  test('refuses a country outside the EU for a wood consignment', async ({
    page
  }) => {
    const reference = await startNotification(page)
    await chooseCommodityType(page, 'wood-and-cut-trees')
    await addCommodityLine(page, CUT_CONIFEROUS_TREES, {
      commodityCode: '06042020',
      quantity: '40',
      sizeOfTree: '3.5',
      phytosanitaryTreatments: 'Heat treatment'
    })
    await page.goto(originPathOf(reference))

    await expect(
      page.getByText(copy.guidance[WARE_POTATOES], { exact: true })
    ).toHaveCount(0)

    await chooseCountryOfOrigin(page, NORWAY)
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ORIGIN_URL)
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.narrowing[EU_MEMBER_STATES]
      })
    ).toBeVisible()
  })
})
