import { expect, test } from '@playwright/test'
import { signIn } from './sign-in.js'
import { PROTOTYPE_ORGANISATIONS } from '../src/server/prototype-sets/organisations.js'

const HIGH_RISK_PLANTS_DASHBOARD = '/high-risk-plants'
const [FIRST_ORGANISATION, SECOND_ORGANISATION] = PROTOTYPE_ORGANISATIONS

const chooserRows = async (page) => {
  const links = await page.getByRole('main').getByRole('link').all()
  return Promise.all(
    links.map(async (link) => ({
      href: await link.getAttribute('href'),
      text: (await link.innerText()).trim()
    }))
  )
}

const startNotification = async (page) => {
  await page.goto(HIGH_RISK_PLANTS_DASHBOARD)
  await page.getByRole('button', { name: 'Start a new notification' }).click()
  const [, journeyId] = /\/notifications\/([^/]+)\//.exec(page.url()) ?? []
  return journeyId
}

const switchOrganisation = async (page, organisation) => {
  await page.goto('/')
  await page.getByRole('radio', { name: organisation.name }).check()
  await page.getByRole('button', { name: 'Continue' }).click()
}

const visibleCardTitles = async (page) => {
  await page.goto(HIGH_RISK_PLANTS_DASHBOARD)
  return page.locator('.govuk-summary-card__title').allTextContents()
}

/**
 * Serial, and the reset test runs last: reset only ever clears the
 * signed-in organisation's own records (`records.clear(organisationId)`,
 * `prototype-seed/index.js`), so it is safe to run alongside every other
 * spec in the suite regardless — this file's own tests still run in a fixed
 * order simply because several of them build on the dashboard state the one
 * before it left.
 *
 * Every test here signs in as one of `PROTOTYPE_ORGANISATIONS`, never as the
 * suite's default `stub-org-1` (`fit/sign-in.js`'s own default) — every other
 * FIT spec relies on that organisation's dashboard starting empty, and this
 * file's reset test in particular must never be able to touch it.
 */
test.describe('sets chooser', () => {
  test.describe.configure({ mode: 'serial' })

  test('every mounted set boots to a working first page', async ({ page }) => {
    const homeResponse = await page.goto('/')
    expect(homeResponse?.ok()).toBe(true)

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
      })
    }
  })

  test('the seeded notifications appear on the high-risk-plants dashboard', async ({
    page
  }) => {
    await signIn(page, { organisationId: FIRST_ORGANISATION.id })

    await page.goto(HIGH_RISK_PLANTS_DASHBOARD)

    await expect(
      page.locator('.govuk-summary-card__title').first()
    ).toBeVisible()
  })

  test('the organisation switcher on the chooser signs in as the organisation chosen', async ({
    page
  }) => {
    await switchOrganisation(page, SECOND_ORGANISATION)

    await expect(page.getByText('Signed in as')).toContainText(
      SECOND_ORGANISATION.name
    )
  })

  // Two separate browser contexts, each signed in once and never switched:
  // the "known journeys" cookie that decides what a browser sees carries no
  // organisation of its own, so a single browser flipping between
  // organisations keeps adding to the same list rather than swapping it (a
  // pre-existing gap in the stub store, not something this increment
  // touches). Two fresh sessions is how this genuinely is scoped per
  // organisation — by `prototype-seed/registry.js`, one browser per
  // organisation, the way a designer and a colleague previewing a different
  // organisation actually would.
  test('each organisation sees only its own seeded notifications', async ({
    browser
  }) => {
    const northContext = await browser.newContext()
    const southContext = await browser.newContext()
    try {
      const northPage = await northContext.newPage()
      const southPage = await southContext.newPage()
      await signIn(northPage, { organisationId: FIRST_ORGANISATION.id })
      await signIn(southPage, { organisationId: SECOND_ORGANISATION.id })

      const northTitles = await visibleCardTitles(northPage)
      const southTitles = await visibleCardTitles(southPage)

      expect(northTitles.length).toBeGreaterThan(0)
      expect(southTitles.length).toBeGreaterThan(0)
      expect(southTitles.some((title) => northTitles.includes(title))).toBe(
        false
      )
    } finally {
      await northContext.close()
      await southContext.close()
    }
  })

  test('the reset button resets', async ({ page }) => {
    await signIn(page, { organisationId: FIRST_ORGANISATION.id })
    const reference = await startNotification(page)
    await page.goto(HIGH_RISK_PLANTS_DASHBOARD)
    await expect(page.getByText(reference).first()).toBeVisible()

    await page.goto('/')
    await page
      .locator('form[action="/reset/high-risk-plants"]')
      .getByRole('button')
      .click()

    await expect(page).toHaveURL(/\/\?reset=high-risk-plants$/)
    const banner = page.locator('.govuk-notification-banner')
    await expect(banner).toContainText('has been reset')
    await expect(banner).toContainText(FIRST_ORGANISATION.name)

    await page.goto(HIGH_RISK_PLANTS_DASHBOARD)
    await expect(page.getByText(reference)).toHaveCount(0)
    await expect(
      page.locator('.govuk-summary-card__title').first()
    ).toBeVisible()
  })
})
