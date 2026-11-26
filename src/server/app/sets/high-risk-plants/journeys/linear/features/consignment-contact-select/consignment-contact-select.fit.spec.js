import {
  errorSummaryLinks,
  TECH_IMPORTS_NAME,
  REVIEW_URL_FROM_POTATO_WALK,
  COPENHAGEN,
  IMPORT_CO,
  addressRowRadio,
  backLink,
  cancelAndReturnToHub,
  describeAddressPicker,
  describeSubmittedSearchPicker,
  expectDraftReview,
  expectThreeSaveControls,
  saveAndContinue,
  startPotatoNotificationAtContact,
  saveAndReturnToHub,
  startWoodNotificationWithOriginSaved
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import {
  BASE,
  notificationPageWithTrail,
  setUrl
} from '../../../../../../../../../fit/set-base.js'
import { TRAIL_START } from '../../../../../../shared/trail.js'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as captionCopy } from '../../flow/section-captions/copy/copy.en.js'
import { copy as checkAnswersCopy } from '../check-answers/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy as pickerCopy } from '../address-book-picker/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const HUB_URL = setUrl('/notifications/[^/]+$')
const OVERVIEW_PAGE_URL = notificationPageWithTrail(
  'consignment/contact/select',
  [TRAIL_START.overview]
)
const PAGE_URL = setUrl('/notifications/[^/]+/consignment/contact/select')
const REVIEW_URL = notificationPageWithTrail('notification-view', [
  'consignment/contact/select'
])

const contactPathOf = (reference) =>
  `${BASE}/notifications/${reference}/consignment/contact/select`

const contactRow = (page) =>
  page.getByRole('listitem').filter({
    has: page.getByRole('link', {
      name: hubCopy.rows.contact.title,
      exact: true
    })
  })

const startWoodNotificationAtContact = async (page) => {
  const reference = await startWoodNotificationWithOriginSaved(page)
  await page.goto(contactPathOf(reference))
  await expect(page).toHaveURL(PAGE_URL)
  return reference
}

const openContactFromOverview = async (page, reference) => {
  await page.goto(`${BASE}/notifications/${reference}`)
  await expect(page).toHaveURL(HUB_URL)
  await page.goto(contactPathOf(reference))
  await expect(page).toHaveURL(PAGE_URL)
}

const startAtContact = async (page) => {
  const reference = await startWoodNotificationAtContact(page)
  await openContactFromOverview(page, reference)
  return reference
}

const startCompleteNotificationAtContact = async (page) => {
  const reference = await startPotatoNotificationAtContact(page)
  await openContactFromOverview(page, reference)
  return reference
}

describeSubmittedSearchPicker({
  pickerName: 'consignment contact',
  openPicker: startAtContact,
  roleAddress: TECH_IMPORTS_NAME,
  denmarkMatch: COPENHAGEN
})

