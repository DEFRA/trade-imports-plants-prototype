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

test('sets chooser: every mounted set boots to a working first page', async ({
  page
}) => {
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
