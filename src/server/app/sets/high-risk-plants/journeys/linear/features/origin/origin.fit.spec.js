import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
// The service reader would try to load real reference data when called from
// the FIT process (which does not set STUB_MODE); the browser-side test
// only cares about the codes the server actually rendered, and the server
// runs against the same stub in FIT mode. Read that source directly.
import { COUNTRY_LABELS } from '../../../../../../services/countries/stub.js'
import { copy as captionsCopy } from '../../flow/section-captions/copy/copy.en.js'
import { copy as commoditiesCopy } from '../commodities/copy/copy.en.js'
import { copy as commodityTypeCopy } from '../commodity-type/copy/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const COMMODITY_TYPE_URL = /\/notifications\/[^/]+\/commodity-type$/
const COMMODITY_DETAILS_URL = /\/notifications\/[^/]+\/commodities\/details/
const COMMODITY_LIST_URL = /\/notifications\/[^/]+\/commodities$/
const HUB_URL = /\/notifications\/[^/]+$/
const ORIGIN_URL = /\/notifications\/[^/]+\/origin$/
// A potato notification is never asked the arrival question, so Continue from
// origin lands on the arrival details.
const ARRIVAL_DETAILS_URL = /\/notifications\/[^/]+\/arrival-details$/
const JOURNEY_ID_SEGMENT = 2

// accessible-autocomplete enhances the native <select>: the visible combobox
// input keeps the original id, and the hidden select still submits the value.
const COUNTRY_INPUT = 'input#countryOfOrigin'
const COUNTRY_SELECT = 'select[name="countryOfOrigin"]'
const AUTOCOMPLETE_ARROW = '.autocomplete__dropdown-arrow-down'
const AUTOCOMPLETE_OPTION = '.autocomplete__option'
const ERROR_MESSAGE = '.govuk-error-message'

const FRANCE = 'France'
const NORWAY = 'Norway'
const SPAIN = 'Spain'

const POTATOES = 'potatoes'
const WARE_POTATOES = 'ware-potatoes'
const CUT_CONIFEROUS_TREES = 'cut-coniferous-trees'
const EU_MEMBER_STATES = 'eu-member-states'

const backLink = (page) =>
  page.getByRole('link', { name: sharedCopy.layout.back, exact: true })

const saveAndContinue = (page) =>
  page.getByRole('button', { name: sharedCopy.saveActions.saveAndContinue })

const originPathOf = (reference) => `/notifications/${reference}/origin`

const chooseCountry = async (page, name) => {
  const field = page.locator(COUNTRY_INPUT)
  await field.click()
  await field.fill(name)
  await page.getByRole('option', { name, exact: true }).click()
}

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

// The narrowing is decided by the categories of the lines already saved, so a
// test of it has to go through the commodity section first.
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

