import {
  BASE,
  notificationPageWithTrail,
  setUrl
} from '../../../../../../../../../fit/set-base.js'
import { TRAIL_START } from '../../../../../../shared/trail.js'
import { copy as typeCopy } from '../commodity-type/copy/copy.en.js'
import {
  backLink,
  saveAndReturnToHub,
  expectNoSeriousOrCriticalViolations,
  startNotificationAtOverview
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const HUB_URL = setUrl('/notifications/[^/]+$')
const CONSIGNMENT_GROUP_ID = 'about-the-consignment'
const ARRIVAL_GROUP_ID = 'arrival-and-destination'
const RENDERED_GROUP_IDS = [
  CONSIGNMENT_GROUP_ID,
  ARRIVAL_GROUP_ID,
  'consignment-parties',
  'check-and-submit'
]
const RENDERED_GROUP_COUNT = RENDERED_GROUP_IDS.length

const taskRow = (page, title) =>
  page
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: title }) })

const blockedRowByTitle = (page, title) =>
  page
    .getByRole('listitem')
    .filter({ has: page.getByText(title, { exact: true }) })

test.describe('overview hub feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('Overview requested with nothing saved shows What are you importing?', async ({
    page
  }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: dashboardCopy.startButton }).click()
    await expect(page).toHaveURL(
      notificationPageWithTrail('commodity-type', [TRAIL_START.dashboard])
    )
    const commodityTypeUrl = page.url()
    const overviewUrl = commodityTypeUrl.replace(
      /\/commodity-type(?:\?.*)?$/,
      ''
    )

    expect(overviewUrl).toMatch(HUB_URL)
    await page.goto(overviewUrl)

    await expect(page).toHaveURL(`${overviewUrl}/commodity-type`)
    await expect(
      page.getByRole('heading', { name: typeCopy.title })
    ).toBeVisible()
  })

  test('Overview shows its heading once the commodity type is saved', async ({
    page
  }) => {
    await startNotificationAtOverview(page)

    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()
  })

  test('shows the draft tag and the notification reference', async ({
    page
  }) => {
    const reference = await startNotificationAtOverview(page)

    await expect(
      page.getByText(sharedCopy.journeyStrip.draft, { exact: true })
    ).toBeVisible()
    await expect(page.getByText(reference, { exact: true })).toBeVisible()
    await expect(
      page.locator('.app-journey-strip').getByRole('link', {
        name: sharedCopy.journeyStrip.cancelAmend,
        exact: true
      })
    ).toHaveCount(0)
  })

  test('offers Return to dashboard and a Back link, both to the dashboard', async ({
    page
  }) => {
    await startNotificationAtOverview(page)

    await expect(
      page.getByRole('button', { name: copy.returnToDashboard })
    ).toHaveAttribute('href', BASE)
    await expect(backLink(page)).toHaveAttribute('href', BASE)

    await backLink(page).click()

    await expect(page).toHaveURL(BASE)
  })

  test('renders the first group and its commodities row, linked to the page', async ({
    page
  }) => {
    const reference = await startNotificationAtOverview(page)

    await expect(
      page.getByText(copy.groups[CONSIGNMENT_GROUP_ID], { exact: true })
    ).toBeVisible()
    await expect(page.locator('.govuk-task-list')).toHaveCount(
      RENDERED_GROUP_COUNT
    )
    await expect(
      page.getByRole('link', { name: copy.rows.commodities.title })
    ).toHaveAttribute(
      'href',
      `${BASE}/notifications/${reference}/commodity-type?from=overview`
    )
    await expect(taskRow(page, copy.rows.commodities.title)).toContainText(
      copy.statuses.inProgress
    )
    await expect(
      taskRow(page, copy.rows.commodities.title).locator(
        '.govuk-task-list__hint'
      )
    ).toHaveCount(0)
  })

  test('renders no group that has landed no task row', async ({ page }) => {
    await startNotificationAtOverview(page)

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
    await startNotificationAtOverview(page)

    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(
      page,
      'Overview hub initial render'
    )
  })
})

test('shows consignor only for plants and wood notifications', async ({
  page
}) => {
  await signIn(page)
  const reference = await startNotificationAtOverview(page)
  for (const commodityType of [
    'plants-for-planting',
    'wood-and-cut-trees',
    'potatoes'
  ]) {
    await page.goto(`${BASE}/notifications/${reference}/commodity-type`)
    await page
      .getByRole('radio', {
        name: typeCopy.typeLabels[commodityType],
        exact: true
      })
      .check()
    await saveAndReturnToHub(page).click()
    await expect(page).toHaveURL(HUB_URL)
    const row = blockedRowByTitle(page, copy.rows.consignor.title)
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
  await startNotificationAtOverview(page)
  const row = blockedRowByTitle(page, copy.rows.identificationNumbers.title)
  await expect(row).toBeVisible()
  await expect(row).toContainText(copy.statuses.cannotStartYet)
  await expect(row.getByRole('link')).toHaveCount(0)
})

test('contact task is visible and gated before the origin is answered', async ({
  page
}) => {
  await signIn(page)
  await startNotificationAtOverview(page)
  const row = blockedRowByTitle(page, copy.rows.contact.title)
  await expect(row).toContainText(copy.statuses.cannotStartYet)
  await expect(row.getByRole('link')).toHaveCount(0)
})
