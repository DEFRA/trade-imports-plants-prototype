import { existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { signIn } from './sign-in.js'
import {
  fixtureFileOf,
  journeyIdOfPath,
  journeyPath,
  readScenarios,
  resolveStepFields
} from '../scripts/designer/show/steps.js'
import {
  fillFields,
  pageHeading,
  submitAndWait,
  tickEveryCheckbox
} from '../scripts/designer/show/walk.js'
import { AXE_TAGS } from '../scripts/designer/show/manifest.js'

/**
 * Every design release walks to confirmation.
 *
 * A design release is a set a designer made (`npm run new:set -- <id> --from
 * high-risk-plants`): any set except high-risk-plants (which
 * journey-smoke.fit.spec.js walks with its own wording) and sample-journey
 * (which has no journey). For each release with a happy-path.json, each
 * scenario is filled in on screen from its field names alone (no wording,
 * so a release whose words changed still walks), then taken through check
 * your answers and the declaration to confirmation. Every page is checked
 * with axe against WCAG 2.2 AA.
 *
 * It runs in the journeys project, so each pull request's Playwright report
 * carries a walkthrough video per release, and the weekly sync's boot check
 * covers releases as well as the real journey.
 *
 * It also proves a prototype-owned service works behind real pages (below).
 */

const SETS_DIR = fileURLToPath(
  new URL('../src/server/app/sets/', import.meta.url)
)
const NOT_RELEASES = new Set(['high-risk-plants', 'sample-journey'])
const PAGES_AFTER_THE_HUB = ['notification-view', 'declaration']
const BLOCKING_IMPACTS = ['serious', 'critical']

const releases = readdirSync(SETS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !NOT_RELEASES.has(entry.name))
  .map((entry) => entry.name)
  .filter((id) => existsSync(fixtureFileOf(path.join(SETS_DIR, id))))
  .sort()

const seriousProblems = async (page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags([...AXE_TAGS])
    .analyze()
  return violations
    .filter(({ impact }) => BLOCKING_IMPACTS.includes(impact))
    .map(({ id, help, nodes }) => `${id}: ${help} (${nodes.length})`)
}

const expectPageMovesOn = async (page, where) => {
  const sent = await submitAndWait(page)
  expect(
    sent.errors,
    `${where} showed error messages: ${sent.errors.join('; ')}`
  ).toEqual([])
  expect(sent.outcome, `${where} did not move on`).toBe('moved')
}

/**
 * A prototype-owned service behind real GOV.UK pages: the saved-transporters
 * example in the placeholder set, on `src/server/app/services/transporters/`.
 * It searches, pages, refuses an incomplete transporter with the form's own
 * errors, adds and deletes one, and the chooser's Reset for this set puts
 * the starter transporters back. Only the placeholder set is reset: the real
 * journey's data is shared by every other spec.
 */
test.describe('a prototype-owned service behind real pages', () => {
  const TRANSPORTERS = '/sample-journey/transporters'
  const ADDED = 'Fit Test Haulage'
  const STARTER = 'Copperfield Couriers'
  const SEARCH = 'Search saved transporters'

  const cell = (page, text) =>
    page.getByRole('cell', { name: text, exact: true })

  const search = async (page, text) => {
    await page.getByLabel(SEARCH).fill(text)
    await page.getByRole('button', { name: 'Search' }).click()
  }

  const resetThisSet = async (page) => {
    await page.goto('/')
    await page
      .locator('li[data-set-id="sample-journey"]')
      .getByRole('button', { name: 'Reset this prototype’s data' })
      .click()
    await expect(page.getByText('has been reset')).toBeVisible()
  }

  const addTransporter = async (page, name) => {
    await page.goto(TRANSPORTERS)
    await page.getByRole('link', { name: 'Add a transporter' }).click()
    await page.getByLabel('Name', { exact: true }).fill(name)
    await page.getByLabel('Commercial').check()
    await page.getByLabel('Address line 1').fill('1 Depot Road')
    await page.getByLabel('Town or city').fill('Dover')
    await page.getByLabel('Country').fill('United Kingdom')
    await page.getByRole('button', { name: 'Save transporter' }).click()
  }

  test('searches, pages, adds with errors, deletes and resets for its own set', async ({
    page
  }) => {
    const problems = {}
    const checkAccessibility = async (label) => {
      const found = await seriousProblems(page)
      if (found.length > 0) {
        problems[label] = found
      }
    }

    await signIn(page, { organisationId: 'fit-saved-transporters' })
    // A retry starts from the starters, not from the last attempt's data.
    await resetThisSet(page)

    await test.step('the list pages through the starter transporters', async () => {
      await page.goto(TRANSPORTERS)
      await expect(
        page.getByRole('heading', { level: 1, name: 'Saved transporters' })
      ).toBeVisible()
      await expect(page.getByText('Showing 5 of 7 transporters')).toBeVisible()
      await checkAccessibility('list')
      await page.getByRole('link', { name: 'Next' }).click()
      await expect(page.getByText('Showing 2 of 7 transporters')).toBeVisible()
    })

    await test.step('a search finds one transporter', async () => {
      await search(page, 'rotterdam')
      await expect(cell(page, 'North Sea Freight BV')).toBeVisible()
      await expect(page.getByText('Showing 1 of 1 transporters')).toBeVisible()
    })

    await test.step('an empty form shows the service’s refusals as errors', async () => {
      await page.goto(`${TRANSPORTERS}/add`)
      await page.getByRole('button', { name: 'Save transporter' }).click()
      const summary = page.getByRole('alert')
      await expect(summary).toContainText('Enter the transporter’s name')
      await expect(summary).toContainText('Select the type of transporter')
      await expect(summary).toContainText('Enter address line 1')
      await checkAccessibility('add with errors')
    })

    await test.step('a new transporter can be found straight away', async () => {
      await addTransporter(page, ADDED)
      await expect(cell(page, ADDED)).toBeVisible()
    })

    await test.step('deleting asks first, then removes it', async () => {
      await page.getByRole('link', { name: `Delete ${ADDED}` }).click()
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: `Are you sure you want to delete ${ADDED}?`
        })
      ).toBeVisible()
      await checkAccessibility('delete')
      await page.getByRole('button', { name: 'Yes, delete it' }).click()
      await search(page, ADDED)
      await expect(
        page.getByText('No transporters match your search.')
      ).toBeVisible()
    })

    await test.step('Reset of this set brings the starters back and empties what was added', async () => {
      await addTransporter(page, ADDED)
      await search(page, STARTER)
      await page.getByRole('link', { name: `Delete ${STARTER}` }).click()
      await page.getByRole('button', { name: 'Yes, delete it' }).click()

      await resetThisSet(page)

      await page.goto(TRANSPORTERS)
      await search(page, STARTER)
      await expect(cell(page, STARTER)).toBeVisible()
      await search(page, ADDED)
      await expect(
        page.getByText('No transporters match your search.')
      ).toBeVisible()
    })

    expect(
      problems,
      'Serious accessibility problems (axe, WCAG 2.2 AA)'
    ).toEqual({})
  })
})

