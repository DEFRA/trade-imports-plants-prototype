import { copy as confirmationCopy } from '../confirmation/copy/copy.en.js'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as commodityCopy } from '../commodities/copy/copy.en.js'
import { copy as arrivalCopy } from '../arrival-details/copy/copy.en.js'
import { copy as idsCopy } from '../identification-numbers/copy/copy.en.js'
import { copy } from '../check-answers/copy/copy.en.js'
import { copy as declarationCopy } from './copy/copy.en.js'

const save = (page) =>
  page.getByRole('button', {
    name: sharedCopy.saveActions.saveAndContinue,
    exact: true
  })
const cyaUrl = /\/notification-view$/
const VARIETY = 'Maris Piper'
const contactName = 'Tech Imports Ltd'

const startNotification = async (page) => {
  await page.goto('/')
  await page.getByRole('button', { name: dashboardCopy.startButton }).click()
  await expect(page).toHaveURL(/\/commodity-type$/)
  const reference = new URL(page.url()).pathname.split('/')[2]
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
    .getByRole('option', { name: 'Port of Dover (GB DVR)', exact: true })
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
  // The opening run stops at the hub once every prerequisite section is
  // answered but the review gate itself needs a manual visit.
  await expect(page).toHaveURL(new RegExp(`/notifications/${reference}$`))
  await page
    .getByRole('link', { name: 'Check and submit', exact: true })
    .click()
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

test.beforeEach(async ({ page }) => signIn(page))

const openDeclaration = async (page, late = false) => {
  const reference = await completeNotification(page, late)
  await page.getByRole('button', { name: copy.continue, exact: true }).click()
  await expect(page).toHaveURL(
    new RegExp(`/notifications/${reference}/declaration$`)
  )
  return reference
}

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
  await assertAccessible(page)
  await page
    .getByRole('link', { name: sharedCopy.layout.back, exact: true })
    .click()
  await expect(page).toHaveURL(
    new RegExp(`/notifications/${reference}/notification-view$`)
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
  await assertAccessible(page)
})

test('accepts a late notification and shows the stored late banner on the read-only view', async ({
  page
}) => {
  const reference = await completeNotification(page, true)
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
    new RegExp(`/notifications/${reference}/confirmation$`)
  )
  await expect(
    page.getByRole('heading', { name: confirmationCopy.title, level: 1 })
  ).toBeVisible()
  await page.goto(`/notifications/${reference}/notification-view`)
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
  await assertAccessible(page)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: copy.late.heading })
  ).toBeVisible()
  await page.goto(`/notifications/${reference}/declaration`)
  await expect(page).toHaveURL(
    new RegExp(`/notifications/${reference}/confirmation$`)
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
    new RegExp(`/notifications/${reference}/confirmation$`)
  )
  await expect(
    page.getByRole('heading', { name: confirmationCopy.title, level: 1 })
  ).toBeVisible()
  await page.goto(`/notifications/${reference}/notification-view`)
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
