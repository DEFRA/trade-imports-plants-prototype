import {
  ADDRESS_BOOK_PARTY,
  CHECK_ANSWERS_URL,
  COPENHAGEN,
  SECOND_PAGE_LINK,
  addressRowRadio,
  backLink,
  describeAddressPicker,
  describeSubmittedSearchPicker,
  expectThreeSaveControls,
  saveAndContinue,
  selectedAddressInset,
  startPotatoNotificationAtContact,
  startWoodNotificationWithOriginSaved
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import { BASE } from '../../../../../../../../../fit/set-base.js'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as captionCopy } from '../../flow/section-captions/copy/copy.en.js'
import { copy as checkAnswersCopy } from '../check-answers/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy as pickerCopy } from '../address-book-picker/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const HUB_URL = /\/notifications\/[^/]+$/
const PAGE_URL = /\/notifications\/[^/]+\/consignment\/contact\/select/

const saveAndReturn = (page) =>
  page.getByRole('button', {
    name: sharedCopy.saveActions.saveAndReturnToHub
  })

const contactPathOf = (reference) =>
  `${BASE}/notifications/${reference}/consignment/contact/select`

const contactRow = (page) =>
  page.getByRole('listitem').filter({
    has: page.getByRole('link', {
      name: hubCopy.rows.contact.title,
      exact: true
    })
  })

const startInTheRunAtContact = async (page) => {
  const reference = await startWoodNotificationWithOriginSaved(page)
  await page.goto(contactPathOf(reference))
  await expect(page).toHaveURL(PAGE_URL)
  return reference
}

const startAtContact = async (page) => {
  const reference = await startInTheRunAtContact(page)
  await page.goto(`${BASE}/notifications/${reference}`)
  await expect(page).toHaveURL(HUB_URL)
  await page.goto(contactPathOf(reference))
  await expect(page).toHaveURL(PAGE_URL)
  return reference
}

describeSubmittedSearchPicker({
  pickerName: 'consignment contact',
  openPicker: startAtContact
})

describeAddressPicker({
  pickerName: 'consignment contact',
  openPicker: startAtContact,
  pathOf: contactPathOf,
  notInBookError: copy.errors.contactAddress,
  hubRowTitle: hubCopy.rows.contact.title,
  hubUrl: HUB_URL,
  pageUrl: PAGE_URL,
  afterSaveUrl: HUB_URL,
  firstRowRadio: '#contactAddress'
})

test.describe('consignment-contact-select feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders the heading, the description and the search box', async ({
    page
  }) => {
    await startAtContact(page)

    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()
    await expect(
      page.getByText(captionCopy.sections.consignmentParties, { exact: true })
    ).toHaveCount(0)
    await expect(
      page.getByText(copy.description, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByLabel(pickerCopy.search.label, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText(pickerCopy.search.hint, { exact: true })
    ).toBeVisible()
  })

  test('is reachable from the overview contact task row', async ({ page }) => {
    const reference = await startAtContact(page)
    await page.goto(`${BASE}/notifications/${reference}`)

    await page
      .getByRole('link', { name: hubCopy.rows.contact.title, exact: true })
      .click()

    await expect(page).toHaveURL(PAGE_URL)
  })

  test('offers the three save controls', async ({ page }) => {
    await startAtContact(page)

    await expectThreeSaveControls(page)
  })

  test('sends Back to the overview', async ({ page }) => {
    const reference = await startAtContact(page)

    await expect(backLink(page)).toHaveAttribute(
      'href',
      `${BASE}/notifications/${reference}`
    )
    await backLink(page).click()
    await expect(page).toHaveURL(HUB_URL)
  })
})

test.describe('consignment-contact-select — the overview task row', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('saving the chosen address marks the contact row complete', async ({
    page
  }) => {
    await startAtContact(page)

    await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(HUB_URL)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.completed)
  })

  test('a row ticked on the second page saves, and re-entering shows it as the selected address', async ({
    page
  }) => {
    const reference = await startAtContact(page)
    await page
      .getByRole('link', { name: SECOND_PAGE_LINK, exact: true })
      .click()
    await expect(addressRowRadio(page, COPENHAGEN)).toBeVisible()

    await addressRowRadio(page, COPENHAGEN).check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(HUB_URL)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.completed)

    await page.goto(contactPathOf(reference))
    await expect(selectedAddressInset(page, COPENHAGEN)).toBeVisible()
    await expect(addressRowRadio(page, COPENHAGEN)).toHaveCount(0)
  })

  test('Save and return to overview marks the contact row complete', async ({
    page
  }) => {
    await startAtContact(page)

    await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
    await saveAndReturn(page).click()

    await expect(page).toHaveURL(HUB_URL)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.completed)
  })

  test('Cancel and return to overview leaves the contact row not yet started', async ({
    page
  }) => {
    await startAtContact(page)

    await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
    await page
      .getByRole('link', {
        name: sharedCopy.saveActions.cancelAndReturnToHub
      })
      .click()

    await expect(page).toHaveURL(HUB_URL)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.notYetStarted)
  })
})

test.describe('consignment-contact-select — the end of the opening run', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('in the opening run, Continue goes to check your answers even though the notification is incomplete', async ({
    page
  }) => {
    await startInTheRunAtContact(page)

    await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(CHECK_ANSWERS_URL)
    await expect(
      page.getByRole('heading', { name: checkAnswersCopy.title, level: 1 })
    ).toBeVisible()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: checkAnswersCopy.errors.cards.arrivalDetails
      })
    ).toBeVisible()
  })
})

test.describe('consignment-contact-select — a blank save', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  for (const action of [
    sharedCopy.saveActions.saveAndContinue,
    sharedCopy.saveActions.saveAndReturnToHub
  ]) {
    test(`blank contact permits ${action} and leaves the task not yet started`, async ({
      page
    }) => {
      const reference = await startAtContact(page)

      await page.getByRole('button', { name: action, exact: true }).click()

      await expect(page).toHaveURL(HUB_URL)
      await expect(contactRow(page)).toContainText(
        hubCopy.statuses.notYetStarted
      )

      await page.goto(contactPathOf(reference))
      await expect(
        page.getByText(new RegExp(`^${pickerCopy.selectedAddressPrefix}`))
      ).toHaveCount(0)
      await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
    })
  }
})

test('a potatoes notification is asked for the consignment contact in the opening run, and cannot go on from the review while its Overview task is not started', async ({
  page
}) => {
  await signIn(page)
  const reference = await startPotatoNotificationAtContact(page)

  await saveAndContinue(page).click()
  await expect(page).toHaveURL(CHECK_ANSWERS_URL)
  await page
    .getByRole('button', { name: checkAnswersCopy.continue, exact: true })
    .click()

  await expect(page).toHaveURL(CHECK_ANSWERS_URL)
  await expect(
    page.getByRole('alert').getByRole('link', {
      name: checkAnswersCopy.errors.cards.contact,
      exact: true
    })
  ).toBeVisible()
  await page.goto(`${BASE}/notifications/${reference}`)
  await expect(contactRow(page).locator('.govuk-task-list__status')).toHaveText(
    hubCopy.statuses.notYetStarted
  )
})
