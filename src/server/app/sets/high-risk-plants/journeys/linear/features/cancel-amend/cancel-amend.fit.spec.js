import {
  BASE,
  journeyIdFromPage,
  setPath,
  setUrl
} from '../../../../../../../../../fit/set-base.js'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as commodityCopy } from '../commodities/copy/copy.en.js'
import { copy as arrivalCopy } from '../arrival-details/copy/copy.en.js'
import { copy as idsCopy } from '../identification-numbers/copy/copy.en.js'
import { copy } from '../check-answers/copy/copy.en.js'
import { copy as cancelCopy } from './copy/copy.en.js'
import { copy as declarationCopy } from '../declaration/copy/copy.en.js'

const TAG = '.govuk-tag'
const strip = (page) => page.locator('.app-journey-strip')
const cancelAmendLink = (page) =>
  strip(page).getByRole('link', {
    name: sharedCopy.journeyStrip.cancelAmend,
    exact: true
  })

const save = (page) =>
  page.getByRole('button', {
    name: sharedCopy.saveActions.saveAndContinue,
    exact: true
  })
const CYA_PATTERN = '/notifications/[^/]+/notification-view$'
const cyaUrl = setUrl(CYA_PATTERN)
/** A rendered `href` is the path the template wrote, not a whole URL. */
const cyaHref = setPath(CYA_PATTERN)
const VARIETY = 'Maris Piper'
const contactName = 'Tech Imports Ltd'

const startNotification = async (page) => {
  await page.goto(BASE)
  await page.getByRole('button', { name: dashboardCopy.startButton }).click()
  await expect(page).toHaveURL(/\/commodity-type$/)
  const reference = journeyIdFromPage(page)
  await page
    .getByRole('radio', { name: copy.typeLabels.potatoes, exact: true })
    .check()
  await save(page).click()
  await expect(page).toHaveURL(/\/commodities\/details$/)
  await page
    .getByRole('radio', {
      name: copy.categoryLabels['seed-potatoes'],
      exact: true
    })
    .check()
  await page
    .getByRole('button', { name: commodityCopy.details.continue, exact: true })
    .click()
  await page
    .getByLabel(copy.labels.potatoVariety, { exact: true })
    .fill(VARIETY)
  await page.getByLabel(copy.labels.quantity, { exact: true }).fill('250')
  await page
    .getByLabel(copy.labels.potatoIntendedUse, { exact: true })
    .fill('Planting')
  await save(page).click()
  await expect(page).toHaveURL(/\/commodities$/)
  await save(page).click()
  await expect(page).toHaveURL(/\/origin$/)
  await page.getByRole('combobox').fill('France')
  await page.getByRole('option', { name: 'France', exact: true }).click()
  await save(page).click()
  await expect(page).toHaveURL(/\/arrival-details$/)
  return reference
}

const completeNotification = async (page, late = false) => {
  const reference = await startNotification(page)
  const date = new Date()
  date.setDate(date.getDate() + (late ? 0 : 7))
  await page
    .getByLabel(arrivalCopy.dateLabels.potatoes, { exact: true })
    .fill(`${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`)
  await page.getByLabel(arrivalCopy.time.label, { exact: true }).fill('14:30')
  await page.getByRole('combobox').fill('Dover')
  await page
    .getByRole('option', { name: 'Port of Dover - GB DVR', exact: true })
    .click()
  await save(page).click()
  await expect(page).toHaveURL(/\/destinations\/select$/)
  await page
    .getByRole('radio', { name: `Select ${contactName}`, exact: true })
    .check()
  await save(page).click()
  // The linear opening run carries straight on into the next unanswered
  // section rather than stopping at the hub — potatoes skip consignor, so
  // Save and continue here lands on identification numbers.
  await expect(page).toHaveURL(/\/identification-numbers$/)
  await page
    .getByLabel(idsCopy.fields.producerIdentificationNumber.label, {
      exact: true
    })
    .fill('P123')
  await page
    .getByLabel(idsCopy.fields.cropIdentificationNumber.label, { exact: true })
    .fill('C123')
  await save(page).click()
  await expect(page).toHaveURL(/\/consignment\/contact\/select$/)
  await page
    .getByRole('radio', { name: `Select ${contactName}`, exact: true })
    .check()
  await save(page).click()
  await expect(page).toHaveURL(cyaUrl)
  await expect(
    page.getByRole('heading', { name: copy.submit.heading, level: 2 })
  ).toBeVisible()
  await expect(page.getByText(copy.submit.body, { exact: true })).toBeVisible()
  return reference
}

