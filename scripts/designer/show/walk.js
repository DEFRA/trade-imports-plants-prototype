/* global document, Event */
/**
 * Browser helpers that fill in and send a prototype page the way a person
 * does, driven only by field names from a set's happy-path.json. Nothing here
 * knows any page's wording, so the same helpers walk high-risk-plants and any
 * design release copied from it, whatever its words say.
 *
 * Used by designer:show (for the walkthrough video and error states) and by
 * fit/designer-sets.fit.spec.js.
 */

/** The page's own form: the one inside the main content that posts. */
export const POST_FORM = '#main-content form[method="post"]'

const ERROR_SUMMARY = '.govuk-error-summary'
const DEFAULT_TIMEOUT_MS = 15_000

/** A value made safe to sit inside a double-quoted CSS attribute selector. */
export const cssString = (value) =>
  String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')

const byName = (name) => `${POST_FORM} [name="${cssString(name)}"]`

const SUBMIT = 'button:not([type="button"])'

/**
 * Selector for the page's main action: a GOV.UK button that is neither
 * secondary ("Search", "Remove", "Save and return to overview") nor a
 * warning. Buttons that only work on the page itself (the date picker's
 * "choose date") are `type="button"` and never count.
 */
export const MAIN_ACTION = `${POST_FORM} ${SUBMIT}.govuk-button:not(.govuk-button--secondary):not(.govuk-button--warning)`

/**
 * The page's main action, or, on a page without a GOV.UK-styled one, its
 * form's first submit button.
 */
export const primaryButton = async (page) => {
  const main = page.locator(MAIN_ACTION)
  if ((await main.count()) > 0) {
    return main.first()
  }
  return page.locator(`${POST_FORM} ${SUBMIT}`).first()
}

/** Whether the page has a form of its own to send. */
export const hasPostForm = async (page) =>
  (await page.locator(POST_FORM).count()) > 0

/** The messages in the page's error summary, if it has one. */
export const errorMessages = async (page) => {
  const items = await page
    .locator(`${ERROR_SUMMARY} .govuk-error-summary__list li`)
    .allInnerTexts()
  return items.map((text) => text.trim()).filter((text) => text !== '')
}

/** The page's main heading, or null. */
export const pageHeading = async (page) => {
  const heading = page.locator('#main-content h1').first()
  if ((await heading.count()) === 0) {
    return null
  }
  return (await heading.innerText()).trim()
}

const controlKind = (control) =>
  control.evaluate((element) =>
    element.tagName === 'SELECT' ? 'select' : element.type || 'text'
  )

const addHidden = (page, name, value) =>
  page
    .locator(POST_FORM)
    .first()
    .evaluate(
      (form, [fieldName, fieldValue]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = fieldName
        input.value = fieldValue
        form.appendChild(input)
      },
      [name, value]
    )

const setValue = (control, value) =>
  control.evaluate((element, fieldValue) => {
    element.value = fieldValue
    if (element.tagName === 'SELECT' && element.id) {
      // An enhanced type-ahead moves the select's id onto its text box and
      // renames the select "<id>-select": show the chosen option there too.
      const box = document.getElementById(element.id.replace(/-select$/, ''))
      if (box && box !== element && box.tagName === 'INPUT') {
        box.value = element.selectedOptions[0]?.textContent ?? ''
      }
    }
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)

const fillOne = async (page, name, value) => {
  const controls = page.locator(byName(name))
  if ((await controls.count()) === 0) {
    await addHidden(page, name, value)
    return
  }
  const kind = await controlKind(controls.first())
  if (kind === 'radio' || kind === 'checkbox') {
    const option = page.locator(`${byName(name)}[value="${cssString(value)}"]`)
    if ((await option.count()) > 0) {
      await option.first().check()
    } else {
      await addHidden(page, name, value)
    }
    return
  }
  const control = controls.first()
  if (kind !== 'select' && kind !== 'hidden' && (await control.isVisible())) {
    await control.fill(value)
    return
  }
  await setValue(control, value)
}

/**
 * Fills the page's form with `fields` (field name to value). Radios and
 * checkboxes are ticked, text boxes typed into, selects and hidden fields
 * set. A field the page has no control for is added as a hidden field, so the
 * form sends exactly what the example says.
 */
export const fillFields = async (page, fields) => {
  for (const [name, value] of Object.entries(fields)) {
    await fillOne(page, name, String(value))
  }
}

/** Ticks every checkbox in the page's form (a declaration, for example). */
export const tickEveryCheckbox = async (page) => {
  const boxes = page.locator(`${POST_FORM} input[type="checkbox"]`)
  const count = await boxes.count()
  for (let index = 0; index < count; index += 1) {
    await boxes.nth(index).check()
  }
}

/**
 * Presses the form's main button and waits until the browser moves to
 * another page or an error summary appears.
 *
 * @returns {Promise<{ outcome: 'moved'|'errors'|'nothing', errors: string[] }>}
 */
export const submitAndWait = async (
  page,
  { timeout = DEFAULT_TIMEOUT_MS } = {}
) => {
  const from = page.url()
  const moved = page.waitForURL((url) => url.href !== from, { timeout })
  const errored = page
    .locator(ERROR_SUMMARY)
    .first()
    .waitFor({ state: 'visible', timeout })
  const button = await primaryButton(page)
  await button.click()
  const outcome = await Promise.any([
    moved.then(() => 'moved'),
    errored.then(() => 'errors')
  ]).catch(() => 'nothing')
  await page.waitForLoadState('load')
  return {
    outcome,
    errors: outcome === 'moved' ? [] : await errorMessages(page)
  }
}
