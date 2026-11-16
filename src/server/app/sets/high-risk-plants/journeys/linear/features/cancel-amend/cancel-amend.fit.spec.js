import {
  BASE,
  journeyIdFromPage,
  pageUrlWithTrail,
  setPath,
  setUrl
} from '../../../../../../../../../fit/set-base.js'
import {
  errorSummary,
  changeCommodityType,
  completePotatoNotification,
  REVIEW_URL_WITHOUT_TRAIL,
  expectNoSeriousOrCriticalViolations,
  saveAndContinue
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import { expect, test } from '@playwright/test'
import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
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
const CANCEL_AMEND_URL = /\/cancel-amend$/
const cyaHref = setPath('/notifications/[^/]+/notification-view$')

test.beforeEach(async ({ page }) => {
  await signIn(page)
  const reference = await completePotatoNotification(page)
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
  await saveAndContinue(page).click()
  await page.goto(BASE)
  await page
    .getByRole('link', {
      name: `${dashboardCopy.actions.cancelAmend} (${reference})`,
      exact: true
    })
    .click()
  await expect(page).toHaveURL(CANCEL_AMEND_URL)
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
  const beforeTitle = page
    .getByRole('heading', { name: cancelCopy.title, level: 1 })
    .locator('xpath=preceding-sibling::*')
  await expect(beforeTitle).toHaveCount(1)
  await expect(beforeTitle).toContainText(sharedCopy.journeyStrip.amend)
  await expectNoSeriousOrCriticalViolations(page, 'Cancel amendment page')
})

test('No preserves the amendment and its changes after reload', async ({
  page
}) => {
  await page.getByRole('button', { name: cancelCopy.noLink }).click()
  await expect(page).toHaveURL(REVIEW_URL_WITHOUT_TRAIL)
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

  await expect(page).toHaveURL(CANCEL_AMEND_URL)
  await expect(
    page.getByRole('heading', { name: cancelCopy.title, level: 1 })
  ).toBeVisible()
  await expect(cancelAmendLink(page)).toHaveCount(0)

  await page.getByRole('button', { name: cancelCopy.noLink }).click()
  await expect(page).toHaveURL(REVIEW_URL_WITHOUT_TRAIL)
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
  await changeCommodityType(page, reference, 'wood-and-cut-trees')
  await page.goto(`${BASE}/notifications/${reference}/notification-view`)
  await expect(errorSummary(page)).toHaveCount(0)

  await page.getByRole('button', { name: copy.continue, exact: true }).click()

  await expect(page).toHaveURL(REVIEW_URL_WITHOUT_TRAIL)
  const summary = errorSummary(page)
  await expect(
    summary.getByRole('heading', { name: sharedCopy.errorSummary.title })
  ).toBeVisible()
  await expect(
    summary.getByRole('link', {
      name: copy.errors.cards.commodities,
      exact: true
    })
  ).toBeVisible()
  await expect(strip(page).locator(TAG)).toHaveText(
    sharedCopy.journeyStrip.amend
  )
})

test('The commodities list ends as it does on a draft while amending, and Save and continue opens origin', async ({
  page
}) => {
  const reference = journeyIdFromPage(page)
  const listUrl = `${BASE}/notifications/${reference}/commodities`
  await page.goto(listUrl)
  await expect(saveAndContinue(page)).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: sharedCopy.saveActions.saveAndReturnToHub
    })
  ).toHaveCount(0)

  await saveAndContinue(page).click()
  await expect(page).toHaveURL(
    pageUrlWithTrail(`/notifications/${reference}/origin`, ['commodities'])
  )
})

test('Cancel and return to overview while amending opens Overview without saving, and the strip keeps Amend and Cancel amend', async ({
  page
}) => {
  const reference = journeyIdFromPage(page)
  await page.goto(`${BASE}/notifications/${reference}/identification-numbers`)
  await page
    .getByLabel(idsCopy.fields.producerIdentificationNumber.label, {
      exact: true
    })
    .fill('NotSaved1')
  await page
    .getByRole('link', { name: sharedCopy.saveActions.cancelAndReturnToHub })
    .click()

  await expect(page).toHaveURL(setUrl(`/notifications/${reference}$`))
  await expect(strip(page).locator(TAG)).toHaveText(
    sharedCopy.journeyStrip.amend
  )
  await expect(cancelAmendLink(page)).toBeVisible()
  await page.goto(`${BASE}/notifications/${reference}/identification-numbers`)
  await expect(
    page.getByLabel(idsCopy.fields.producerIdentificationNumber.label, {
      exact: true
    })
  ).not.toHaveValue('NotSaved1')
})

test('Cancel amend on the Overview opens the confirmation page', async ({
  page
}) => {
  const reference = journeyIdFromPage(page)
  await page.goto(`${BASE}/notifications/${reference}`)
  await cancelAmendLink(page).click()
  await expect(page).toHaveURL(CANCEL_AMEND_URL)
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
      await expect(noJs).toHaveURL(CANCEL_AMEND_URL)
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

test('Back from the restored submitted view opens the notification list', async ({
  page
}) => {
  await page.getByRole('button', { name: cancelCopy.confirmButton }).click()
  await expect(page).toHaveURL(/\/notification-view\?cancelled=1$/)

  await page
    .getByRole('link', { name: sharedCopy.layout.back, exact: true })
    .click()

  await expect(page).toHaveURL(BASE)
  await expect(
    page.getByRole('heading', { name: dashboardCopy.notificationsHeading })
  ).toBeVisible()
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
  await expectNoSeriousOrCriticalViolations(
    page,
    'Submitted notification after a cancelled amendment'
  )
  await page.reload()
  await expect(page.getByText('P123', { exact: true })).toBeVisible()
})
