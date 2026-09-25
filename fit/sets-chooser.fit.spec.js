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
 * Seeding and reset are not driven from here: the FIT web server runs with
 * `PROTOTYPE_SEED=false` so every other spec's dashboard starts empty, and a
 * reset clears the data every parallel spec shares. The unit tests under
 * `src/server/prototype-seed/` and `src/server/sets-index/` cover both.
 */
test.describe('sets chooser', () => {
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
})