const assertAccessible = async (page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(
    violations.filter(
      ({ impact }) => impact === 'serious' || impact === 'critical'
    )
  ).toEqual([])
}

test.beforeEach(async ({ page }) => {
  await signIn(page)
  const reference = await completeNotification(page)
  await page.getByRole('button', { name: copy.continue, exact: true }).click()
  await page
    .getByRole('checkbox', { name: declarationCopy.declarationLabel })
    .check()
  await page
    .getByRole('button', { name: declarationCopy.continueButton, exact: true })
    .click()
  await expect(page).toHaveURL(/\/confirmation$/)
  await page.goto(BASE)
  await page
    .getByRole('button', {
      name: `Amend notification ${reference}`,
      exact: true
    })
    .click()
  await page.goto(`${BASE}/notifications/${reference}/identification-numbers`)
  await page
    .getByLabel(idsCopy.fields.producerIdentificationNumber.label, {
      exact: true
    })
    .fill('DiscardMe99')
  await save(page).click()
  await page.goto(BASE)
  await page
    .getByRole('link', {
      name: `${dashboardCopy.actions.cancelAmend} (${reference})`,
      exact: true
    })
    .click()
  await expect(page).toHaveURL(/\/cancel-amend$/)
})

test('renders accessible confirmation copy, actions and a bare heading', async ({
  page
}) => {
  await expect(
    page.getByRole('heading', { name: cancelCopy.title, level: 1 })
  ).toBeVisible()
  await expect(page.getByText(cancelCopy.body)).toBeVisible()
  await expect(
    page.getByRole('button', { name: cancelCopy.confirmButton })
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: cancelCopy.noLink })
  ).toHaveAttribute('href', cyaHref)
  await expect(
    page.getByRole('link', { name: sharedCopy.layout.back, exact: true })
  ).toHaveAttribute('href', cyaHref)
  await expect(page.locator('.govuk-caption-l')).toHaveCount(0)
  await assertAccessible(page)
})

test('No preserves the amendment and its changes after reload', async ({
  page
}) => {
  await page.getByRole('button', { name: cancelCopy.noLink }).click()
  await expect(page).toHaveURL(cyaUrl)
  await page.reload()
  await expect(strip(page).locator(TAG)).toHaveText(
    sharedCopy.journeyStrip.amend
  )
  await expect(page.getByText('DiscardMe99', { exact: true })).toBeVisible()
})

test('Cancel amend in the strip of a question page opens the confirmation page and No keeps the amendment', async ({
  page
}) => {
  const reference = journeyIdFromPage(page)
  await page.goto(`${BASE}/notifications/${reference}/identification-numbers`)
  await expect(strip(page).locator(TAG)).toHaveText(
    sharedCopy.journeyStrip.amend
  )
  await expect(strip(page)).toContainText(reference)

  await cancelAmendLink(page).click()

  await expect(page).toHaveURL(/\/cancel-amend$/)
  await expect(
    page.getByRole('heading', { name: cancelCopy.title, level: 1 })
  ).toBeVisible()
  await expect(cancelAmendLink(page)).toHaveCount(0)

  await page.getByRole('button', { name: cancelCopy.noLink }).click()
  await expect(page).toHaveURL(cyaUrl)
  await expect(strip(page).locator(TAG)).toHaveText(
    sharedCopy.journeyStrip.amend
  )
  await expect(cancelAmendLink(page)).toBeVisible()
})

test('Overview and review offer Cancel amend while amending', async ({
  page
}) => {
  const reference = journeyIdFromPage(page)
  for (const path of ['', '/notification-view']) {
    await page.goto(`${BASE}/notifications/${reference}${path}`)
    await expect(cancelAmendLink(page)).toBeVisible()
  }
})

