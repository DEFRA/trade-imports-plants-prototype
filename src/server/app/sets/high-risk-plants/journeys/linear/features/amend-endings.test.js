import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../../../../../config/nunjucks/nunjucks.js'
import { driveHandler } from '../../../../../engine/test-support.js'
import { pagePath } from '../../../../../shared/paths.js'
import {
  COMPLETE_NOTIFICATION,
  useStubbedHighRiskPlantsJourney
} from '../test-support.js'
import { taskRows } from '../flow/task-rows.js'
import { commodityDetailsPage } from './commodities/page.js'
import { consignorPage } from './consignor-select/page.js'
import { allRoutes } from './index.js'

const environment = nunjucksConfig.options.compileOptions.environment

const globalNunjucksContext = {
  assetPath: '/public/assets',
  getAssetPath: (asset) => `/public/${asset}`,
  userSession: { isAuthenticated: true, displayName: 'Andrew Farmer' }
}

const taskRowPages = taskRows
  .flatMap((row) => row.pages)
  .filter((page) => page.id !== commodityDetailsPage.id)

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

const renderAmending = async (page) => {
  const { journeyId, view } = await driveHandler(pageGetHandler(page), {
    seed: seedFor(page),
    amend: true,
    pathOf: (id) => pagePath(id, page.slug)
  })
  return {
    path: pagePath(journeyId, page.slug),
    html: environment.render(`${view.view}.njk`, {
      ...globalNunjucksContext,
      ...view.context
    })
  }
}

describe('amend endings on every task-row page', () => {
  useStubbedHighRiskPlantsJourney()

  it.each(taskRowPages.map((page) => [page.id, page]))(
    'Should end the %s page with Save and return to the review while amending',
    async (_id, page) => {
      const { path, html } = await renderAmending(page)

      expect(html).toContain(`formaction="${path}?change=1"`)
      expect(html).toContain(`formaction="${path}"`)
    }
  )
})
