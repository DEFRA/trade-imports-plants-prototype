import { expect, test } from '@playwright/test'

import {
  FORM_GROUP_ANCESTOR_XPATH,
  chooseCommodityCategory,
  chooseCommodityType,
  expectNoSeriousOrCriticalViolations,
  govukColourOf,
  saveAndContinue,
  startNotification,
  startNotificationAtOrigin,
  startPotatoNotification,
  withoutJavaScript
} from '../../../../../../../../fit/high-risk-plants-journey.js'
import { signIn } from '../../../../../../../../fit/sign-in.js'
import { countryAndSubdivisionEntries } from '../../../../../services/_capture/fixtures.js'
import { copy as arrivalCopy } from './arrival-details/copy/copy.en.js'
import { copy as commodityCopy } from './commodities/copy/copy.en.js'
import { copy as originCopy } from './origin/copy/copy.en.js'

const AUTOCOMPLETE_BUTTON = '.app-autocomplete__button'
const AUTOCOMPLETE_CONTAINER =
  'xpath=ancestor::*[contains(@class,"app-autocomplete")][1]'
const COUNTRY_SELECT = 'select#countryOfOrigin-select'
const DOVER_OPTION = 'Port of Dover - GB DVR'
const countries = countryAndSubdivisionEntries()
const france = countries.find(({ code }) => code === 'FR')
const ireland = countries.find(({ code }) => code === 'IE')

const inputFor = (page, inputId) => page.locator(`input#${inputId}`)

const openGenusDetails = async (page) => {
  await startNotification(page)
  await chooseCommodityType(page, 'wood-and-cut-trees')
  await chooseCommodityCategory(page, 'hardwood-chips')
}

const typeAheads = [
  {
    name: 'Country of origin',
    inputId: 'countryOfOrigin',
    label: originCopy.country.label,
    labelSize: 'm',
    typed: 'fra',
    suggestion: france.name,
    bold: 'Fra',
    selectText: originCopy.country.selectText,
    searchPlaceholder: originCopy.country.searchPlaceholder,
    open: startNotificationAtOrigin
  },
  {
    name: 'Proposed place of landing',
    inputId: 'proposedPlaceOfLanding',
    label: arrivalCopy.placeOfLanding.label,
    labelSize: 'm',
    hint: arrivalCopy.placeOfLanding.hint,
    typed: 'dov',
    suggestion: DOVER_OPTION,
    bold: 'Dov',
    selectText: arrivalCopy.placeOfLanding.selectText,
    searchPlaceholder: arrivalCopy.placeOfLanding.searchPlaceholder,
    open: startPotatoNotification
  },
  {
    name: 'Commodity details genus',
    inputId: 'genus',
    label: commodityCopy.details.fields.genus.label,
    labelSize: 's',
    hint: commodityCopy.details.fields.genus.hint,
    typed: 'cast',
    suggestion: commodityCopy.genusLabels.Castanea,
    bold: 'Cast',
    selectText: commodityCopy.details.genusSelectText,
    searchPlaceholder: '',
    open: openGenusDetails
  }
]

const showSuggestionFor = async (page, { inputId, typed, suggestion }) => {
  await inputFor(page, inputId).fill(typed)
  await expect(
    page.getByRole('option', { name: suggestion, exact: true })
  ).toBeVisible()
}

