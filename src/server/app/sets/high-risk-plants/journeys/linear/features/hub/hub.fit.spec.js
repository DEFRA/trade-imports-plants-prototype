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
const RENDERED_GROUP_IDS = [
  CONSIGNMENT_GROUP_ID,
  'arrival-and-destination',
  'consignment-parties',
  'check-and-submit'
]

const taskRow = (page, title) =>
  page
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: title }) })

const taskListRegion = (page) =>
  page.getByRole('region', { name: copy.taskListHeading, exact: true })

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
    await expect(taskListRegion(page).getByRole('region')).toHaveCount(
      RENDERED_GROUP_IDS.length
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
      taskRow(page, copy.rows.commodities.title).getByRole('link', {
        name: copy.rows.commodities.title
      })
    ).toHaveAccessibleDescription(copy.statuses.inProgress)
  })

  test('the task list is a region named by its visible heading, holding one region per group, each named by its third-level heading and holding one task list', async ({
    page
  }) => {
    await startNotificationAtOverview(page)

    const captions = RENDERED_GROUP_IDS.map((id) => copy.groups[id])
    const taskList = taskListRegion(page)
    await expect(
      taskList.getByRole('heading', { level: 2, name: copy.taskListHeading })
    ).toBeVisible()
    await expect(taskList.getByRole('region')).toHaveCount(captions.length)
    for (const caption of captions) {
      const group = taskList.getByRole('region', { name: caption, exact: true })
      await expect(group.getByRole('heading', { level: 3 })).toHaveText(caption)
      await expect(group.getByRole('list')).toHaveCount(1)
    }
    await expect(
      page.getByRole('main').getByRole('heading', { level: 2 })
    ).toHaveText([copy.taskListHeading])
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