for (const setId of releases) {
  const setBase = `/${setId}`
  const scenarios = readScenarios(path.join(SETS_DIR, setId))

  test.describe(`design release ${setId}`, () => {
    for (const scenario of scenarios) {
      test(`${scenario.name}: ${scenario.useCase ?? 'example'} reaches confirmation`, async ({
        page
      }) => {
        const problems = {}
        const checkAccessibility = async (label) => {
          const found = await seriousProblems(page)
          if (found.length > 0) {
            problems[label] = found
          }
        }

        await signIn(page)
        await page.goto(setBase)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await checkAccessibility('dashboard')
        await expectPageMovesOn(page, 'The dashboard start button')
        const journeyId = journeyIdOfPath(setBase, new URL(page.url()).pathname)
        expect(journeyId, 'Starting did not open a notification').not.toBeNull()

        for (const [index, step] of scenario.steps.entries()) {
          await test.step(`${index + 1}. ${step.slug}`, async () => {
            await expect(page).toHaveURL(
              (url) =>
                url.pathname === journeyPath(setBase, journeyId, step.slug)
            )
            await checkAccessibility(`${index + 1}. ${step.slug}`)
            await fillFields(page, resolveStepFields(step))
            await expectPageMovesOn(page, step.slug)
          })
        }

        await expect(page).toHaveURL(
          (url) => url.pathname === journeyPath(setBase, journeyId)
        )
        await checkAccessibility('hub')

        await page.goto(journeyPath(setBase, journeyId, PAGES_AFTER_THE_HUB[0]))
        for (const slug of PAGES_AFTER_THE_HUB) {
          await test.step(slug, async () => {
            await expect(page).toHaveURL(
              (url) => url.pathname === journeyPath(setBase, journeyId, slug)
            )
            await checkAccessibility(slug)
            await tickEveryCheckbox(page)
            await expectPageMovesOn(page, slug)
          })
        }

        await expect(page).toHaveURL(
          (url) =>
            url.pathname === journeyPath(setBase, journeyId, 'confirmation')
        )
        expect(await pageHeading(page)).toBeTruthy()
        await expect(page.getByText(journeyId).first()).toBeVisible()
        await checkAccessibility('confirmation')

        expect(
          problems,
          'Serious accessibility problems (axe, WCAG 2.2 AA)'
        ).toEqual({})
      })
    }
  })
}
