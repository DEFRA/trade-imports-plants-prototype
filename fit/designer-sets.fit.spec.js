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
