import { SET_ID } from '../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../../../../../config/nunjucks/nunjucks.js'
import { store } from '../../../../../engine/store.js'
import { configureRecords } from '../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../engine/test-support.js'
import { pagePath } from '../../../../../shared/paths.js'
import {
  COMPLETE_NOTIFICATION,
  installHighRiskPlantsJourney
} from '../test-support.js'
import { taskRows } from '../flow/task-rows.js'
import { commodityDetailsPage } from './commodities/page.js'
import { consignorPage } from './consignor-select/page.js'
import { allRoutes } from './index.js'

const environment = nunjucksConfig.options.compileOptions.environment

// What the global Nunjucks context adds to every rendered page.
const requestWideContext = {
  assetPath: '/public/assets',
  getAssetPath: (asset) => `/public/${asset}`,
  userSession: { isAuthenticated: true, displayName: 'Andrew Farmer' }
}

// The collection-entry sub-page saves back to the list, which carries the
// amend ending for the row (add-a-collection.md).
const taskRowPages = taskRows
  .flatMap((row) => row.pages)
  .filter((page) => page.id !== commodityDetailsPage.id)

const pageGetHandler = (page) =>
  allRoutes.find(
    (route) =>
      route.method === 'GET' &&
      route.path.endsWith(`/notifications/{journeyId}/${page.slug}`)
  ).handler

// Potatoes owe no consignor, so its picker is opened on a plants notification.
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
      ...requestWideContext,
      ...view.context
    })
  }
}

// Every page in a task row takes the amend ending, so a page whose template
// stops passing `amend` to saveActions fails here rather than in a browser.
describe('amend endings on every task-row page', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    installHighRiskPlantsJourney()
  })
  beforeEach(() => store.clear())

  it.each(taskRowPages.map((page) => [page.id, page]))(
    'Should end the %s page with Save and return to the review while amending',
    async (_id, page) => {
      const { path, html } = await renderAmending(page)

      expect(html).toContain(`formaction="${path}?change=1"`)
      expect(html).toContain(`formaction="${path}"`)
    }
  )
})