describeAddressPicker({
  pickerName: 'consignment contact',
  openPicker: startCompleteNotificationAtContact,
  pathOf: contactPathOf,
  notInBookError: copy.errors.contactAddress,
  hubRowTitle: hubCopy.rows.contact.title,
  hubUrl: HUB_URL,
  pageUrl: PAGE_URL,
  afterSaveUrl: REVIEW_URL,
  firstRowRadio: '#contactAddress',
  roleAddress: TECH_IMPORTS_NAME,
  secondRoleAddress: IMPORT_CO,
  rolelessAddress: 'Unlisted Traders Ltd',
  denmarkMatch: COPENHAGEN,
  wholeCount: 18,
  landingAlerts: [
    `${sharedCopy.errorSummary.title} ${checkAnswersCopy.errors.cards.contact}`
  ],
  saveAndReturnToHubLabel: copy.saveActions.saveAndReturnToHub,
  cancelAndReturnToHubLabel: copy.saveActions.cancelAndReturnToHub
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
      page.getByText(captionCopy.sections.addresses, { exact: true })
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

    await expect(page).toHaveURL(OVERVIEW_PAGE_URL)
  })

  test('offers Save and continue, Save and return to hub and Cancel and return to hub in that order', async ({
    page
  }) => {
    await startAtContact(page)

    await expectThreeSaveControls(page, {
      saveAndReturnToHubLabel: copy.saveActions.saveAndReturnToHub,
      cancelAndReturnToHubLabel: copy.saveActions.cancelAndReturnToHub
    })
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

    await addressRowRadio(page, TECH_IMPORTS_NAME).check()
    await saveAndReturnToHub(page, copy.saveActions.saveAndReturnToHub).click()

    await expect(page).toHaveURL(HUB_URL)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.completed)
  })

  test('a row ticked saves, and re-entering shows it checked', async ({
    page
  }) => {
    const reference = await startAtContact(page)
    await expect(addressRowRadio(page, COPENHAGEN)).toBeVisible()

    await addressRowRadio(page, COPENHAGEN).check()
    await saveAndReturnToHub(page, copy.saveActions.saveAndReturnToHub).click()

    await expect(page).toHaveURL(HUB_URL)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.completed)

    await page.goto(contactPathOf(reference))
    await expect(addressRowRadio(page, COPENHAGEN)).toBeChecked()
  })

  test('Cancel and return to hub leaves the contact row not yet started', async ({
    page
  }) => {
    await startAtContact(page)

    await addressRowRadio(page, TECH_IMPORTS_NAME).check()
    await cancelAndReturnToHub(
      page,
      copy.saveActions.cancelAndReturnToHub
    ).click()

    await expect(page).toHaveURL(HUB_URL)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.notYetStarted)
  })
})

test.describe('consignment-contact-select — the end of Save and continue', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('at the last question, Save and continue goes to check your answers even though the notification is incomplete', async ({
    page
  }) => {
    await startWoodNotificationAtContact(page)

    await addressRowRadio(page, TECH_IMPORTS_NAME).check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(REVIEW_URL)
    await expectDraftReview(page)
    await expect(
      errorSummaryLinks(page, checkAnswersCopy.errors.cards.arrivalDetails)
    ).toBeVisible()
  })
})

test.describe('consignment-contact-select — a blank save', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  const expectTaskNotYetStarted = async (page, reference) => {
    await page.goto(`${BASE}/notifications/${reference}`)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.notYetStarted)

    await page.goto(contactPathOf(reference))
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
  }

  test('blank contact Save and continue opens the review page and leaves the task not yet started', async ({
    page
  }) => {
    const reference = await startAtContact(page)

    await saveAndContinue(page).click()

    await expect(page).toHaveURL(REVIEW_URL)
    await expectTaskNotYetStarted(page, reference)
  })

  test('blank contact Save and return to hub opens Overview and leaves the task not yet started', async ({
    page
  }) => {
    const reference = await startAtContact(page)

    await saveAndReturnToHub(page, copy.saveActions.saveAndReturnToHub).click()

    await expect(page).toHaveURL(HUB_URL)
    await expectTaskNotYetStarted(page, reference)
  })
})

test('a potatoes notification is asked for the consignment contact after Save and continue, and cannot go on from the review while its Overview task is not started', async ({
  page
}) => {
  await signIn(page)
  const reference = await startPotatoNotificationAtContact(page)

  await saveAndContinue(page).click()
  await expect(page).toHaveURL(REVIEW_URL_FROM_POTATO_WALK)
  await page
    .getByRole('button', { name: checkAnswersCopy.continue, exact: true })
    .click()

  await expect(page).toHaveURL(REVIEW_URL_FROM_POTATO_WALK)
  await expect(
    errorSummaryLinks(page, checkAnswersCopy.errors.cards.contact, {
      exact: true
    })
  ).toBeVisible()
  await page.goto(`${BASE}/notifications/${reference}`)
  await expect(contactRow(page).locator('.govuk-task-list__status')).toHaveText(
    hubCopy.statuses.notYetStarted
  )
})
