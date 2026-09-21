import { copy as typeCopy } from '../commodity-type/copy/copy.en.js'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const HUB_URL = /\/notifications\/[^/]+$/
const JOURNEY_ID_SEGMENT = 2
const CONSIGNMENT_GROUP_ID = 'about-the-consignment'
const ARRIVAL_GROUP_ID = 'arrival-and-destination'
const RENDERED_GROUP_IDS = [
  CONSIGNMENT_GROUP_ID,
  ARRIVAL_GROUP_ID,
  'consignment-parties',
  'check-and-submit'
]
const RENDERED_GROUP_COUNT = RENDERED_GROUP_IDS.length

const journeyIdFromPage = (page) =>
  new URL(page.url()).pathname.split('/')[JOURNEY_ID_SEGMENT]

// Exact, because the phase banner's "give your feedback by email" link also
// contains the word.
const backLink = (page) =>
  page.getByRole('link', { name: sharedCopy.layout.back, exact: true })

const taskRow = (page, title) =>
  page
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: title }) })

// A row the hub has blocked carries no link, so it is found by its title text
// rather than by the link `taskRow` filters on.
const taskRowByTitle = (page, title) =>
  page
    .getByRole('listitem')
    .filter({ has: page.getByText(title, { exact: true }) })

const startNotification = async (page) => {
  await page.goto('/')
  await page.getByRole('button', { name: dashboardCopy.startButton }).click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/commodity-type$/)
  const reference = journeyIdFromPage(page)
  await page.goto(`/notifications/${reference}`)
  await expect(page).toHaveURL(HUB_URL)
  return reference
}

test.describe('overview hub feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('starting a notification lands on the Overview heading', async ({
    page
  }) => {
    await startNotification(page)

    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()
  })

  test('shows the draft tag and the notification reference', async ({
    page
  }) => {
    const reference = await startNotification(page)

    await expect(
      page.getByText(sharedCopy.journeyStrip.draft, { exact: true })
    ).toBeVisible()
    await expect(page.getByText(reference, { exact: true })).toBeVisible()
  })

  test('offers Return to dashboard and a Back link, both to the dashboard', async ({
    page
  }) => {
    await startNotification(page)

    await expect(
      page.getByRole('button', { name: copy.returnToDashboard })
    ).toHaveAttribute('href', '/')
    await expect(backLink(page)).toHaveAttribute('href', '/')

    await backLink(page).click()

    await expect(page).toHaveURL('/')
  })

  test('renders the first group and its commodities row, linked to the page', async ({
    page
  }) => {
    const reference = await startNotification(page)

    await expect(
      page.getByText(copy.groups[CONSIGNMENT_GROUP_ID], { exact: true })
    ).toBeVisible()
    await expect(page.locator('.govuk-task-list')).toHaveCount(
      RENDERED_GROUP_COUNT
    )
    await expect(
      page.getByRole('link', { name: copy.rows.commodities.title })
    ).toHaveAttribute('href', `/notifications/${reference}/commodity-type`)
    await expect(taskRow(page, copy.rows.commodities.title)).toContainText(
      copy.statuses.notYetStarted
    )
    await expect(
      taskRow(page, copy.rows.commodities.title).locator(
        '.govuk-task-list__hint'
      )
    ).toHaveCount(0)
  })

  test('renders the origin row blocked while the entry question is unanswered', async ({
    page
  }) => {
    await startNotification(page)

    const originRow = taskRowByTitle(page, copy.rows.origin.title)
    await expect(originRow).toBeVisible()
    await expect(originRow).toContainText(copy.statuses.cannotStartYet)
    await expect(
      originRow.getByRole('link', { name: copy.rows.origin.title })
    ).toHaveCount(0)
  })

  test('renders the arrival group and its row, blocked while the entry question is unanswered', async ({
    page
  }) => {
    await startNotification(page)

    await expect(
      page.getByText(copy.groups[ARRIVAL_GROUP_ID], { exact: true })
    ).toBeVisible()
    const arrivalRow = taskRowByTitle(page, copy.rows.arrival.title)
    await expect(arrivalRow).toBeVisible()
    await expect(arrivalRow).toContainText(copy.statuses.cannotStartYet)
    await expect(
      arrivalRow.getByRole('link', { name: copy.rows.arrival.title })
    ).toHaveCount(0)
  })

  test('renders the destination row blocked while the entry question is unanswered', async ({
    page
  }) => {
    await startNotification(page)

    const destinationRow = taskRowByTitle(page, copy.rows.destination.title)
    await expect(destinationRow).toBeVisible()
    await expect(destinationRow).toContainText(copy.statuses.cannotStartYet)
    await expect(
      destinationRow.getByRole('link', { name: copy.rows.destination.title })
    ).toHaveCount(0)
  })

  test('renders no group that has landed no task row', async ({ page }) => {
    await startNotification(page)

    const emptyGroupCaptions = Object.entries(copy.groups)
      .filter(([id]) => !RENDERED_GROUP_IDS.includes(id))
      .map(([, caption]) => caption)

    for (const caption of emptyGroupCaptions) {
      await expect(page.getByText(caption, { exact: true })).toHaveCount(0)
    }
  })

  test('has no serious or critical axe violations on the initial render', async ({
    page
  }) => {
    await startNotification(page)

    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `Overview hub initial render has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})

test('shows consignor only for plants and wood notifications', async ({
  page
}) => {
  await signIn(page)
  const reference = await startNotification(page)
  for (const commodityType of [
    'plants-for-planting',
    'wood-and-cut-trees',
    'potatoes'
  ]) {
    await page.goto(`/notifications/${reference}/commodity-type`)
    await page
      .getByRole('radio', {
        name: typeCopy.typeLabels[commodityType],
        exact: true
      })
      .check()
    await page
      .getByRole('button', { name: sharedCopy.saveActions.saveAndReturnToHub })
      .click()
    await expect(page).toHaveURL(HUB_URL)
    const row = taskRowByTitle(page, copy.rows.consignor.title)
    if (commodityType === 'potatoes') {
      await expect(row).toHaveCount(0)
    } else {
      await expect(row).toContainText(copy.statuses.cannotStartYet)
    }
  }
})

test('shows the identification numbers row blocked before prerequisites are answered', async ({
  page
}) => {
  await signIn(page)
  await startNotification(page)
  const row = taskRowByTitle(page, copy.rows.identificationNumbers.title)
  await expect(row).toBeVisible()
  await expect(row).toContainText(copy.statuses.cannotStartYet)
  await expect(row.getByRole('link')).toHaveCount(0)
})

test('contact task is visible and gated before the origin is answered', async ({
  page
}) => {
  await signIn(page)
  await page.goto('/')
  await page.getByRole('button', { name: dashboardCopy.startButton }).click()
  await page
    .getByRole('link', {
      name: sharedCopy.saveActions.cancelAndReturnToHub,
      exact: true
    })
    .click()
  const row = taskRowByTitle(page, copy.rows.contact.title)
  await expect(row).toContainText(copy.statuses.cannotStartYet)
  await expect(row.getByRole('link')).toHaveCount(0)
})
