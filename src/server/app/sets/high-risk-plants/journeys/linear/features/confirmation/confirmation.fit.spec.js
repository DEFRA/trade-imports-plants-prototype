import { BASE } from '../../../../../../../../../fit/set-base.js'
import {
  completePotatoNotification,
  expectNoSeriousOrCriticalViolations,
  openDeclaration
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import { expect, test } from '@playwright/test'
import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy } from '../check-answers/copy/copy.en.js'
import { copy as declarationCopy } from '../declaration/copy/copy.en.js'
import { copy as confirmationCopy } from './copy/copy.en.js'

test.beforeEach(async ({ page }) => signIn(page))

test('shows an accessible submitted receipt, survives reload and links to the notification and dashboard', async ({
  page
}) => {
  const reference = await openDeclaration(page)
  await page
    .getByRole('checkbox', { name: declarationCopy.declarationLabel })
    .check()
  await page
    .getByRole('button', { name: declarationCopy.continueButton, exact: true })
    .click()
  await expect(page).toHaveURL(
    new RegExp(`${BASE}/notifications/${reference}/confirmation$`)
  )
  await expect(
    page.getByRole('heading', { name: confirmationCopy.title, level: 1 })
  ).toBeVisible()
  await expect(
    page.getByText(confirmationCopy.reference, { exact: false })
  ).toContainText(reference)
  await expect(
    page.getByText(confirmationCopy.body, { exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: sharedCopy.layout.back, exact: true })
  ).toHaveCount(0)
  await expectNoSeriousOrCriticalViolations(page, 'Confirmation')
  await page.reload()
  await expect(
    page.getByRole('heading', { name: confirmationCopy.title, level: 1 })
  ).toBeVisible()
  await page
    .getByRole('link', { name: confirmationCopy.viewNotification, exact: true })
    .click()
  await expect(page).toHaveURL(
    new RegExp(`${BASE}/notifications/${reference}/notification-view$`)
  )
  await expect(page.getByRole('link', { name: /^Change/ })).toHaveCount(0)
  await page.goto(`${BASE}/notifications/${reference}/confirmation`)
  await page
    .getByRole('link', {
      name: confirmationCopy.returnToDashboard,
      exact: true
    })
    .click()
  await expect(page).toHaveURL(BASE)
  await expect(
    page.getByRole('button', { name: dashboardCopy.startButton })
  ).toBeVisible()
})

test('returns a draft to check answers instead of showing a receipt', async ({
  page
}) => {
  const reference = await completePotatoNotification(page)
  await page.goto(`${BASE}/notifications/${reference}/confirmation`)
  await expect(page).toHaveURL(
    new RegExp(`${BASE}/notifications/${reference}/notification-view$`)
  )
  await expect(
    page.getByRole('heading', { name: copy.title, level: 1 })
  ).toBeVisible()
})