for (const typeAhead of typeAheads) {
  const {
    name,
    inputId,
    label,
    hint,
    labelSize,
    typed,
    suggestion,
    bold,
    selectText,
    searchPlaceholder,
    open
  } = typeAhead

  test.describe(`${name} type-ahead`, () => {
    test.beforeEach(async ({ page }) => {
      await signIn(page)
      await open(page)
    })

    test('carries the configured search placeholder and no value', async ({
      page
    }) => {
      const input = inputFor(page, inputId)

      await expect(input).toHaveAttribute('placeholder', searchPlaceholder)
      await expect(input).toHaveValue('')
    })

    test('shows a square button flush with the right of the box and no dropdown arrow', async ({
      page
    }) => {
      const input = inputFor(page, inputId)
      await expect(
        input
          .locator(AUTOCOMPLETE_CONTAINER)
          .locator('.autocomplete__dropdown-arrow-down')
      ).toHaveCSS('display', 'none')

      const measurements = await measureJoinedSearchButton(input)
      expect(measurements.buttonWidth).toBe(measurements.buttonHeight)
      expect(measurements.buttonTop).toBe(measurements.inputTop)
      expect(measurements.buttonBottom).toBe(measurements.inputBottom)
      expect(measurements.buttonRight).toBe(measurements.inputRight)
    })

    test('keeps the button out of assistive technology and the tab order, and focuses the box when it is clicked', async ({
      page
    }) => {
      const input = inputFor(page, inputId)
      const button = input
        .locator(AUTOCOMPLETE_CONTAINER)
        .locator(AUTOCOMPLETE_BUTTON)
      const urlBeforeClick = page.url()

      await expect(button).toHaveAttribute('aria-hidden', 'true')
      await expect(button).not.toHaveAttribute('tabindex')
      await expect(button).toHaveJSProperty('tagName', 'SPAN')

      await input.focus()
      await page.keyboard.press('Tab')
      await expect(input).not.toBeFocused()
      await expect(button).not.toBeFocused()

      await button.click()
      await expect(input).toBeFocused()
      await expect(page).toHaveURL(urlBeforeClick)
    })

    test(`shows ${bold} in bold in the ${suggestion} suggestion after typing ${typed}`, async ({
      page
    }) => {
      await showSuggestionFor(page, typeAhead)

      await expect.poll(() => boldLettersOf(page, suggestion)).toEqual([bold])
    })

    test('has no serious or critical axe violations with the button showing', async ({
      page
    }) => {
      await expectNoSeriousOrCriticalViolations(page, name)
    })

    test('has no serious or critical axe violations with a suggestion list open', async ({
      page
    }) => {
      await showSuggestionFor(page, typeAhead)

      await expectNoSeriousOrCriticalViolations(page, `${name} suggestions`)
    })
  })

  test.describe(`${name} type-ahead without JavaScript`, () => {
    test('is a native select found by its label, whose first option is the page select text, with no button', async ({
      page,
      browser
    }) => {
      await signIn(page)
      await open(page)
      await withoutJavaScript(page, browser, async (noJavaScript) => {
        const formGroup = noJavaScript
          .locator(`select#${inputId}`)
          .locator(FORM_GROUP_ANCESTOR_XPATH)
        const select = formGroup.getByLabel(label, { exact: true })

        await expect(select).toHaveJSProperty('tagName', 'SELECT')
        await expect(select).toBeVisible()
        await expect(select).toHaveAccessibleName(label)
        await expect(select).toHaveAccessibleDescription(hint ?? '')
        await expect(formGroup.locator('label')).toHaveClass(
          new RegExp(`govuk-label--${labelSize}`)
        )
        await expect(select.locator('option').first()).toHaveText(selectText)
        await expect(select.locator('option').first()).toHaveJSProperty(
          'value',
          ''
        )
        await expect(formGroup.getByRole('button')).toHaveCount(0)
        await expect(
          noJavaScript.locator(
            '.autocomplete__wrapper, .app-autocomplete__button'
          )
        ).toHaveCount(0)
      })
    })
  })
}

