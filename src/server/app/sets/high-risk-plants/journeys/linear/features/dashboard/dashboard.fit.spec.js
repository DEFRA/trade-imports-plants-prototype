import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const CREATED_AT_ASCENDING_SORT = 'createdAt,asc'
const DEFAULT_SORT = 'arrivalDate,desc'
const UNMATCHED_REFERENCE = '26-ZZZZZZ'
const JOURNEY_ID_SEGMENT = 2

const journeyIdFromPage = (page) =>
  new URL(page.url()).pathname.split('/')[JOURNEY_ID_SEGMENT]

const startNotification = async (page) => {
  await page.goto('/')
  await page.getByRole('button', { name: copy.startButton }).click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/commodity-type$/)
  const reference = journeyIdFromPage(page)
  await page.goto('/')
  return reference
}

const linkActionFor = (page, action, reference) =>
  page.getByRole('link', { name: `${action} (${reference})` })

const buttonActionFor = (page, action, reference) =>
  page.getByRole('button', {
    name: `${action} ${copy.actionHidden(reference)}`
  })

const cardRowValue = (page, key) =>
  page
    .locator('.govuk-summary-list__row')
    .filter({ has: page.getByText(key, { exact: true }) })
    .locator('.govuk-summary-list__value')

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

test.describe('dashboard feature — initial render', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders the service heading, the intro body and the start button', async ({
    page
  }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()
    await expect(page.getByText(copy.body)).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.startButton })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.notificationsHeading })
    ).toBeVisible()
  })

  test('omits the guidance sentence while no guidance URL is supplied', async ({
    page
  }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: copy.guidanceLink })
    ).toHaveCount(0)
    // The two '#' hrefs the layout's service navigation still carries are
    // shared chrome placeholders, not this page's. Nothing the dashboard
    // renders may hold one.
    await expect(page.locator('main a[href="#"]')).toHaveCount(0)
  })

  test('renders the empty state and the default sort', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText(copy.emptyText)).toBeVisible()
    await expect(page.getByText(copy.pagination.results.none)).toBeVisible()
    await expect(page.getByLabel(copy.sort.label)).toHaveValue(DEFAULT_SORT)
  })

  test('starts a notification and lands on its first question', async ({
    page
  }) => {
    await page.goto('/')

    await page.getByRole('button', { name: copy.startButton }).click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+\/commodity-type$/)
  })
})

test.describe('dashboard feature — notification cards', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders a draft card with its rows and its available actions', async ({
    page
  }) => {
    const reference = await startNotification(page)

    await expect(
      page.getByRole('heading', { name: reference, exact: true })
    ).toBeVisible()
    for (const label of [
      copy.table.commodity,
      copy.table.origin,
      copy.table.arrival,
      copy.table.consignor,
      copy.table.status,
      copy.table.created,
      copy.table.submitted
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(page.getByText('Consignee', { exact: true })).toHaveCount(0)
    await expect(
      page.getByText(sharedCopy.journeyStrip.draft, { exact: true })
    ).toBeVisible()
    await expect(
      linkActionFor(page, copy.actions.resume, reference)
    ).toBeVisible()
    await expect(
      linkActionFor(page, sharedCopy.notificationActions.delete.text, reference)
    ).toBeVisible()
    await expect(linkActionFor(page, copy.actions.view, reference)).toHaveCount(
      0
    )
    await expect(
      buttonActionFor(page, copy.actions.amend, reference)
    ).toHaveCount(0)
    await expect(
      page.getByRole('link', {
        name: `${copy.actions.resume} ${copy.actionHidden(reference)} (${reference})`
      })
    ).toHaveCount(0)
  })

  test('renders a dated Date created row and an empty Date submitted row on a draft', async ({
    page
  }) => {
    const reference = await startNotification(page)

    await page.goto(`/?referenceNumber=${reference}`)

    await expect(
      page.getByRole('heading', { name: reference, exact: true })
    ).toBeVisible()
    await expect(cardRowValue(page, copy.table.created)).not.toHaveText('')
    await expect(cardRowValue(page, copy.table.submitted)).toHaveText('')
  })

  test('offers no Copy as new action', async ({ page }) => {
    const reference = await startNotification(page)

    await expect(
      page.getByRole('heading', { name: reference, exact: true })
    ).toBeVisible()
    await expect(
      page.getByText(sharedCopy.notificationActions.copy.text)
    ).toHaveCount(0)
  })

  test('renders the deleted banner after a delete redirect', async ({
    page
  }) => {
    await page.goto('/?deleted=1')

    await expect(
      page.getByText(sharedCopy.notificationActions.delete.successTitle)
    ).toBeVisible()
    await expect(
      page.getByText(sharedCopy.notificationActions.delete.successBody)
    ).toBeVisible()
  })
})

