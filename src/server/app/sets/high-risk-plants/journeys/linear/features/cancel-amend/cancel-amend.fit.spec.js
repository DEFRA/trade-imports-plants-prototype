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
  await page.goto('/')
  await page
    .getByRole('button', {
      name: `Amend notification ${reference}`,
      exact: true
    })
    .click()
  await page.goto(`/notifications/${reference}/identification-numbers`)
  await page
    .getByLabel(idsCopy.fields.producerIdentificationNumber.label, {
      exact: true
    })
    .fill('DiscardMe99')
  await save(page).click()
  await page.goto('/')
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
  ).toHaveAttribute('href', cyaUrl)
  await expect(
    page.getByRole('link', { name: sharedCopy.layout.back, exact: true })
  ).toHaveAttribute('href', cyaUrl)
  await expect(page.locator('.govuk-caption-l')).toHaveCount(0)
  await assertAccessible(page)
})

test('No preserves the amendment and its changes after reload', async ({
  page
}) => {
  await page.getByRole('button', { name: cancelCopy.noLink }).click()
  await expect(page).toHaveURL(cyaUrl)
  await page.reload()
  await expect(page.getByText('Amending', { exact: true })).toBeVisible()
  await expect(page.getByText('DiscardMe99', { exact: true })).toBeVisible()
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