const startAtOrigin = async (page) => {
  const reference = await startNotification(page)
  await chooseCommodityType(page, POTATOES)
  await page.goto(originPathOf(reference))
  await expect(page).toHaveURL(ORIGIN_URL)
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

test.describe('origin feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders the caption, the heading, the label and the hint', async ({
    page
  }) => {
    await startAtOrigin(page)

    await expect(
      page.getByText(captionsCopy.sections.aboutTheConsignment, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()
    await expect(
      page.getByText(copy.country.label, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText(copy.country.hint, { exact: true })
    ).toBeVisible()
  })

  test('is reachable from the overview origin task row', async ({ page }) => {
    const reference = await startAtOrigin(page)
    await page.goto(`/notifications/${reference}`)

    await page.getByRole('link', { name: hubCopy.rows.origin.title }).click()

    await expect(page).toHaveURL(ORIGIN_URL)
  })

  test('offers a placeholder ahead of every country the service primes', async ({
    page
  }) => {
    await startAtOrigin(page)

    const rendered = await page
      .locator(`${COUNTRY_SELECT} option`)
      .evaluateAll((options) => options.map((option) => option.value))

    expect(rendered).toEqual(['', ...Object.keys(COUNTRY_LABELS)])
  })

  test('offers the three save controls', async ({ page }) => {
    await startAtOrigin(page)

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

  test('sends Back to the overview once the notification has an answer', async ({
    page
  }) => {
    const reference = await startAtOrigin(page)

    await expect(backLink(page)).toHaveAttribute(
      'href',
      `/notifications/${reference}`
    )
  })

  test('saves a country, reaches the arrival details and shows it again on return', async ({
    page
  }) => {
    const reference = await startAtOrigin(page)

    await chooseCountry(page, FRANCE)
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ARRIVAL_DETAILS_URL)

    await page.goto(originPathOf(reference))
    await expect(page.locator(COUNTRY_INPUT)).toHaveValue(FRANCE)
  })

  test('Save and return to overview saves the country and reaches the overview', async ({
    page
  }) => {
    const reference = await startAtOrigin(page)

    await chooseCountry(page, FRANCE)
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
    const reference = await startAtOrigin(page)

    await chooseCountry(page, FRANCE)
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
    await startAtOrigin(page)

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
    await startAtOrigin(page)
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.countryRequired
      })
    ).toBeVisible()

    await chooseCountry(page, FRANCE)
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ARRIVAL_DETAILS_URL)
  })

  test('has no serious or critical axe violations on the initial render', async ({
    page
  }) => {
    await startAtOrigin(page)
    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, 'Origin initial render')
  })

  test('has no serious or critical axe violations in the error state', async ({
    page
  }) => {
    await startAtOrigin(page)
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.countryRequired
      })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, 'Origin error state')
  })
})

