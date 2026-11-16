import {
  BASE,
  notificationPageWithTrail
} from '../../../../../../../../../fit/set-base.js'
import {
  POTATO_CHANGE_LINK_TRAIL,
  POTATO_VARIETY,
  REVIEW_URL_WITHOUT_TRAIL,
  completePotatoNotification,
  expectNoSeriousOrCriticalViolations,
  saveAndReturnToHub,
  continueFromChangedCommodityLine,
  saveAndContinue
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import { expect, test } from '@playwright/test'
import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const NOTIFICATION_VIEW = 'notification-view'

test.beforeEach(async ({ page }) => signIn(page))

test('renders saved answers, scoped cards and accessible Change links that open their page on the review trail and go on with Save and continue', async ({
  page
}) => {
  const reference = await completePotatoNotification(page)
  await expect(
    page.getByRole('heading', { name: copy.title, level: 1 })
  ).toBeVisible()
  for (const heading of Object.values(copy.sections)) {
    await expect(
      page.getByRole('heading', { name: heading, level: 2 })
    ).toBeVisible()
  }
  await expect(
    page.getByRole('heading', { name: copy.cards.consignor, exact: true })
  ).toHaveCount(0)
  await expect(page.getByText(POTATO_VARIETY, { exact: true })).toBeVisible()
  await expect(
    page.getByText('tech-imports-ltd@example.com', { exact: true })
  ).toHaveCount(2)
  await expectNoSeriousOrCriticalViolations(page, 'Check answers')
  await page
    .getByRole('link', {
      name: 'Change country of origin (Import details)',
      exact: true
    })
    .click()
  await expect(page).toHaveURL(
    notificationPageWithTrail('origin', POTATO_CHANGE_LINK_TRAIL)
  )
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(
    notificationPageWithTrail('arrival-details', [
      ...POTATO_CHANGE_LINK_TRAIL,
      'origin'
    ])
  )
  await page.goto(`${BASE}/notifications/${reference}/notification-view`)
  await expect(page).toHaveURL(REVIEW_URL_WITHOUT_TRAIL)
  await page
    .getByRole('link', {
      name: 'Change Commodity 1 (Commodity 1)',
      exact: true
    })
    .click()
  await expect(page).toHaveURL(
    notificationPageWithTrail('commodities/details\\?index=0', [
      NOTIFICATION_VIEW
    ])
  )
  await page.getByLabel(copy.labels.quantity, { exact: true }).fill('300')
  await continueFromChangedCommodityLine(page, [NOTIFICATION_VIEW])
  await page.goto(`${BASE}/notifications/${reference}/notification-view`)
  await expect(page).toHaveURL(REVIEW_URL_WITHOUT_TRAIL)
  await page.reload()
  await expect(page.getByText('300', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: copy.continue, exact: true }).click()
  await expect(page).toHaveURL(
    new RegExp(`${BASE}/notifications/${reference}/declaration$`)
  )
})

test('offers Back to the contact page, Save and return, and Cancel to Overview', async ({
  page
}) => {
  const reference = await completePotatoNotification(page)
  const hub = `${BASE}/notifications/${reference}`
  await expect(
    page.getByRole('link', { name: sharedCopy.layout.back, exact: true })
  ).toHaveAttribute('href', new RegExp(`^${hub}/consignment/contact/select`))
  await expect(
    page.getByRole('link', {
      name: sharedCopy.saveActions.cancelAndReturnToHub,
      exact: true
    })
  ).toHaveAttribute('href', hub)
  await saveAndReturnToHub(page).click()
  await expect(page).toHaveURL(new RegExp(`${hub}$`))
})

test('rechecks a saved origin after a commodity change and exposes an accessible correction link', async ({
  page
}) => {
  const reference = await completePotatoNotification(page)
  await page
    .getByRole('link', {
      name: 'Change Commodity 1 (Commodity 1)',
      exact: true
    })
    .click()
  await page
    .getByRole('radio', {
      name: copy.categoryLabels['ware-potatoes'],
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(
    notificationPageWithTrail(
      'commodities/details\\?index=0',
      POTATO_CHANGE_LINK_TRAIL
    )
  )
  await page
    .getByLabel(copy.labels.potatoVariety, { exact: true })
    .fill(POTATO_VARIETY)
  await page.getByLabel(copy.labels.quantity, { exact: true }).fill('250')
  await page
    .getByLabel(copy.labels.potatoIntendedUse, { exact: true })
    .fill('Planting')
  await continueFromChangedCommodityLine(page, POTATO_CHANGE_LINK_TRAIL)
  await page.goto(`${BASE}/notifications/${reference}/notification-view`)
  await expect(page).toHaveURL(REVIEW_URL_WITHOUT_TRAIL)
  await page.getByRole('button', { name: copy.continue, exact: true }).click()
  await expect(page).toHaveURL(REVIEW_URL_WITHOUT_TRAIL)
  const error = page.getByRole('link', { name: /Poland/ })
  await expect(error).toHaveAttribute(
    'href',
    `${BASE}/notifications/${reference}/origin?from=notification-view`
  )
  await expectNoSeriousOrCriticalViolations(
    page,
    'Check answers with an origin error'
  )
  await error.click()
  await expect(page).toHaveURL(
    notificationPageWithTrail('origin', [NOTIFICATION_VIEW])
  )
})
