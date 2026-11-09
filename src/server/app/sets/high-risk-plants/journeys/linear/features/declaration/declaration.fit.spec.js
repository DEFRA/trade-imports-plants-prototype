import { BASE } from '../../../../../../../../../fit/set-base.js'
import {
  completePotatoNotification,
  expectNoSeriousOrCriticalViolations,
  openDeclaration,
  submitDeclarationFromCheckAnswers
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import { copy as confirmationCopy } from '../confirmation/copy/copy.en.js'
import { expect, test } from '@playwright/test'
import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as checkAnswersCopy } from '../check-answers/copy/copy.en.js'
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

test('puts the confirmation checkbox in a group named by the declaration legend', async ({
  page
}) => {
  await openDeclaration(page)
  const group = page.getByRole('group', {
    name: declarationCopy.declarationLegend
  })

  await expect(
    group.getByRole('checkbox', { name: declarationCopy.declarationLabel })
  ).toBeVisible()
})

test('shows the date of declaration as the strong text of its line', async ({
  page
}) => {
  await openDeclaration(page)
  const date = page
    .getByRole('paragraph')
    .filter({ hasText: declarationCopy.dateOfDeclaration })
    .getByRole('strong')

  await expect(date).toHaveText(/^\d{1,2} [A-Z][a-z]+ \d{4}$/)
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
    page.getByText(
      checkAnswersCopy.late.warning(checkAnswersCopy.late.potatoes(2))
    )
  ).toBeVisible()
  await submitDeclarationFromCheckAnswers(page, reference)
  await expect(
    page.getByRole('heading', { name: confirmationCopy.title, level: 1 })
  ).toBeVisible()
  await page.goto(`${BASE}/notifications/${reference}/notification-view`)
  await expect(
    page.getByRole('heading', { name: checkAnswersCopy.late.heading })
  ).toBeVisible()
  await expect(
    page.getByText(checkAnswersCopy.late.accepted, { exact: false })
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: checkAnswersCopy.continue, exact: true })
  ).toHaveCount(0)
  await expect(page.getByRole('link', { name: /^Change/ })).toHaveCount(0)
  await expectNoSeriousOrCriticalViolations(
    page,
    'Submitted notification with a late banner'
  )
  await page.reload()
  await expect(
    page.getByRole('heading', { name: checkAnswersCopy.late.heading })
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
    page.getByRole('heading', { name: checkAnswersCopy.title, level: 1 })
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: checkAnswersCopy.late.heading })
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: checkAnswersCopy.continue, exact: true })
  ).toHaveCount(0)
})
