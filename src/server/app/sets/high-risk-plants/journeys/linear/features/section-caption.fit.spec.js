import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../fit/sign-in.js'
import { copy as sectionCaptionsCopy } from '../flow/section-captions/copy/copy.en.js'
import { copy as dashboardCopy } from './dashboard/copy/copy.en.js'

test.describe('section caption above the page heading', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('names the dashboard above its heading', async ({ page }) => {
    await page.goto('/')

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
    await page.goto('/')

    await expect(page.locator('span.govuk-caption-xl')).toHaveText(
      sectionCaptionsCopy.sections.dashboard
    )

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `Captioned page has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})
