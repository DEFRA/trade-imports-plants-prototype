import { BASE } from '../../../../../../../../../fit/set-base.js'
import {
  completePotatoNotification,
  expectNoSeriousOrCriticalViolations,
  openDeclaration
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import { copy as confirmationCopy } from '../confirmation/copy/copy.en.js'
import { expect, test } from '@playwright/test'
import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy } from '../check-answers/copy/copy.en.js'
import { copy as declarationCopy } from './copy/copy.en.js'

test.beforeEach(async ({ page }) => signIn(page))

test('renders the plants declaration and Back navigation with no serious accessibility violations', async ({
  page
}) => {
  const reference = await openDeclaration(page)
  await expect(
    page.getByRole('heading', { name: declarationCopy.title, level: 1 })
  ).toBeVisible()
  for (const statement of declarationCopy.body) {
    await expect(page.getByText(statement, { exact: true })).toBeVisible()
  }
  await expect(
    page.getByRole('checkbox', { name: declarationCopy.declarationLabel })
  ).not.toBeChecked()
  await expect(
    page.getByText(declarationCopy.dateOfDeclaration, { exact: false })
  ).toBeVisible()
  await expectNoSeriousOrCriticalViolations(page, 'Declaration')
  await page
    .getByRole('link', { name: sharedCopy.layout.back, exact: true })
    .click()
  await expect(page).toHaveURL(
    new RegExp(`${BASE}/notifications/${reference}/notification-view$`)
  )
})

test('shows the confirmation as a small checkbox in a group whose legend only screen readers get', async ({
  page
}) => {
  await openDeclaration(page)
  const group = page.getByRole('group', {
    name: declarationCopy.declarationLegend
  })

  await expect(group.locator('legend')).toHaveClass(/govuk-visually-hidden/)
  await expect(group.locator('.govuk-checkboxes')).toHaveClass(
    /govuk-checkboxes--small/
  )
  await expect(
    group.getByRole('checkbox', { name: declarationCopy.declarationLabel })
  ).toBeVisible()
})

test('shows the date of declaration in bold', async ({ page }) => {
  await openDeclaration(page)
  const date = page
    .locator('p.govuk-body', { hasText: declarationCopy.dateOfDeclaration })
    .locator('strong')

  await expect(date).toHaveText(/^\d{1,2} [A-Z][a-z]+ \d{4}$/)
  await expect(date).toHaveCSS('font-weight', '700')
})

test('starts the page with the heading', async ({ page }) => {
  await openDeclaration(page)

  await expect(
    page.locator('main .govuk-grid-column-two-thirds > :first-child')
  ).toHaveText(declarationCopy.title)
})

test('carries the journey concurrency token in a hidden field of the form', async ({
  page
}) => {
  await openDeclaration(page)

  await expect(page.locator('input[name="concurrencyToken"]')).toHaveAttribute(
    'value',
    /.+/
  )
})

test('requires confirmation, focuses the checkbox from the summary and has an accessible error state', async ({
  page
}) => {
  await openDeclaration(page)
  await page
    .getByRole('button', { name: declarationCopy.continueButton, exact: true })
    .click()
  const link = page
    .getByRole('alert')
    .getByRole('link', { name: declarationCopy.errors.declarationRequired })
  await expect(link).toBeVisible()
  await link.click()
  await expect(
    page.getByRole('checkbox', { name: declarationCopy.declarationLabel })
  ).toBeFocused()
  await expectNoSeriousOrCriticalViolations(page, 'Declaration with an error')
})

test('accepts a late notification and shows the stored late banner on the read-only view', async ({
  page
}) => {
  const reference = await completePotatoNotification(page, { late: true })
  await expect(
    page.getByText(copy.late.warning(copy.late.potatoes(2)))
  ).toBeVisible()
  await page.getByRole('button', { name: copy.continue, exact: true }).click()
  await expect(page).toHaveURL(/\/declaration$/)
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
  await page.goto(`${BASE}/notifications/${reference}/notification-view`)
  await expect(
    page.getByRole('heading', { name: copy.late.heading })
  ).toBeVisible()
  await expect(
    page.getByText(copy.late.accepted, { exact: false })
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: copy.continue, exact: true })
  ).toHaveCount(0)
  await expect(page.getByRole('link', { name: /^Change/ })).toHaveCount(0)
  await expectNoSeriousOrCriticalViolations(
    page,
    'Submitted notification with a late banner'
  )
  await page.reload()
  await expect(
    page.getByRole('heading', { name: copy.late.heading })
  ).toBeVisible()
  await page.goto(`${BASE}/notifications/${reference}/declaration`)
  await expect(page).toHaveURL(
    new RegExp(`${BASE}/notifications/${reference}/confirmation$`)
  )
})

test('submits an on-time notification without a late banner', async ({
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
  await page.goto(`${BASE}/notifications/${reference}/notification-view`)
  await expect(
    page.getByRole('heading', { name: copy.title, level: 1 })
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: copy.late.heading })
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: copy.continue, exact: true })
  ).toHaveCount(0)
})
