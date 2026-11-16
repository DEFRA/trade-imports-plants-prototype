import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  BASE,
  journeyIdFromPage,
  notificationPageWithTrail,
  pageUrlOnWalk,
  setUrl
} from './set-base.js'
import { TRAIL_START } from '../src/server/app/shared/trail.js'
import { signIn } from './sign-in.js'
import { seedFields } from './seed-fields.js'
import { copy as statusCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-status/copy/copy.en.js'
import { copy as sharedCopy } from '../src/server/app/shared/copy.en.js'
import { PAGE_SIZE } from '../src/server/app/services/address-book/index.js'
import { STUB_BOOK_SIZE } from '../src/server/app/services/address-book/stub/index.js'
import { copy as dashboardCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/dashboard/copy/copy.en.js'
import { copy as commodityTypeCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/commodity-type/copy/copy.en.js'
import { copy as commodityCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/commodities/copy/copy.en.js'
import { copy as arrivalCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-details/copy/copy.en.js'
import { copy as idsCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/identification-numbers/copy/copy.en.js'
import { copy as checkAnswersCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/check-answers/copy/copy.en.js'
import { copy as pickerCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/address-book-picker/copy/copy.en.js'
import { copy as hubCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/hub/copy/copy.en.js'
import { copy as originCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/origin/copy/copy.en.js'
import { copy as declarationCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/declaration/copy/copy.en.js'

export const POTATO_VARIETY = 'Maris Piper'
export const ADDRESS_BOOK_PARTY = 'Tech Imports Ltd'
export const POTATO_WALK = [
  'commodity-type',
  'commodities',
  'origin',
  'arrival-details',
  'destinations/select',
  'identification-numbers',
  'consignment/contact/select'
]
export const REVIEW_URL_FROM_POTATO_WALK = pageUrlOnWalk(
  'notification-view',
  POTATO_WALK
)
export const REVIEW_URL_WITHOUT_TRAIL = setUrl(
  '/notifications/[^/]+/notification-view'
)
export const POTATO_CHANGE_LINK_TRAIL = [
  TRAIL_START.dashboard,
  ...POTATO_WALK,
  'notification-view'
]

const COMMODITY_TYPE_URL = pageUrlOnWalk('commodity-type', POTATO_WALK)
const COMMODITY_LIST_URL = notificationPageWithTrail('commodities', [
  TRAIL_START.dashboard,
  'commodity-type'
])
const ORIGIN_URL = setUrl('/notifications/[^/]+/origin$')

export const FORM_GROUP_ANCESTOR_XPATH =
  'xpath=ancestor::*[contains(@class,"govuk-form-group")][1]'

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const BLOCKING_IMPACTS = ['serious', 'critical']
const JSON_INDENT = 2

const DAYS_AHEAD_ON_TIME = 7

export const saveAndContinue = (page) =>
  page.getByRole('button', {
    name: sharedCopy.saveActions.saveAndContinue,
    exact: true
  })

export const saveAndReturnToHub = (page) =>
  page.getByRole('button', {
    name: sharedCopy.saveActions.saveAndReturnToHub,
    exact: true
  })

const cancelAndReturnToHub = (page) =>
  page.getByRole('link', {
    name: sharedCopy.saveActions.cancelAndReturnToHub
  })

const documentTop = (locator) =>
  locator.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)

const documentBottom = (locator) =>
  locator.evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY)

const computedStyle = (locator, property) =>
  locator.evaluate(
    (el, request) =>
      window.getComputedStyle(el).getPropertyValue(request.property),
    { property }
  )

/**
 * The page's error summary.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {import('@playwright/test').Locator}
 */
export const errorSummary = (page) => page.getByRole('alert')

/**
 * The links of the page's error summary, narrowed to the one named when a name is given.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} [name] - the link's accessible name.
 * @param {{ exact?: boolean }} [options] - exact: true matches the whole accessible name only.
 * @returns {import('@playwright/test').Locator}
 */
export const errorSummaryLinks = (page, name, { exact } = {}) =>
  errorSummary(page).getByRole('link', { name, exact })

/**
 * Fails unless the element has each computed style given.
 *
 * @param {import('@playwright/test').Locator} element
 * @param {Record<string, string>} styles - each CSS property's expected computed value
 */
export const expectStyle = async (element, styles) => {
  for (const [property, value] of Object.entries(styles)) {
    await expect(element).toHaveCSS(property, value)
  }
}

/**
 * Reads computed properties of an element made only from the given class names
 * and inline styles, then removes it.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ tagName: string, className?: string, cssText?: string, focused?: boolean, properties: string[] }} reference
 * @returns {Promise<Record<string, string>>} each property's computed value
 */
export const measureReferenceElement = (
  page,
  { tagName, className = '', cssText = '', focused = false, properties }
) =>
  page.evaluate(
    (request) => {
      const reference = document.createElement(request.tagName)
      reference.className = request.className
      reference.style.cssText = request.cssText
      document.body.append(reference)
      try {
        if (request.focused) {
          reference.focus()
        }
        const style = window.getComputedStyle(reference)
        return Object.fromEntries(
          request.properties.map((property) => [
            property,
            style.getPropertyValue(property)
          ])
        )
      } finally {
        reference.remove()
      }
    },
    { tagName, className, cssText, focused, properties }
  )

/**
 * Fails unless the label has the computed font size and weight of a GOV.UK label of the given size.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} label
 * @param {'s' | 'm' | 'l' | 'xl'} size
 */
export const expectGovukLabelSize = async (page, label, size) =>
  expectStyle(
    label,
    await measureReferenceElement(page, {
      tagName: 'label',
      className: `govuk-label govuk-label--${size}`,
      properties: ['font-size', 'font-weight']
    })
  )

/**
 * The computed value of one GOV.UK colour token on the page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} token - the token's name, such as `focus` for `--govuk-focus-colour`
 * @returns {Promise<string>} the colour as `rgb(…)`
 */
export const govukColourOf = async (page, token) => {
  const { color } = await measureReferenceElement(page, {
    tagName: 'span',
    cssText: `color: var(--govuk-${token}-colour)`,
    properties: ['color']
  })
  return color
}

const datePickerOf = (page, label) =>
  page.locator('.moj-datepicker', { has: page.getByLabel(label) })

const dateToggleOf = (page, label) =>
  datePickerOf(page, label).getByRole('button', { name: 'Choose date' })

const openDatePicker = async (page, label) => {
  await dateToggleOf(page, label).click()
  const dialog = datePickerOf(page, label).getByRole('dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

const luminanceOf = (cssColour) => {
  const [red, green, blue] = cssColour.match(/\d+(\.\d+)?/g).map(Number)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

const expectBrandButtonThatDarkensOnHoverAndTakesFocusColours = async (
  page,
  button
) => {
  await expect(button).toHaveCSS(
    'background-color',
    await govukColourOf(page, 'brand')
  )
  await expect(button).toHaveCSS(
    'color',
    await govukColourOf(page, 'inverse-text')
  )
  const restingBackground = await computedStyle(button, 'background-color')

  await button.hover()
  await expect(button).not.toHaveCSS('background-color', restingBackground)
  const hoverBackground = await computedStyle(button, 'background-color')
  expect(luminanceOf(hoverBackground)).toBeLessThan(
    luminanceOf(restingBackground)
  )

  await button.focus()
  await expect(button).toHaveCSS(
    'background-color',
    await govukColourOf(page, 'focus')
  )
  await expect(button).toHaveCSS(
    'color',
    await govukColourOf(page, 'focus-text')
  )
}

const contentWidthOf = (locator) =>
  locator.evaluate((el) => {
    const style = window.getComputedStyle(el)
    return (
      el.clientWidth -
      Number.parseFloat(style.paddingLeft) -
      Number.parseFloat(style.paddingRight)
    )
  })

export const JOURNEY_FORM_SELECTOR = 'form[method="post"]'

/**
 * The page's journey form, the one that posts the page's answers.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {import('@playwright/test').Locator}
 */
export const journeyFormOf = (page) => page.locator(JOURNEY_FORM_SELECTOR)

const WIDTH_TOLERANCE_PX = 1

const expectSubmittedSearchLayout = async (page, { search, expectedWidth }) => {
  const box = page.getByLabel(search.label, { exact: true })
  const button = page.getByRole('button', {
    name: search.button,
    exact: true
  })
  const wrapper = page.locator('.moj-search__input-wrapper', { has: box })

  await expect(box).toHaveAccessibleDescription(search.hint)
  await expect(wrapper.getByRole('button')).toHaveCount(1)

  const boxEdge = await box.evaluate((el) => el.getBoundingClientRect().right)
  const buttonEdge = await button.evaluate(
    (el) => el.getBoundingClientRect().left
  )
  expect(buttonEdge).toBeCloseTo(boxEdge, 0)

  const { width } = await wrapper.boundingBox()
  expect(Math.abs(width - expectedWidth)).toBeLessThanOrEqual(
    WIDTH_TOLERANCE_PX
  )
}

const searchByPressingEnter = async (page, { search, term }) => {
  const box = page.getByLabel(search.label, { exact: true })
  await box.fill(term)
  await Promise.all([page.waitForEvent('load'), box.press('Enter')])
  await expect(box).toHaveValue(term)
  await expect(errorSummary(page)).toHaveCount(0)
}

export const DENMARK = 'Denmark'
export const COPENHAGEN = 'Copenhagen Exports ApS'
export const MATCHES_NOTHING = 'nothing matches this'
export const IMPORT_CO = 'Import Co UK'
export const ALPINE = 'Alpine Supplies GmbH'
export { STUB_BOOK_SIZE }
export const SECOND_PAGE_LINK = 'Page 2'
export const THIRD_PAGE_LINK = 'Page 3'

/**
 * The back link of a journey page.
 *
 * @param {import('@playwright/test').Page} page
 */
export const backLink = (page) =>
  page.getByRole('link', { name: sharedCopy.layout.back, exact: true })

export const visitOverviewThenOpen = async (page, reference, path) => {
  await page.goto(`${BASE}/notifications/${reference}`)
  await page.goto(path)
}

/**
 * The search box of an address picker page.
 *
 * @param {import('@playwright/test').Page} page
 */
export const searchBox = (page) =>
  page.getByLabel(pickerCopy.search.label, { exact: true })

/**
 * Opens the page's current URL in a new signed-in context with JavaScript
 * switched off, hands that page to `use`, and closes the context afterwards.
 *
 * @param {import('@playwright/test').Page} page - the signed-in page to reopen
 * @param {import('@playwright/test').Browser} browser
 * @param {(plainPage: import('@playwright/test').Page) => Promise<void>} use
 */
export const withoutJavaScript = async (page, browser, use) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    storageState: await page.context().storageState()
  })
  try {
    const plainPage = await context.newPage()
    await plainPage.goto(page.url())
    await use(plainPage)
  } finally {
    await context.close()
  }
}

/**
 * Declares the tests every address picker's submitted search box shares: its
 * hint, width and joined button, the search button's colours at rest, on hover
 * and on focus, searching by pressing Enter without JavaScript, and axe on the
 * empty, searched and no-match states.
 *
 * @param {object} options
 * @param {string} options.pickerName - names the picker in the test titles
 * @param {(page: import('@playwright/test').Page) => Promise<unknown>} options.openPicker
 *   - opens the picker page for a signed-in page
 */
export const describeSubmittedSearchPicker = ({ pickerName, openPicker }) => {
  test.describe(`${pickerName} submitted search`, () => {
    test.beforeEach(async ({ page }) => {
      await signIn(page)
      await openPicker(page)
    })

    test(`the ${pickerName} search box is hinted, half the column wide and joined flush to its one search button`, async ({
      page
    }) => {
      const columnWidth = await contentWidthOf(journeyFormOf(page))

      await expectSubmittedSearchLayout(page, {
        search: pickerCopy.search,
        expectedWidth: columnWidth / 2
      })
    })

    test(`the ${pickerName} search button is in the GOV.UK brand colour, darkens on hover and takes the GOV.UK focus colours`, async ({
      page
    }) => {
      await expectBrandButtonThatDarkensOnHoverAndTakesFocusColours(
        page,
        page.getByRole('button', {
          name: pickerCopy.search.button,
          exact: true
        })
      )
    })

    test(`the ${pickerName} picker has no serious or critical axe violations empty, searched and with no matches`, async ({
      page
    }) => {
      const searchButton = page.getByRole('button', {
        name: pickerCopy.search.button,
        exact: true
      })
      await expectNoSeriousOrCriticalViolations(page, `${pickerName} empty`)

      await searchBox(page).fill(DENMARK)
      await searchButton.click()
      await expectNoSeriousOrCriticalViolations(page, `${pickerName} searched`)

      await searchBox(page).fill(MATCHES_NOTHING)
      await searchButton.click()
      await expectNoSeriousOrCriticalViolations(
        page,
        `${pickerName} with no matches`
      )
    })
  })

  test(`pressing Enter in the ${pickerName} search box narrows the list on the server without JavaScript`, async ({
    page,
    browser
  }) => {
    await signIn(page)
    await openPicker(page)
    await withoutJavaScript(page, browser, async (plainPage) => {
      await searchByPressingEnter(plainPage, {
        search: pickerCopy.search,
        term: DENMARK
      })

      await expect(addressRowRadio(plainPage, COPENHAGEN)).toBeVisible()
      await expect(addressRowRadio(plainPage, ADDRESS_BOOK_PARTY)).toHaveCount(
        0
      )
    })
  })
}

const expectCalendarEndsAboveNextQuestion = async (
  page,
  label,
  nextQuestionLabel
) => {
  const dialog = await openDatePicker(page, label)
  await expect(nextQuestionLabel).toBeVisible()
  const calendarBottom = await documentBottom(dialog)
  const nextQuestionTop = await documentTop(nextQuestionLabel)

  expect(calendarBottom).toBeLessThanOrEqual(nextQuestionTop)
}

const expectMouseOpenedCalendarFocusesOpenedOnDay = async (page, label) => {
  const dialog = await openDatePicker(page, label)

  await expect(
    dialog.locator('.moj-datepicker__button--selected')
  ).toBeFocused()
}

const expectKeyboardOpenedCalendarInFocusColours = async (page, label) => {
  await dateToggleOf(page, label).focus()
  await page.keyboard.press('Enter')
  const dialog = datePickerOf(page, label).getByRole('dialog')
  await expect(dialog).toBeVisible()
  const focusColour = await govukColourOf(page, 'focus')
  const calendarBody = dialog.locator('tbody')

  const focusedDay = dialog.locator('.moj-datepicker__button:focus')
  await expect(focusedDay).toHaveCSS('background-color', focusColour)
  await expect(focusedDay).toHaveCSS(
    'color',
    await govukColourOf(page, 'focus-text')
  )
  await expect(calendarBody).not.toHaveCSS('outline-style', 'none')
  await expect(calendarBody).toHaveCSS('outline-color', focusColour)
}

export const describeDatePickerLook = ({
  fieldName,
  label,
  nextQuestionLabel
}) => {
  test(`the ${fieldName} button that opens the calendar is in the GOV.UK brand colour with an inverse-text icon, darkens on hover and takes the GOV.UK focus colours`, async ({
    page
  }) => {
    await expectBrandButtonThatDarkensOnHoverAndTakesFocusColours(
      page,
      dateToggleOf(page, label)
    )
  })

  test(`the ${fieldName} calendar ends above the next question`, async ({
    page
  }) => {
    await expectCalendarEndsAboveNextQuestion(
      page,
      label,
      nextQuestionLabel(page)
    )
  })

  test(`the ${fieldName} calendar opened with the mouse puts focus on the opened-on day`, async ({
    page
  }) => {
    await expectMouseOpenedCalendarFocusesOpenedOnDay(page, label)
  })

  test(`the ${fieldName} calendar opened with the keyboard shows the focused day and an outline round the calendar body in the GOV.UK focus colours`, async ({
    page
  }) => {
    await expectKeyboardOpenedCalendarInFocusColours(page, label)
  })
}

/**
 * Fails unless the journey form offers Save and continue, Save and return to
 * overview and Cancel and return to overview in that order, with Save and
 * return to overview as the form's last button.
 * Save and continue and Save and return to overview must be the only buttons
 * in one button group.
 * Cancel and return to overview must sit below that group.
 *
 * @param {import('@playwright/test').Page} page
 */
export const expectThreeSaveControls = async (page) => {
  const form = journeyFormOf(page)
  const saveControls = form
    .locator(saveAndContinue(page))
    .or(form.locator(saveAndReturnToHub(page)))
    .or(form.locator(cancelAndReturnToHub(page)))

  await expect(saveControls).toHaveText([
    sharedCopy.saveActions.saveAndContinue,
    sharedCopy.saveActions.saveAndReturnToHub,
    sharedCopy.saveActions.cancelAndReturnToHub
  ])
  await expect(form.getByRole('button').last()).toHaveText(
    sharedCopy.saveActions.saveAndReturnToHub
  )

  const buttonGroup = form.locator('.govuk-button-group', {
    has: saveAndContinue(page)
  })
  await expect(buttonGroup.getByRole('button')).toHaveText([
    sharedCopy.saveActions.saveAndContinue,
    sharedCopy.saveActions.saveAndReturnToHub
  ])
  expect(await documentTop(cancelAndReturnToHub(page))).toBeGreaterThanOrEqual(
    await documentBottom(buttonGroup)
  )
}

/**
 * Chooses a type-ahead option by its field's visible label: the enhanced
 * search box with JavaScript, the native select without it.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ label: string, optionName: string, query?: string, inputId?: string }} field
 *   - `query` is the text typed into the search box, defaulting to the option's name.
 *   - `inputId` scopes the label lookup to one form group when the page shows
 *   the same label more than once.
 */
export const chooseTypeAheadOption = async (
  page,
  { label, optionName, query = optionName, inputId }
) => {
  await page.waitForLoadState('domcontentloaded')
  const scope = inputId
    ? page.locator(`#${inputId}`).locator(FORM_GROUP_ANCESTOR_XPATH)
    : page
  const field = scope.getByLabel(label, { exact: true })
  if ((await field.evaluate((el) => el.tagName)) === 'SELECT') {
    await field.selectOption({ label: optionName })
    return
  }
  await field.click()
  await field.fill(query)
  await page.getByRole('option', { name: optionName, exact: true }).click()
}

export const chooseCountryOfOrigin = (page, country) =>
  chooseTypeAheadOption(page, {
    label: originCopy.country.label,
    optionName: country
  })

/**
 * Fails the test on any serious or critical WCAG 2.0, 2.1 or 2.2 violation.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} subject - what is being checked, named in the failure
 */
export const expectNoSeriousOrCriticalViolations = async (page, subject) => {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
  const blocking = results.violations.filter(({ impact }) =>
    BLOCKING_IMPACTS.includes(impact)
  )
  expect(
    blocking,
    `${subject} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, JSON_INDENT)}`
  ).toEqual([])
}

export const overwriteRadioInputs = async (
  page,
  { inputSelector, postedValue }
) => {
  const inputs = page.locator(inputSelector)
  await expect(inputs.first()).toBeAttached()
  await inputs.evaluateAll(
    (elements, request) => {
      elements.forEach((element) => {
        element.checked = false
      })
      if (request.postedValue) {
        elements[0].value = request.postedValue
        elements[0].checked = true
      }
    },
    { postedValue }
  )
}

/**
 * Starts a notification from the dashboard.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>} the notification's reference
 */
export const startNotification = async (page) => {
  await page.goto(BASE)
  await page.getByRole('button', { name: dashboardCopy.startButton }).click()
  await expect(page).toHaveURL(COMMODITY_TYPE_URL)
  return journeyIdFromPage(page)
}

/**
 * Starts a notification, saves potatoes as its commodity type and opens its
 * Overview.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>} the notification's reference
 */
export const startNotificationAtOverview = async (page) => {
  const reference = await startNotification(page)
  await page
    .getByRole('radio', {
      name: commodityTypeCopy.typeLabels.potatoes,
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
  await page.goto(`${BASE}/notifications/${reference}`)
  await expect(page).toHaveURL(setUrl('/notifications/[^/]+$'))
  return reference
}

/**
 * Answers the commodity-type question for a notification with no commodity
 * lines, landing on the commodity details page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} commodityType - a commodity-type value, such as `potatoes`
 * @param {{ trailBefore?: string[] }} [options] - the places on the trail
 *   before the commodity-type page; the dashboard by default
 */
export const chooseCommodityType = async (
  page,
  commodityType,
  { trailBefore = [TRAIL_START.dashboard] } = {}
) => {
  await page
    .getByRole('radio', {
      name: commodityTypeCopy.typeLabels[commodityType],
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(
    notificationPageWithTrail('commodities/details', [
      ...trailBefore,
      'commodity-type'
    ])
  )
}

/**
 * Changes the commodity type of an existing notification and saves.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} reference - the notification's reference
 * @param {string} commodityType - a commodity-type value, such as `potatoes`
 */
export const changeCommodityType = async (page, reference, commodityType) => {
  await page.goto(`${BASE}/notifications/${reference}/commodity-type`)
  await page
    .getByRole('radio', {
      name: commodityTypeCopy.typeLabels[commodityType],
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
}

/**
 * Chooses the commodity category on the commodity details page and continues
 * to the page that asks for the line's fields.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} category - a commodity category value, such as `ware-potatoes`
 */
export const chooseCommodityCategory = async (page, category) => {
  await page
    .getByRole('radio', {
      name: commodityCopy.categoryLabels[category],
      exact: true
    })
    .check()
  await page
    .getByRole('button', { name: commodityCopy.details.continue, exact: true })
    .click()
}

/**
 * Fills the commodity details page and saves the line, landing on the list.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} category - a commodity category value, such as `ware-potatoes`
 * @param {Record<string, string>} fields - each details field's value, by field name
 */
export const addCommodityLine = async (page, category, fields) => {
  await chooseCommodityCategory(page, category)
  for (const [field, value] of Object.entries(fields)) {
    await page
      .getByLabel(commodityCopy.details.fields[field].label, { exact: true })
      .fill(value)
  }
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(COMMODITY_LIST_URL)
}

const openOrigin = async (page, reference) => {
  await page.goto(`${BASE}/notifications/${reference}/origin`)
  await expect(page).toHaveURL(ORIGIN_URL)
}

/**
 * Opens the origin page of a notification, chooses a country and saves it.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} reference - the notification's reference
 * @param {string} country - the country's name as the list shows it
 */
export const saveOrigin = async (page, reference, country) => {
  await openOrigin(page, reference)
  await chooseCountryOfOrigin(page, country)
  await saveAndContinue(page).click()
}

/**
 * Starts a potato notification and opens its origin page.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>} the notification's reference
 */
export const startNotificationAtOrigin = async (page) => {
  const reference = await startNotification(page)
  await chooseCommodityType(page, 'potatoes')
  await openOrigin(page, reference)
  return reference
}

export const WOOD_LINE_FIELDS = {
  commodityCode: '06042020',
  quantity: '40',
  sizeOfTree: '3.5',
  phytosanitaryTreatments: 'Heat treatment'
}

/**
 * Starts a notification for cut coniferous trees and saves France as the
 * country of origin.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>} the notification's reference
 */
export const startWoodNotificationWithOriginSaved = async (page) => {
  const reference = await startNotification(page)
  await chooseCommodityType(page, 'wood-and-cut-trees')
  await addCommodityLine(page, 'cut-coniferous-trees', WOOD_LINE_FIELDS)
  await saveOrigin(page, reference, 'France')
  return reference
}

/**
 * Starts a cut coniferous trees notification with France saved as the origin,
 * then presses Save and continue through arrival status (not yet arrived) and
 * arrival details (a date next week) to the place of destination.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>} the notification's reference
 */
export const startWoodNotificationAtPlaceOfDestination = async (page) => {
  const reference = await startWoodNotificationWithOriginSaved(page)
  await page
    .getByRole('radio', {
      name: statusCopy.statusLabels['not-yet-arrived'],
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
  await page
    .getByLabel(arrivalCopy.dateLabels['not-yet-arrived'], { exact: true })
    .fill(
      seedFields({ fields: { arrivalDate: { daysFromToday: 7 } } }).arrivalDate
    )
  await saveAndContinue(page).click()
  return reference
}

const pickAddressBookParty = async (page) => {
  await page
    .getByRole('radio', { name: `Select ${ADDRESS_BOOK_PARTY}`, exact: true })
    .check()
  await saveAndContinue(page).click()
}

/**
 * Starts a seed-potato notification from the dashboard and walks it to the
 * arrival details page.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>} the notification's reference
 */
export const startPotatoNotification = async (page) => {
  const reference = await startNotification(page)
  await chooseCommodityType(page, 'potatoes')
  await addCommodityLine(page, 'seed-potatoes', {
    potatoVariety: POTATO_VARIETY,
    quantity: '250',
    potatoIntendedUse: 'Planting'
  })
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(pageUrlOnWalk('origin', POTATO_WALK))
  await chooseCountryOfOrigin(page, 'France')
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(pageUrlOnWalk('arrival-details', POTATO_WALK))
  return reference
}

/**
 * Walks a seed-potato notification by Save and continue as far as the
 * consignment contact page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ late?: boolean }} [options] - `late` arrives today, inside the
 *   potato notice period, so the notification is late
 * @returns {Promise<string>} the notification's reference
 */
export const startPotatoNotificationAtContact = async (
  page,
  { late = false } = {}
) => {
  const reference = await startPotatoNotification(page)
  const arrival = new Date()
  arrival.setDate(arrival.getDate() + (late ? 0 : DAYS_AHEAD_ON_TIME))
  await page
    .getByLabel(arrivalCopy.dateLabels.potatoes, { exact: true })
    .fill(
      `${arrival.getDate()}/${arrival.getMonth() + 1}/${arrival.getFullYear()}`
    )
  await page.getByLabel(arrivalCopy.time.label, { exact: true }).fill('14:30')
  await chooseTypeAheadOption(page, {
    label: arrivalCopy.placeOfLanding.label,
    optionName: 'Port of Dover - GB DVR'
  })
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(
    pageUrlOnWalk('destinations/select', POTATO_WALK)
  )
  await pickAddressBookParty(page)
  await expect(page).toHaveURL(
    pageUrlOnWalk('identification-numbers', POTATO_WALK)
  )
  await page
    .getByLabel(idsCopy.fields.producerIdentificationNumber.label, {
      exact: true
    })
    .fill('P123')
  await page
    .getByLabel(idsCopy.fields.cropIdentificationNumber.label, { exact: true })
    .fill('C123')
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(
    pageUrlOnWalk('consignment/contact/select', POTATO_WALK)
  )
  return reference
}

/**
 * Walks a seed-potato notification through every task and lands on check
 * answers, ready to continue to the declaration.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ late?: boolean }} [options] - passed to
 *   `startPotatoNotificationAtContact`
 * @returns {Promise<string>} the notification's reference
 */
export const completePotatoNotification = async (page, options) => {
  const reference = await startPotatoNotificationAtContact(page, options)
  await pickAddressBookParty(page)
  await expect(page).toHaveURL(REVIEW_URL_FROM_POTATO_WALK)
  await expect(
    page.getByRole('heading', {
      name: checkAnswersCopy.submit.heading,
      level: 2
    })
  ).toBeVisible()
  await expect(
    page.getByText(checkAnswersCopy.submit.body, { exact: true })
  ).toBeVisible()
  return reference
}

/**
 * Completes a seed-potato notification and continues from check answers to
 * the declaration page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ late?: boolean }} [options] - passed to `completePotatoNotification`
 * @returns {Promise<string>} the notification's reference
 */
export const openDeclaration = async (page, options) => {
  const reference = await completePotatoNotification(page, options)
  await page
    .getByRole('button', { name: checkAnswersCopy.continue, exact: true })
    .click()
  await expect(page).toHaveURL(
    new RegExp(`${BASE}/notifications/${reference}/declaration$`)
  )
  return reference
}

/**
 * Continues from the check answers page, confirms the declaration and
 * continues, and fails unless the confirmation page for the notification
 * opens.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} reference - the notification's reference
 */
export const submitDeclarationFromCheckAnswers = async (page, reference) => {
  await page
    .getByRole('button', { name: checkAnswersCopy.continue, exact: true })
    .click()
  await expect(page).toHaveURL(setUrl('/notifications/[^/]+/declaration'))
  await page
    .getByRole('checkbox', { name: declarationCopy.declarationLabel })
    .check()
  await page
    .getByRole('button', { name: declarationCopy.continueButton, exact: true })
    .click()
  await expect(page).toHaveURL(
    new RegExp(`${BASE}/notifications/${reference}/confirmation$`)
  )
}

/**
 * The radio for one address on an address picker page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} name - the address's name
 */
export const addressRowRadio = (page, name) =>
  page.getByRole('radio', {
    name: `${pickerCopy.selectRowPrefix} ${name}`,
    exact: true
  })

/**
 * The inset that names the address already chosen on an address picker page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} name - the address's name
 */
export const selectedAddressInset = (page, name) =>
  page.getByText(`${pickerCopy.selectedAddressPrefix} ${name}`, {
    exact: true
  })

const searchAddressBook = async (page, term) => {
  await searchBox(page).fill(term)
  await page.getByRole('button', { name: pickerCopy.search.button }).click()
}

/**
 * The paragraph straight after the results heading: the count, or the
 * no-matches message when nothing matched.
 *
 * @param {import('@playwright/test').Page} page
 */
export const pickerResultsSummary = (page) =>
  page
    .getByRole('heading', { name: pickerCopy.resultsHeading, level: 2 })
    .locator('xpath=following-sibling::*[1][self::p]')

/**
 * Fails unless an address picker page shows the results heading with the
 * count straight under it, offers its radios as one group named by that
 * heading, whose legend is hidden from sight as a GOV.UK visually-hidden
 * element is, and has only a paragraph with no link between the page heading
 * and the form.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} count - the count the first page reads
 */
export const expectPickerResultsLayout = async (page, count) => {
  await expect(pickerResultsSummary(page)).toHaveText(count)
  await expect(
    page
      .getByRole('group', { name: pickerCopy.resultsHeading })
      .getByRole('radio')
  ).toHaveCount(PAGE_SIZE)
  await expectStyle(
    page
      .getByRole('group', { name: pickerCopy.resultsHeading })
      .locator('legend'),
    await measureReferenceElement(page, {
      tagName: 'span',
      className: 'govuk-visually-hidden',
      properties: ['position', 'overflow', 'clip-path']
    })
  )
  await expect(page.getByRole('radio')).toHaveCount(PAGE_SIZE)

  const heading = page.getByRole('heading', { level: 1 })
  const beforeTheForm = 'following-sibling::*[following-sibling::form]'
  await expect(
    heading.locator(`xpath=${beforeTheForm}`).first()
  ).toHaveJSProperty('tagName', 'P')
  await expect(
    heading.locator(`xpath=${beforeTheForm}[not(self::p) or .//a or .//button]`)
  ).toHaveCount(0)
}

export const NOT_IN_THE_BOOK = 'no-such-address'

const postUnknownAddressId = async (
  page,
  fieldName,
  { saveControlOf = saveAndContinue } = {}
) => {
  await journeyFormOf(page).evaluate(
    (form, request) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = request.fieldName
      input.value = request.unknownAddressId
      form.append(input)
    },
    { fieldName, unknownAddressId: NOT_IN_THE_BOOK }
  )
  await saveControlOf(page).click()
}

/**
 * Posts the picker with an id the address book does not hold, under the name
 * of the first listed address's radio.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} [options]
 * @param {(page: import('@playwright/test').Page) => import('@playwright/test').Locator} [options.saveControlOf] - the save control the post goes through; Save and continue by default
 */
export const postAnIdNotInTheBook = async (page, options) => {
  const fieldName = await page.getByRole('radio').first().getAttribute('name')
  await postUnknownAddressId(page, fieldName, options)
}

/**
 * Searches for a term nothing matches, then posts the picker with an id the
 * address book does not hold.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} firstRowRadio - selector of the first address in the list,
 *   whose name the posted id is sent under
 */
export const postAnIdNotInTheBookAfterAnEmptySearch = async (
  page,
  firstRowRadio
) => {
  const fieldName = await page.locator(firstRowRadio).getAttribute('name')
  await searchAddressBook(page, MATCHES_NOTHING)
  await expect(pickerResultsSummary(page)).toHaveText(pickerCopy.noMatches)
  await postUnknownAddressId(page, fieldName)
}

/**
 * Follows the second page link and fails unless the address ticked on the
 * first page is still named as the selected address, and no longer listed.
 *
 * @param {import('@playwright/test').Page} page
 */
export const expectSelectedAddressCarriedToSecondPage = async (page) => {
  await page.getByRole('link', { name: SECOND_PAGE_LINK, exact: true }).click()

  await expect(selectedAddressInset(page, ADDRESS_BOOK_PARTY)).toBeVisible()
  await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).toHaveCount(0)
}

/**
 * Declares the tests every single-address picker shares: listing and counting
 * the address book, searching and paging it, saving and leaving the page,
 * moving on with no address chosen and refusing an address not in the book,
 * which also gives the radios' form group the GOV.UK error border.
 *
 * @param {object} options
 * @param {string} options.pickerName - names the picker in the test group titles
 * @param {(page: import('@playwright/test').Page) => Promise<string>} options.openPicker
 *   - opens the picker page for a signed-in page and returns the notification's reference
 * @param {(reference: string) => string} options.pathOf - the picker page's address for a notification
 * @param {string} options.notInBookError - the error shown for an address not in the book
 * @param {string} options.hubRowTitle - the picker's row title on the overview
 * @param {RegExp | string} options.hubUrl - the overview's address
 * @param {RegExp | string} options.pageUrl - the picker page's address
 * @param {RegExp | string} options.afterSaveUrl - where Save and continue goes
 * @param {string} options.firstRowRadio - selector of the first address in the list
 * @param {string[]} [options.landingAlerts] - the text of each alert on the page Save and continue goes to with nothing chosen; none by default
 */
export const describeAddressPicker = ({
  pickerName,
  openPicker,
  pathOf,
  notInBookError,
  hubRowTitle,
  hubUrl,
  pageUrl,
  afterSaveUrl,
  firstRowRadio,
  landingAlerts = []
}) => {
  const notInBookLink = (page) => errorSummaryLinks(page, notInBookError)
  const notYetStartedStatusOnOverviewRow = (page) =>
    page
      .getByRole('listitem')
      .filter({ has: page.getByRole('link', { name: hubRowTitle }) })
      .getByText(hubCopy.statuses.notYetStarted, { exact: true })

  test.describe(`${pickerName} — listing, searching and paging`, () => {
    test.beforeEach(async ({ page }) => {
      await signIn(page)
    })

    test('shows the first page of the organisation address book with its count', async ({
      page
    }) => {
      await openPicker(page)

      await expectPickerResultsLayout(
        page,
        pickerCopy.resultsCount(PAGE_SIZE, STUB_BOOK_SIZE)
      )
      await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).toBeVisible()
      await expect(addressRowRadio(page, ALPINE)).toHaveCount(0)
    })

    test('narrows the results to the search term', async ({ page }) => {
      await openPicker(page)

      await searchAddressBook(page, DENMARK)

      await expect(addressRowRadio(page, COPENHAGEN)).toBeVisible()
      await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).toHaveCount(0)
    })

    test('says so rather than showing an empty table when nothing matches', async ({
      page
    }) => {
      await openPicker(page)

      await searchAddressBook(page, MATCHES_NOTHING)

      await expect(pickerResultsSummary(page)).toHaveText(pickerCopy.noMatches)
    })

    test('clearing the search and searching with nothing entered lists the whole book, showing the first page and a link to the second', async ({
      page
    }) => {
      await openPicker(page)
      await searchAddressBook(page, DENMARK)
      await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).toHaveCount(0)

      await searchAddressBook(page, '')

      await expectPickerResultsLayout(
        page,
        pickerCopy.resultsCount(PAGE_SIZE, STUB_BOOK_SIZE)
      )
      await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).toBeVisible()
      await expect(
        page.getByRole('link', { name: SECOND_PAGE_LINK, exact: true })
      ).toBeVisible()
    })

    test('keeps a ticked row while the search narrows the results', async ({
      page
    }) => {
      await openPicker(page)

      await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
      await searchAddressBook(page, DENMARK)

      await expect(selectedAddressInset(page, ADDRESS_BOOK_PARTY)).toBeVisible()
    })

    test('carries a newly ticked address through the paging links', async ({
      page
    }) => {
      await openPicker(page)
      await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()

      await expectSelectedAddressCarriedToSecondPage(page)
    })

    test('carries a saved address through the paging links', async ({
      page
    }) => {
      const reference = await openPicker(page)
      await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
      await saveAndContinue(page).click()
      await page.goto(pathOf(reference))

      await expectSelectedAddressCarriedToSecondPage(page)
    })

    test('an address chosen on a later page is saved, and reopening names it although its row is not on the first page', async ({
      page
    }) => {
      const reference = await openPicker(page)
      await page
        .getByRole('link', { name: SECOND_PAGE_LINK, exact: true })
        .click()
      await page
        .getByRole('link', { name: THIRD_PAGE_LINK, exact: true })
        .click()
      await addressRowRadio(page, ALPINE).check()

      await saveAndContinue(page).click()
      await expect(page).toHaveURL(afterSaveUrl)
      await page.goto(pathOf(reference))

      await expect(selectedAddressInset(page, ALPINE)).toBeVisible()
      await expect(addressRowRadio(page, ALPINE)).toHaveCount(0)
    })
  })

  test.describe(`${pickerName} — saving an address`, () => {
    test.beforeEach(async ({ page }) => {
      await signIn(page)
    })

    test('saves the chosen address, continues to the next page and shows it again on return', async ({
      page
    }) => {
      const reference = await openPicker(page)

      await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
      await saveAndContinue(page).click()

      await expect(page).toHaveURL(afterSaveUrl)

      await page.goto(pathOf(reference))
      await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).toBeChecked()
      await expect(selectedAddressInset(page, ADDRESS_BOOK_PARTY)).toBeVisible()
    })

    test('replaces the address already saved rather than keeping both', async ({
      page
    }) => {
      const reference = await openPicker(page)
      await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
      await saveAndContinue(page).click()
      await page.goto(pathOf(reference))

      await addressRowRadio(page, IMPORT_CO).check()
      await saveAndContinue(page).click()
      await page.goto(pathOf(reference))

      await expect(addressRowRadio(page, IMPORT_CO)).toBeChecked()
      await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).not.toBeChecked()
    })

    test('Save and return to overview saves the address and reaches the overview', async ({
      page
    }) => {
      const reference = await openPicker(page)

      await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
      await saveAndReturnToHub(page).click()

      await expect(page).toHaveURL(hubUrl)

      await page.goto(pathOf(reference))
      await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).toBeChecked()
    })

    test('Save and return to overview with nothing chosen reaches the overview without an error', async ({
      page
    }) => {
      const reference = await openPicker(page)

      await saveAndReturnToHub(page).click()

      await expect(page).toHaveURL(hubUrl)

      await page.goto(pathOf(reference))
      await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).not.toBeChecked()
      await expect(errorSummary(page)).toHaveCount(0)
    })

    test('Cancel and return to overview reaches the overview without saving', async ({
      page
    }) => {
      const reference = await openPicker(page)

      await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
      await cancelAndReturnToHub(page).click()

      await expect(page).toHaveURL(hubUrl)

      await page.goto(pathOf(reference))
      await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).not.toBeChecked()
    })
  })

  test.describe(`${pickerName} — moving on with nothing chosen and refusing an address not in the book`, () => {
    test.beforeEach(async ({ page }) => {
      await signIn(page)
    })

    test('continuing with nothing chosen refuses nothing, shows exactly the landing alerts and leaves the overview row not yet started', async ({
      page
    }) => {
      const reference = await openPicker(page)

      await saveAndContinue(page).click()

      await expect(page).toHaveURL(afterSaveUrl)
      await expect(errorSummary(page)).toHaveText(landingAlerts)
      await page.goto(`${BASE}/notifications/${reference}`)
      await expect(notYetStartedStatusOnOverviewRow(page)).toBeVisible()
    })

    test('continuing with nothing chosen after a search that found nothing moves on', async ({
      page
    }) => {
      await openPicker(page)
      await searchAddressBook(page, MATCHES_NOTHING)
      await expect(pickerResultsSummary(page)).toHaveText(pickerCopy.noMatches)

      await saveAndContinue(page).click()

      await expect(page).toHaveURL(afterSaveUrl)
    })

    test('an address not in the book is refused, focusing the first row and keeping the search', async ({
      page
    }) => {
      await openPicker(page)
      await searchBox(page).fill(DENMARK)

      await postAnIdNotInTheBook(page)

      await expect(page).toHaveURL(pageUrl)
      await expect(notInBookLink(page)).toBeVisible()
      await expect(searchBox(page)).toHaveValue(DENMARK)
      await notInBookLink(page).click()
      await expect(page.locator(firstRowRadio)).toBeFocused()
    })

    test("the radios' form group has the GOV.UK form-group border and spacing until an address not in the book is refused, then the GOV.UK error border", async ({
      page
    }) => {
      const formGroup = () =>
        page
          .getByRole('group', { name: pickerCopy.resultsHeading })
          .locator('xpath=..')
      const formGroupStyleOf = (className) =>
        measureReferenceElement(page, {
          tagName: 'div',
          className,
          properties: [
            'border-left-style',
            'border-left-width',
            'border-left-color',
            'margin-bottom'
          ]
        })
      await openPicker(page)

      await expectStyle(formGroup(), await formGroupStyleOf('govuk-form-group'))

      await postAnIdNotInTheBook(page)

      await expect(notInBookLink(page)).toBeVisible()
      await expectStyle(
        formGroup(),
        await formGroupStyleOf('govuk-form-group govuk-form-group--error')
      )
    })

    test('an address not in the book is refused on Save and return to overview, staying on the page and keeping the search', async ({
      page
    }) => {
      await openPicker(page)
      await searchBox(page).fill(DENMARK)

      await postAnIdNotInTheBook(page, { saveControlOf: saveAndReturnToHub })

      await expect(page).toHaveURL(pageUrl)
      await expect(notInBookLink(page)).toBeVisible()
      await expect(searchBox(page)).toHaveValue(DENMARK)
    })

    test('an address not in the book after a search that found nothing is refused, focusing the search box, which keeps the term', async ({
      page
    }) => {
      await openPicker(page)

      await postAnIdNotInTheBookAfterAnEmptySearch(page, firstRowRadio)

      await expect(page).toHaveURL(pageUrl)
      await expect(notInBookLink(page)).toBeVisible()
      await notInBookLink(page).click()
      await expect(searchBox(page)).toBeFocused()
      await expect(searchBox(page)).toHaveValue(MATCHES_NOTHING)
    })

    test('choosing an address after that refusal moves on', async ({
      page
    }) => {
      await openPicker(page)
      await postAnIdNotInTheBook(page)
      await expect(notInBookLink(page)).toBeVisible()

      await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
      await saveAndContinue(page).click()

      await expect(page).toHaveURL(afterSaveUrl)
    })
  })
}

/**
 * Saves a commodity line opened from a review Change link, continues from the
 * list and checks the origin page is reached with the places before the line,
 * the list and the page the line was changed on the trail.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string[]} changeLinkTrail - the trail the Change link carried
 */
export const continueFromChangedCommodityLine = async (
  page,
  changeLinkTrail
) => {
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(
    notificationPageWithTrail('commodities', changeLinkTrail)
  )
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(
    notificationPageWithTrail('origin', [...changeLinkTrail, 'commodities'])
  )
}
