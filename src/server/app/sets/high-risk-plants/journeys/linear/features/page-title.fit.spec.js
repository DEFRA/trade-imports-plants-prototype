import { expect, test } from '@playwright/test'

import { BASE } from '../../../../../../../../fit/set-base.js'
import { signIn } from '../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../shared/copy.en.js'
import { copy as commodityTypeCopy } from './commodity-type/copy/copy.en.js'
import { copy as dashboardCopy } from './dashboard/copy/copy.en.js'

const { serviceName, govukSuffix, errorTitlePrefix } = sharedCopy.layout

const startAtCommodityType = async (page) => {
  await page.goto(BASE)
  await page.getByRole('button', { name: dashboardCopy.startButton }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: commodityTypeCopy.legend })
  ).toBeVisible()
}

test.describe('page title', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtCommodityType(page)
  })

  test('reads page name, service name and GOV.UK, joined by hyphens', async ({
    page
  }) => {
    await expect(page).toHaveTitle(
      `${commodityTypeCopy.title} - ${serviceName} - ${govukSuffix}`
    )
  })

  test('puts the error prefix in front of the whole title when the page shows errors', async ({
    page
  }) => {
    await page
      .getByRole('button', { name: sharedCopy.saveActions.saveAndContinue })
      .click()

    await expect(
      page
        .getByRole('alert')
        .getByRole('link', { name: commodityTypeCopy.errors.commodityType })
    ).toBeVisible()
    await expect(page).toHaveTitle(
      `${errorTitlePrefix}${commodityTypeCopy.title} - ${serviceName} - ${govukSuffix}`
    )
  })
})