test.describe('country of origin change announcement', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtOrigin(page)
    await page.locator(COUNTRY_SELECT).evaluate((select) => {
      window.changeCount = 0
      select.addEventListener('change', () => {
        window.changeCount += 1
      })
    })
  })

  const changeCount = (page) => page.evaluate(() => window.changeCount)

  test('announces one change when a suggestion is clicked', async ({
    page
  }) => {
    await inputFor(page, 'countryOfOrigin').fill(france.name)
    await page.getByRole('option', { name: france.name, exact: true }).click()

    expect(await changeCount(page)).toBe(1)
    await expect(page.locator(COUNTRY_SELECT)).toHaveValue(france.code)
  })

  test('announces one change when a suggestion is chosen with Enter', async ({
    page
  }) => {
    const input = inputFor(page, 'countryOfOrigin')
    const suggestion = page.getByRole('option', {
      name: ireland.name,
      exact: true
    })
    await input.fill(ireland.name)
    await expect(suggestion).toBeVisible()
    await input.press('ArrowDown')
    await expect(suggestion).toBeFocused()
    await suggestion.press('Enter')

    expect(await changeCount(page)).toBe(1)
    await expect(page.locator(COUNTRY_SELECT)).toHaveValue(ireland.code)
  })

  test('announces one change when the box is left on an exact match', async ({
    page
  }) => {
    const input = inputFor(page, 'countryOfOrigin')
    await input.fill(france.name)
    await input.blur()

    expect(await changeCount(page)).toBe(1)
    await expect(page.locator(COUNTRY_SELECT)).toHaveValue(france.code)
  })
})

test.describe('country of origin type-ahead styles', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('uses GOV.UK typography for the enhanced input and its options', async ({
    page
  }) => {
    await startNotificationAtOrigin(page)
    const input = inputFor(page, 'countryOfOrigin')
    await input.fill('Fr')
    const option = page.getByRole('option', { name: france.name, exact: true })
    await expect(option).toBeVisible()

    const govukInputFont = await govukInputStyleOf(page, {
      properties: ['font-family', 'font-size']
    })
    await expect(input).toHaveCSS('font-family', /^"?GDS Transport/)
    for (const element of [input, option]) {
      await expectStyle(element, govukInputFont)
    }
  })

  test('keeps the upstream focus indicator on the enhanced input', async ({
    page
  }) => {
    await startNotificationAtOrigin(page)
    const input = inputFor(page, 'countryOfOrigin')
    const focusColour = await govukColourOf(page, 'focus')

    await input.focus()

    await expect(input).toHaveCSS('outline-color', focusColour)
    await expect(input).toHaveCSS('outline-width', '3px')
    await expect(input).toHaveCSS('box-shadow', /inset/)
  })

  test('gives the enhanced input the standard GOV.UK error border', async ({
    page
  }) => {
    await startNotificationAtOrigin(page)
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: originCopy.errors.countryRequired
      })
    ).toBeVisible()

    const input = inputFor(page, 'countryOfOrigin')
    await expectStyle(
      input,
      await govukInputStyleOf(page, {
        classes: 'govuk-input govuk-input--error',
        properties: ['border-top-color', 'border-top-width']
      })
    )
    await expect(page.locator('#countryOfOrigin-error')).toHaveCSS(
      'color',
      await govukColourOf(page, 'error')
    )
  })
})

const govukInputStyleOf = (page, { classes = 'govuk-input', properties }) =>
  page.evaluate(
    ({ className, names }) => {
      const reference = document.createElement('input')
      reference.className = className
      document.body.append(reference)
      const style = window.getComputedStyle(reference)
      const values = Object.fromEntries(
        names.map((name) => [name, style.getPropertyValue(name)])
      )
      reference.remove()
      return values
    },
    { className: classes, names: properties }
  )

const expectStyle = async (locator, style) => {
  for (const [property, value] of Object.entries(style)) {
    await expect(locator).toHaveCSS(property, value)
  }
}

const measureJoinedSearchButton = (input) =>
  input.evaluate((inputElement) => {
    const container = inputElement.closest('.app-autocomplete')
    const button = container.querySelector('.app-autocomplete__button')
    const inputEdges = inputElement.getBoundingClientRect()
    const buttonEdges = button.getBoundingClientRect()
    return {
      inputTop: inputEdges.top,
      inputBottom: inputEdges.bottom,
      inputRight: inputEdges.right,
      buttonTop: buttonEdges.top,
      buttonBottom: buttonEdges.bottom,
      buttonRight: buttonEdges.right,
      buttonWidth: buttonEdges.width,
      buttonHeight: buttonEdges.height
    }
  })

const boldLettersOf = (page, suggestionName) =>
  page
    .getByRole('option', { name: suggestionName, exact: true })
    .locator('strong')
    .allTextContents()
