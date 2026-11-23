import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../../../../../config/nunjucks/nunjucks.js'
import { driveHandler } from '../../../../../engine/test-support.js'
import { hubPath, pagePath } from '../../../../../shared/paths.js'
import { copy as sharedEn } from '../../../../../shared/copy.en.js'
import {
  COMPLETE_NOTIFICATION,
  useStubbedHighRiskPlantsJourney
} from '../test-support.js'
import { taskRows } from '../flow/task-rows.js'
import { consignorPage } from './consignor-select/page.js'
import { commoditiesPage } from './commodities/page.js'
import { arrivalStatusPage } from './arrival-status/page.js'
import { allRoutes } from './index.js'

const environment = nunjucksConfig.options.compileOptions.environment

const globalNunjucksContext = {
  assetPath: '/public/assets',
  getAssetPath: (asset) => `/public/${asset}`,
  userSession: { isAuthenticated: true, displayName: 'Andrew Farmer' }
}

const taskRowPages = taskRows.flatMap((row) => row.pages)

const pageGetHandler = (page) =>
  allRoutes.find(
    (route) =>
      route.method === 'GET' &&
      route.path.endsWith(`/notifications/{journeyId}/${page.slug}`)
  ).handler

const seedFor = (page) =>
  page.id === consignorPage.id
    ? { commodityType: 'plants-for-planting', countryOfOrigin: 'FR' }
    : COMPLETE_NOTIFICATION

const renderPage = async (page, { amend }) => {
  const { journeyId, view } = await driveHandler(pageGetHandler(page), {
    seed: seedFor(page),
    amend,
    pathOf: (id) => pagePath(id, page.slug)
  })
  return {
    journeyId,
    html: environment.render(`${view.view}.njk`, {
      ...globalNunjucksContext,
      ...view.context
    })
  }
}

const JOURNEY_PLACEHOLDER = 'JOURNEY'

const SAVE_CONTROLS = new RegExp(
  '<div class="govuk-button-group">[\\s\\S]*?</div>' +
    '(\\s*<p class="govuk-body">\\s*<a class="govuk-link"[^>]*>[^<]*</a>\\s*</p>)?',
  'g'
)

const saveControlsOf = ({ html, journeyId }) =>
  [...html.matchAll(SAVE_CONTROLS)]
    .map(([controls]) => controls.replaceAll(journeyId, JOURNEY_PLACEHOLDER))
    .join('\n')

const buttonLabelsOf = (controls) =>
  [...controls.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map(([, label]) =>
    label.trim()
  )

describe('save controls on every task-row page while amending', () => {
  useStubbedHighRiskPlantsJourney()

  it.each(taskRowPages.map((page) => [page.id, page]))(
    'Should end the %s page with exactly the controls it shows on a draft',
    async (_id, page) => {
      const draft = await renderPage(page, { amend: false })
      const amending = await renderPage(page, { amend: true })

      expect(saveControlsOf(amending)).toBe(saveControlsOf(draft))
    }
  )

  it('Should offer Save and continue, Save and return to overview and a link to cancel back to the overview', async () => {
    const amending = await renderPage(arrivalStatusPage, { amend: true })
    const controls = saveControlsOf(amending)

    expect(buttonLabelsOf(controls)).toEqual([
      sharedEn.saveActions.saveAndContinue,
      sharedEn.saveActions.saveAndReturnToHub
    ])
    expect(controls).toContain('value="hub" name="exit"')
    expect(controls).toContain(
      `<a class="govuk-link" href="${hubPath(JOURNEY_PLACEHOLDER)}">${sharedEn.saveActions.cancelAndReturnToHub}</a>`
    )
  })

  it('Should end the commodities list with the controls it shows on a draft, Save and continue alone', async () => {
    const draft = await renderPage(commoditiesPage, { amend: false })
    const amending = await renderPage(commoditiesPage, { amend: true })

    expect(saveControlsOf(amending)).toBe(saveControlsOf(draft))
    expect(buttonLabelsOf(saveControlsOf(amending))).toEqual([
      sharedEn.saveActions.saveAndContinue
    ])
  })
})