test('Continue on an incomplete amendment shows There is a problem, naming the outstanding task', async ({
  page
}) => {
  const reference = journeyIdFromPage(page)
  await page.goto(`${BASE}/notifications/${reference}/identification-numbers`)
  await page
    .getByLabel(idsCopy.fields.producerIdentificationNumber.label, {
      exact: true
    })
    .fill('')
  await page
    .getByRole('button', {
      name: sharedCopy.saveActions.saveAndReturnToHub,
      exact: true
    })
    .click()
  await expect(page).toHaveURL(setUrl(`/notifications/${reference}$`))
  await page.goto(`${BASE}/notifications/${reference}/notification-view`)
  await expect(page.getByRole('alert')).toHaveCount(0)

  await page.getByRole('button', { name: copy.continue, exact: true }).click()

  await expect(page).toHaveURL(cyaUrl)
  const summary = page.getByRole('alert')
  await expect(
    summary.getByRole('heading', { name: sharedCopy.errorSummary.title })
  ).toBeVisible()
  await expect(
    summary.getByRole('link', {
      name: copy.errors.cards.identificationNumbers,
      exact: true
    })
  ).toBeVisible()
  await expect(strip(page).locator(TAG)).toHaveText(
    sharedCopy.journeyStrip.amend
  )
})

test('The commodities list ends with Save and return and Save and continue while amending', async ({
  page
}) => {
  const reference = journeyIdFromPage(page)
  const listUrl = `${BASE}/notifications/${reference}/commodities`
  const saveAndReturn = page.getByRole('button', {
    name: sharedCopy.saveActions.saveAndReturn,
    exact: true
  })
  await page.goto(listUrl)
  await expect(saveAndReturn).toBeVisible()
  await expect(save(page)).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: sharedCopy.saveActions.saveAndReturnToHub
    })
  ).toHaveCount(0)
  await expect(
    page.getByRole('link', {
      name: sharedCopy.saveActions.cancelAndReturnToHub
    })
  ).toHaveCount(0)

  await saveAndReturn.click()
  await expect(page).toHaveURL(cyaUrl)

  await page.goto(listUrl)
  await save(page).click()
  await expect(page).toHaveURL(setUrl(`/notifications/${reference}$`))
})

test('Cancel amend on the Overview opens the confirmation page', async ({
  page
}) => {
  const reference = journeyIdFromPage(page)
  await page.goto(`${BASE}/notifications/${reference}`)
  await cancelAmendLink(page).click()
  await expect(page).toHaveURL(/\/cancel-amend$/)
  await expect(
    page.getByRole('heading', { name: cancelCopy.title, level: 1 })
  ).toBeVisible()
})

test.describe('without JavaScript', () => {
  test('the strip Cancel amend reaches the confirmation and Yes restores Submitted', async ({
    page,
    browser
  }) => {
    const reference = journeyIdFromPage(page)
    const context = await browser.newContext({
      javaScriptEnabled: false,
      storageState: await page.context().storageState()
    })
    try {
      const noJs = await context.newPage()

      await noJs.goto(
        `${BASE}/notifications/${reference}/identification-numbers`
      )
      await cancelAmendLink(noJs).click()
      await expect(noJs).toHaveURL(/\/cancel-amend$/)
      await noJs.getByRole('button', { name: cancelCopy.confirmButton }).click()

      await expect(noJs).toHaveURL(/\/notification-view\?cancelled=1$/)
      await expect(strip(noJs).locator(TAG)).toHaveText(
        sharedCopy.journeyStrip.submitted
      )
    } finally {
      await context.close()
    }
  })
})

test('confirmation restores the submitted snapshot and an accessible success view', async ({
  page
}) => {
  await page.getByRole('button', { name: cancelCopy.confirmButton }).click()
  await expect(page).toHaveURL(/\/notification-view\?cancelled=1$/)
  await expect(page.getByText('Submitted', { exact: true })).toBeVisible()
  await expect(page.getByText('DiscardMe99', { exact: true })).toHaveCount(0)
  await expect(page.getByText('P123', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Change/ })).toHaveCount(0)
  await assertAccessible(page)
  await page.reload()
  await expect(page.getByText('P123', { exact: true })).toBeVisible()
})
