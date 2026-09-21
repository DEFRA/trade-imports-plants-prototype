import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as commodityCopy } from '../commodities/copy/copy.en.js'
import { copy as arrivalCopy } from '../arrival-details/copy/copy.en.js'
import { copy as idsCopy } from '../identification-numbers/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

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

const completeNotification = async (page) => {
  const reference = await startNotification(page)
  const date = new Date()
  date.setDate(date.getDate() + 7)
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

test('renders saved answers, scoped cards and accessible Change links that return to review', async ({
  page
}) => {
  const reference = await completeNotification(page)
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
  await expect(page.getByText(VARIETY, { exact: true })).toBeVisible()
  await expect(
    page.getByText('tech-imports-ltd@example.com', { exact: true })
  ).toHaveCount(2)
  await assertAccessible(page)
  await page
    .getByRole('link', {
      name: 'Change country of origin (Import details)',
      exact: true
    })
    .click()
  await expect(page).toHaveURL(/\/origin\?change=1$/)
  await save(page).click()
  await expect(page).toHaveURL(cyaUrl)
  await page
    .getByRole('link', {
      name: 'Change Commodity 1 (Commodity 1)',
      exact: true
    })
    .click()
  await expect(page).toHaveURL(/\/commodities\/details\?index=0&change=1$/)
  await page.getByLabel(copy.labels.quantity, { exact: true }).fill('300')
  await save(page).click()
  await expect(page).toHaveURL(/\/commodities\?change=1$/)
  await save(page).click()
  await expect(page).toHaveURL(cyaUrl)
  await page.reload()
  await expect(page.getByText('300', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: copy.continue, exact: true }).click()
  await expect(page).toHaveURL(
    new RegExp(`/notifications/${reference}/declaration$`)
  )
})

test('offers Back, Save and return, and Cancel to Overview', async ({
  page
}) => {
  const reference = await completeNotification(page)
  const hub = `/notifications/${reference}`
  await expect(
    page.getByRole('link', { name: sharedCopy.layout.back, exact: true })
  ).toHaveAttribute('href', hub)
  await expect(
    page.getByRole('link', {
      name: sharedCopy.saveActions.cancelAndReturnToHub,
      exact: true
    })
  ).toHaveAttribute('href', hub)
  await page
    .getByRole('button', {
      name: sharedCopy.saveActions.saveAndReturnToHub,
      exact: true
    })
    .click()
  await expect(page).toHaveURL(new RegExp(`${hub}$`))
})

test('rechecks a saved origin after a commodity change and exposes an accessible correction link', async ({
  page
}) => {
  const reference = await completeNotification(page)
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
  await save(page).click()
  await expect(page).toHaveURL(/\/commodities\/details\?index=0&change=1$/)
  await page
    .getByLabel(copy.labels.potatoVariety, { exact: true })
    .fill(VARIETY)
  await page.getByLabel(copy.labels.quantity, { exact: true }).fill('250')
  await page
    .getByLabel(copy.labels.potatoIntendedUse, { exact: true })
    .fill('Planting')
  await save(page).click()
  await expect(page).toHaveURL(/\/commodities\?change=1$/)
  await save(page).click()
  await expect(page).toHaveURL(cyaUrl)
  await page.getByRole('button', { name: copy.continue, exact: true }).click()
  await expect(page).toHaveURL(cyaUrl)
  const error = page.getByRole('link', { name: /Poland/ })
  await expect(error).toHaveAttribute(
    'href',
    `/notifications/${reference}/origin?change=1`
  )
  await assertAccessible(page)
  await error.click()
  await expect(page).toHaveURL(/\/origin\?change=1$/)
})