test.describe('origin accessible-autocomplete styles', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('uses GOV.UK typography for the enhanced input and its options', async ({
    page
  }) => {
    await startAtOrigin(page)
    const input = page.getByRole('combobox', { name: copy.country.label })
    await input.fill('Fr')
    await expect(
      page.getByRole('option', { name: FRANCE, exact: true })
    ).toBeVisible()

    const typography = await page.evaluate(
      ({ inputSelector, optionSelector }) => {
        const enhancedInput = document.querySelector(inputSelector)
        const option = document.querySelector(optionSelector)
        const reference = document.createElement('input')
        reference.className = 'govuk-input'
        document.body.append(reference)

        const inputStyle = getComputedStyle(enhancedInput)
        const optionStyle = getComputedStyle(option)
        const referenceStyle = getComputedStyle(reference)
        const result = {
          inputFamily: inputStyle.fontFamily,
          inputSize: inputStyle.fontSize,
          optionFamily: optionStyle.fontFamily,
          optionSize: optionStyle.fontSize,
          referenceFamily: referenceStyle.fontFamily,
          referenceSize: referenceStyle.fontSize
        }
        reference.remove()
        return result
      },
      { inputSelector: COUNTRY_INPUT, optionSelector: AUTOCOMPLETE_OPTION }
    )

    expect(typography.inputFamily).toBe(typography.referenceFamily)
    expect(typography.optionFamily).toBe(typography.referenceFamily)
    expect(typography.inputFamily).toMatch(/^"?GDS Transport/)
    expect(typography.inputSize).toBe(typography.referenceSize)
    expect(typography.optionSize).toBe(typography.referenceSize)
  })

  test('paints the dropdown arrow behind the interactive input', async ({
    page
  }) => {
    await startAtOrigin(page)

    const paintStack = await page
      .locator(AUTOCOMPLETE_ARROW)
      .evaluate((arrow) => {
        const bounds = arrow.getBoundingClientRect()
        const hits = document.elementsFromPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2
        )
        const wrapper = arrow.closest('.autocomplete__wrapper')
        return {
          arrowIsInStack: hits.some(
            (element) => element === arrow || arrow.contains(element)
          ),
          inputIsTopHit: hits[0]?.matches('.autocomplete__input') ?? false,
          inputPaddingRight: getComputedStyle(hits[0]).paddingRight,
          wrapperZIndex: getComputedStyle(wrapper).zIndex
        }
      })

    expect(paintStack).toEqual({
      arrowIsInStack: true,
      inputIsTopHit: true,
      inputPaddingRight: '35px',
      wrapperZIndex: '0'
    })
  })

  test('keeps the upstream focus indicator on the enhanced input', async ({
    page
  }) => {
    await startAtOrigin(page)
    const input = page.getByRole('combobox', { name: copy.country.label })

    await input.focus()

    const indicator = await input.evaluate((enhancedInput) => {
      const reference = document.createElement('span')
      reference.style.color = 'var(--govuk-focus-colour)'
      document.body.append(reference)
      const inputStyle = getComputedStyle(enhancedInput)
      const result = {
        boxShadow: inputStyle.boxShadow,
        focusColour: getComputedStyle(reference).color,
        outlineColour: inputStyle.outlineColor,
        outlineWidth: inputStyle.outlineWidth
      }
      reference.remove()
      return result
    })

    expect(indicator.outlineColour).toBe(indicator.focusColour)
    expect(indicator.outlineWidth).toBe('3px')
    expect(indicator.boxShadow).toContain('inset')
  })

  test('gives the enhanced input the standard GOV.UK error border', async ({
    page
  }) => {
    await startAtOrigin(page)
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.countryRequired
      })
    ).toBeVisible()

    const borders = await page.evaluate(
      ({ inputSelector, errorSelector }) => {
        const enhancedInput = document.querySelector(inputSelector)
        const errorMessage = document.querySelector(errorSelector)
        const reference = document.createElement('input')
        reference.className = 'govuk-input govuk-input--error'
        document.body.append(reference)

        const inputStyle = getComputedStyle(enhancedInput)
        const errorStyle = getComputedStyle(errorMessage)
        const referenceStyle = getComputedStyle(reference)
        const result = {
          inputColour: inputStyle.borderTopColor,
          inputWidth: inputStyle.borderTopWidth,
          errorColour: errorStyle.color,
          referenceColour: referenceStyle.borderTopColor,
          referenceWidth: referenceStyle.borderTopWidth
        }
        reference.remove()
        return result
      },
      { inputSelector: COUNTRY_INPUT, errorSelector: ERROR_MESSAGE }
    )

    expect(borders.inputColour).toBe(borders.errorColour)
    expect(borders.inputColour).toBe(borders.referenceColour)
    expect(borders.inputWidth).toBe(borders.referenceWidth)
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
    await addLine(page, WARE_POTATOES, {
      potatoVariety: 'Maris Piper',
      quantity: '250',
      potatoIntendedUse: 'Eating'
    })
    await page.goto(originPathOf(reference))

    await expect(
      page.getByText(copy.guidance[WARE_POTATOES], { exact: true })
    ).toBeVisible()

    await chooseCountry(page, FRANCE)
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
    await addLine(page, WARE_POTATOES, {
      potatoVariety: 'Maris Piper',
      quantity: '250',
      potatoIntendedUse: 'Eating'
    })
    await page.goto(originPathOf(reference))

    await chooseCountry(page, SPAIN)
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ARRIVAL_DETAILS_URL)
  })

  test('refuses a country outside the EU for a wood consignment', async ({
    page
  }) => {
    const reference = await startNotification(page)
    await chooseCommodityType(page, 'wood-and-cut-trees')
    await addLine(page, CUT_CONIFEROUS_TREES, {
      commodityCode: '06042020',
      quantity: '40',
      sizeOfTree: '3.5',
      phytosanitaryTreatments: 'Heat treatment'
    })
    await page.goto(originPathOf(reference))

    await expect(
      page.getByText(copy.guidance[WARE_POTATOES], { exact: true })
    ).toHaveCount(0)

    await chooseCountry(page, NORWAY)
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ORIGIN_URL)
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.narrowing[EU_MEMBER_STATES]
      })
    ).toBeVisible()
  })
})
