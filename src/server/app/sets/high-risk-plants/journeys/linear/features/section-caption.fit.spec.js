import { BASE } from '../../../../../../../../fit/set-base.js'
import { expectNoSeriousOrCriticalViolations } from '../../../../../../../../fit/high-risk-plants-journey.js'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../fit/sign-in.js'
import { copy as sectionCaptionsCopy } from '../flow/section-captions/copy/copy.en.js'
import { copy as dashboardCopy } from './dashboard/copy/copy.en.js'

test.describe('section caption above the page heading', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('names the dashboard above its heading', async ({ page }) => {
    await page.goto(BASE)

    // The selector pins placement: the caption must be the element directly
    // above the page heading, not text floating elsewhere in the content.
    await expect(
      page.locator('span.govuk-caption-xl + h1.govuk-heading-xl')
    ).toHaveText(dashboardCopy.title)
    await expect(page.locator('span.govuk-caption-xl')).toHaveText(
      sectionCaptionsCopy.sections.dashboard
    )
  })

  test('has no serious or critical axe violations with a caption on the page', async ({
    page
  }) => {
    await page.goto(BASE)

    await expect(page.locator('span.govuk-caption-xl')).toHaveText(
      sectionCaptionsCopy.sections.dashboard
    )

    await expectNoSeriousOrCriticalViolations(page, 'Captioned page')
  })
})
