import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const HUB_URL = /\/notifications\/[^/]+$/
const JOURNEY_ID_SEGMENT = 2

const journeyIdFromPage = (page) =>
  new URL(page.url()).pathname.split('/')[JOURNEY_ID_SEGMENT]

// The dashboard renders its notification actions inside a GOV.UK summary card,
// which appends the card title — the reference — to each action's accessible name.
const cardLink = (page, action, reference) =>
  page.getByRole('link', { name: `${action} (${reference})` })

const startNotification = async (page) => {
  await page.goto('/')
  await page.getByRole('button', { name: dashboardCopy.startButton }).click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/commodity-type$/)
  const reference = journeyIdFromPage(page)
  await page.goto(`/notifications/${reference}`)
  await expect(page).toHaveURL(HUB_URL)
  return reference
}

const openDeleteConfirmation = async (page) => {
  const reference = await startNotification(page)
  await page.goto('/')
  await cardLink(
    page,
    sharedCopy.notificationActions.delete.text,
    reference
  ).click()
  await expect(
    page.getByRole('heading', { name: copy.title, level: 1 })
  ).toBeVisible()
  return reference
}

const expectNoSeriousOrCriticalViolations = async (page, subject) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const seriousOrCritical = results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )

  expect(
    seriousOrCritical,
    `${subject} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

test.describe('delete-notification feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders confirmation copy, actions and dashboard links', async ({
    page
  }) => {
    await openDeleteConfirmation(page)

    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()
    await expect(page.getByText(copy.body)).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.confirmButton })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.noLink })
    ).toHaveAttribute('href', '/')
    await expect(
      page.getByRole('link', { name: sharedCopy.layout.back, exact: true })
    ).toHaveAttribute('href', '/')
  })

  test('No returns to the dashboard and keeps the notification', async ({
    page
  }) => {
    const reference = await openDeleteConfirmation(page)

    await page.getByRole('button', { name: copy.noLink }).click()

    await expect(page).toHaveURL('/')
    await expect(
      page.getByRole('heading', { name: reference, exact: true })
    ).toBeVisible()
  })

  test('confirmation removes the notification and shows the success banner', async ({
    page
  }) => {
    const reference = await openDeleteConfirmation(page)

    await page.getByRole('button', { name: copy.confirmButton }).click()

    await expect(page).toHaveURL('/?deleted=1')
    await expect(
      page.getByText(sharedCopy.notificationActions.delete.successTitle)
    ).toBeVisible()
    await expect(
      page.getByText(sharedCopy.notificationActions.delete.successBody)
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: reference, exact: true })
    ).toHaveCount(0)
  })

  test('has no serious or critical axe violations on the confirmation page or after confirming', async ({
    page
  }) => {
    await openDeleteConfirmation(page)

    await expectNoSeriousOrCriticalViolations(
      page,
      'Delete notification confirmation'
    )

    await page.getByRole('button', { name: copy.confirmButton }).click()
    await expect(page).toHaveURL('/?deleted=1')

    await expectNoSeriousOrCriticalViolations(
      page,
      'Dashboard after confirming a deletion'
    )
  })
})