test.describe('dashboard feature — search and sort', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('searching a reference keeps that card and preserves the sort', async ({
    page
  }) => {
    const firstReference = await startNotification(page)
    const secondReference = await startNotification(page)

    await page
      .getByLabel(copy.sort.label)
      .selectOption(CREATED_AT_ASCENDING_SORT)
    await page.getByRole('button', { name: copy.sort.update }).click()
    await page.getByLabel(copy.search.label).fill(firstReference)
    await page.getByRole('button', { name: copy.search.button }).click()

    await expect(page).toHaveURL(
      `/?sort=createdAt%2Casc&referenceNumber=${firstReference}`
    )
    await expect(page.getByLabel(copy.sort.label)).toHaveValue(
      CREATED_AT_ASCENDING_SORT
    )
    await expect(page.getByLabel(copy.search.label)).toHaveValue(firstReference)
    await expect(
      page.getByRole('heading', { name: firstReference, exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: secondReference, exact: true })
    ).toHaveCount(0)
  })

  test('orders the cards by the chosen sort', async ({ page }) => {
    const firstReference = await startNotification(page)
    const secondReference = await startNotification(page)
    const cardTitles = () =>
      page.locator('.govuk-summary-card__title').allTextContents()

    await page
      .getByLabel(copy.sort.label)
      .selectOption(CREATED_AT_ASCENDING_SORT)
    await page.getByRole('button', { name: copy.sort.update }).click()
    await expect(
      page.getByRole('heading', { name: firstReference, exact: true })
    ).toBeVisible()
    expect((await cardTitles()).map((title) => title.trim())).toEqual([
      firstReference,
      secondReference
    ])

    await page.getByLabel(copy.sort.label).selectOption('createdAt,desc')
    await page.getByRole('button', { name: copy.sort.update }).click()
    await expect(
      page.getByRole('heading', { name: secondReference, exact: true })
    ).toBeVisible()
    expect((await cardTitles()).map((title) => title.trim())).toEqual([
      secondReference,
      firstReference
    ])
  })

  test('a search that matches nothing keeps the term and says so', async ({
    page
  }) => {
    const reference = await startNotification(page)

    await page.getByLabel(copy.search.label).fill(UNMATCHED_REFERENCE)
    await page.getByRole('button', { name: copy.search.button }).click()

    await expect(page.getByLabel(copy.search.label)).toHaveValue(
      UNMATCHED_REFERENCE
    )
    await expect(page.getByText(copy.search.noResults)).toBeVisible()
    await expect(
      page.getByRole('heading', { name: reference, exact: true })
    ).toHaveCount(0)
  })

  test('changing the sort round-trips through the query string', async ({
    page
  }) => {
    await page.goto('/')

    await page
      .getByLabel(copy.sort.label)
      .selectOption(CREATED_AT_ASCENDING_SORT)
    await page.getByRole('button', { name: copy.sort.update }).click()

    await expect(page).toHaveURL('/?sort=createdAt%2Casc')
    await expect(page.getByLabel(copy.sort.label)).toHaveValue(
      CREATED_AT_ASCENDING_SORT
    )
  })
})

test.describe('dashboard feature — accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('the dashboard has no serious or critical axe violations', async ({
    page
  }) => {
    await page.goto('/')

    await expectNoSeriousOrCriticalViolations(page, 'Dashboard initial render')
  })
})
