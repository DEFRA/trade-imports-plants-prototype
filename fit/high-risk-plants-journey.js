import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { BASE, journeyIdFromPage, setUrl } from './set-base.js'
import { signIn } from './sign-in.js'
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

export const POTATO_VARIETY = 'Maris Piper'
export const ADDRESS_BOOK_PARTY = 'Tech Imports Ltd'
export const CHECK_ANSWERS_URL = setUrl(
  '/notifications/[^/]+/notification-view$'
)

const COMMODITY_TYPE_URL = setUrl('/notifications/[^/]+/commodity-type$')
const COMMODITY_DETAILS_URL = setUrl('/notifications/[^/]+/commodities/details')
const COMMODITY_LIST_URL = setUrl('/notifications/[^/]+/commodities$')
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

const documentTop = (locator) =>
  locator.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)

const documentBottom = (locator) =>
  locator.evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY)

const computedStyle = (locator, property) =>
  locator.evaluate(
    (el, name) => window.getComputedStyle(el).getPropertyValue(name),
    property
  )

/**
 * The computed value of one GOV.UK colour token on the page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} token - the token's name, such as `focus` for `--govuk-focus-colour`
 * @returns {Promise<string>} the colour as `rgb(…)`
 */
export const govukColourOf = (page, token) =>
  page.evaluate((name) => {
    const reference = document.createElement('span')
    reference.style.color = `var(--govuk-${name}-colour)`
    document.body.append(reference)
    const { color } = window.getComputedStyle(reference)
    reference.remove()
    return color
  }, token)

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
  await expect(page.getByRole('alert')).toHaveCount(0)
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
 * Fails unless the page offers Save and continue and Save and return to
 * overview in its button group and Cancel and return to overview in the
 * paragraph after the group.
 *
 * @param {import('@playwright/test').Page} page
 */
export const expectThreeSaveControls = async (page) => {
  const buttonGroup = page.locator('.govuk-button-group', {
    has: saveAndContinue(page)
  })

  await expect(buttonGroup.getByRole('button')).toHaveText([
    sharedCopy.saveActions.saveAndContinue,
    sharedCopy.saveActions.saveAndReturnToHub
  ])
  await expect(
    buttonGroup
      .locator('xpath=following-sibling::p[1]')
      .getByRole('link', { name: sharedCopy.saveActions.cancelAndReturnToHub })
  ).toBeVisible()
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
 * Answers the commodity-type question for a notification with no commodity
 * lines, landing on the commodity details page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} commodityType - a commodity-type value, such as `potatoes`
 */
export const chooseCommodityType = async (page, commodityType) => {
  await page
    .getByRole('radio', {
      name: commodityTypeCopy.typeLabels[commodityType],
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(COMMODITY_DETAILS_URL)
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
  await expect(page).toHaveURL(ORIGIN_URL)
  await chooseCountryOfOrigin(page, 'France')
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(/\/arrival-details$/)
  return reference
}

/**
 * Walks a seed-potato notification through the opening run as far as the
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
  await expect(page).toHaveURL(/\/destinations\/select$/)
  await pickAddressBookParty(page)
  await expect(page).toHaveURL(/\/identification-numbers$/)
  await page
    .getByLabel(idsCopy.fields.producerIdentificationNumber.label, {
      exact: true
    })
    .fill('P123')
  await page
    .getByLabel(idsCopy.fields.cropIdentificationNumber.label, { exact: true })
    .fill('C123')
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(/\/consignment\/contact\/select$/)
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
  await expect(page).toHaveURL(CHECK_ANSWERS_URL)
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
 * heading, and has only a paragraph with no link between the page heading and
 * the form.
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

const postUnknownAddressId = async (page, fieldName) => {
  await journeyFormOf(page).evaluate(
    (form, { name, id }) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      input.value = id
      form.append(input)
    },
    { name: fieldName, id: NOT_IN_THE_BOOK }
  )
  await saveAndContinue(page).click()
}

/**
 * Posts the picker with an id the address book does not hold, under the name
 * of the first listed address's radio.
 *
 * @param {import('@playwright/test').Page} page
 */
export const postAnIdNotInTheBook = async (page) => {
  const fieldName = await page.getByRole('radio').first().getAttribute('name')
  await postUnknownAddressId(page, fieldName)
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
 * moving on with no address chosen and refusing an address not in the book.
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
  firstRowRadio
}) => {
  const notInBookLink = (page) =>
    page.getByRole('alert').getByRole('link', { name: notInBookError })
  const overviewRowStatus = (page) =>
    page
      .getByRole('listitem')
      .filter({ has: page.getByRole('link', { name: hubRowTitle }) })
      .locator('.govuk-task-list__status')

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
      await page
        .getByRole('button', {
          name: sharedCopy.saveActions.saveAndReturnToHub
        })
        .click()

      await expect(page).toHaveURL(hubUrl)

      await page.goto(pathOf(reference))
      await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).toBeChecked()
    })

    test('Save and return to overview with nothing chosen reaches the overview without an error', async ({
      page
    }) => {
      const reference = await openPicker(page)

      await page
        .getByRole('button', {
          name: sharedCopy.saveActions.saveAndReturnToHub
        })
        .click()

      await expect(page).toHaveURL(hubUrl)

      await page.goto(pathOf(reference))
      await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).not.toBeChecked()
      await expect(page.getByRole('alert')).toHaveCount(0)
    })

    test('Cancel and return to overview reaches the overview without saving', async ({
      page
    }) => {
      const reference = await openPicker(page)

      await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
      await page
        .getByRole('link', {
          name: sharedCopy.saveActions.cancelAndReturnToHub
        })
        .click()

      await expect(page).toHaveURL(hubUrl)

      await page.goto(pathOf(reference))
      await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).not.toBeChecked()
    })
  })

  test.describe(`${pickerName} — moving on with nothing chosen and refusing an address not in the book`, () => {
    test.beforeEach(async ({ page }) => {
      await signIn(page)
    })

    test('continuing with nothing chosen moves on without an error and leaves the overview row not yet started', async ({
      page
    }) => {
      const reference = await openPicker(page)

      await saveAndContinue(page).click()

      await expect(page).toHaveURL(afterSaveUrl)
      await expect(page.getByRole('alert')).toHaveCount(0)
      await page.goto(`${BASE}/notifications/${reference}`)
      await expect(overviewRowStatus(page)).toHaveText(
        hubCopy.statuses.notYetStarted
      )
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
