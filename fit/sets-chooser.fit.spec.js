import { expect, test } from '@playwright/test'

const chooserRows = async (page) => {
  const links = await page.getByRole('main').getByRole('link').all()
  return Promise.all(
    links.map(async (link) => ({
      href: await link.getAttribute('href'),
      text: (await link.innerText()).trim()
    }))
  )
}

/**
 * Watches a page's own network and console traffic from here on, so a caller
 * can assert "nothing broke" after each navigation without missing a
 * late-arriving asset (a stylesheet or script the browser requests after the
 * document itself has loaded).
 *
 * Catches exactly the class of bug the chooser spec used to miss: every page
 * here rendered a heading, so the boot check passed, even the run where the
 * page's own CSS 404'd and the page was completely unstyled (see the
 * `application.css` red/green proof below).
 */
const trackPageHealth = (page) => {
  let failures = []

  page.on('response', (response) => {
    if (response.status() >= 400) {
      failures.push(`response ${response.status()}: ${response.url()}`)
    }
  })
  page.on('requestfailed', (request) => {
    failures.push(
      `request failed: ${request.url()} (${request.failure()?.errorText ?? 'unknown error'})`
    )
  })
  page.on('console', (message) => {
    if (message.type() === 'error') {
      failures.push(`console error: ${message.text()}`)
    }
  })

  return {
    assertHealthy: () => {
      expect(failures, failures.join('\n')).toEqual([])
    },
    reset: () => {
      failures = []
    }
  }
}

/**
 * A binary check that govuk-frontend's own stylesheet is actually applied —
 * not a layout tolerance (see the workspace's no-tolerance-based-layout-tests
 * rule): the header either has GOV.UK's own brand-blue background or it does
 * not. Every page here extends the shared layout, so `.govuk-header` is
 * present regardless of which page's own content is being checked — unlike a
 * page-specific heading class, this doesn't vary between the chooser and a
 * set's own first page.
 */
const GOVUK_HEADER_BACKGROUND = 'rgb(29, 112, 184)'

const assertGovukStylesApplied = async (page) => {
  const backgroundColor = await page.evaluate(
    () =>
      getComputedStyle(document.querySelector('.govuk-header')).backgroundColor
  )
  expect(backgroundColor).toBe(GOVUK_HEADER_BACKGROUND)
}

/**
 * Seeding and reset are not driven from here: the FIT web server runs with
 * `PROTOTYPE_SEED=false` so every other spec's dashboard starts empty, and a
 * reset clears the data every parallel spec shares. The unit tests under
 * `src/server/prototype-seed/` and `src/server/sets-index/` cover both.
 */
test.describe('sets chooser', () => {
  test('every mounted set boots to a working first page', async ({ page }) => {
    const health = trackPageHealth(page)

    const homeResponse = await page.goto('/')
    expect(homeResponse?.ok()).toBe(true)
    await page.waitForLoadState('networkidle')
    health.assertHealthy()
    await assertGovukStylesApplied(page)
    health.reset()

    const sets = await chooserRows(page)
    expect(sets.length).toBeGreaterThan(0)

    for (const { href, text } of sets) {
      await test.step(text, async () => {
        const response = await page.goto(href)
        expect(response?.ok()).toBe(true)

        const heading = page.getByRole('heading', { level: 1 })
        await expect(heading).toBeVisible()
        // A bare numeric heading is the shared error view (see errors.js), not a set's first page.
        await expect(heading).not.toHaveText(/^\d+$/)

        await page.waitForLoadState('networkidle')
        health.assertHealthy()
        await assertGovukStylesApplied(page)
        health.reset()
      })
    }
  })

  test('moving between prototypes from the chooser', async ({ page }) => {
    const health = trackPageHealth(page)

    const homeResponse = await page.goto('/')
    expect(homeResponse?.ok()).toBe(true)
    await page.waitForLoadState('networkidle')
    health.assertHealthy()
    await assertGovukStylesApplied(page)
    health.reset()

    const sets = await chooserRows(page)
    expect(sets.length).toBeGreaterThan(1)

    const chooserHeading = page.getByRole('heading', { level: 1 })
    const chooserHeadingText = (await chooserHeading.innerText()).trim()

    const openSetFromChooser = async (set) => {
      await page.getByRole('link', { name: set.text, exact: true }).click()
      const heading = page.getByRole('heading', { level: 1 })
      await expect(heading).toBeVisible()
      await expect(heading).not.toHaveText(chooserHeadingText)
      await expect(heading).not.toHaveText(/^\d+$/)
      await page.waitForLoadState('networkidle')
      health.assertHealthy()
      await assertGovukStylesApplied(page)
      health.reset()
    }

    const returnToChooser = async () => {
      await page.goBack()
      await expect(chooserHeading).toHaveText(chooserHeadingText)
      await page.waitForLoadState('networkidle')
      health.assertHealthy()
      await assertGovukStylesApplied(page)
      health.reset()
    }

    for (let index = 0; index < sets.length - 1; index++) {
      const [first, second] = [sets[index], sets[index + 1]]

      await test.step(`${first.text} then ${second.text}`, async () => {
        await openSetFromChooser(first)
        await returnToChooser()
        await openSetFromChooser(second)
        await returnToChooser()
      })

      await test.step(`${second.text} then ${first.text}`, async () => {
        await openSetFromChooser(second)
        await returnToChooser()
        await openSetFromChooser(first)
        await returnToChooser()
      })
    }
  })
})
