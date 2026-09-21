import {
  createPath,
  dashboardPath,
  hubPath,
  pagePath,
  pageRoutePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import { DELETED } from '../../../../../../engine/index.js'
import {
  amendJourney,
  listKnownJourneys,
  startJourney
} from '../../../../../../engine/journey.js'
import * as kit from '../../../../../../shared/kit.js'
import { beginOpeningRun } from '../../../../../../flow/run-state.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { commodityTypePage } from '../commodity-type/page.js'
import { dashboardPage } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import {
  buildPageResultsRangeLabel,
  buildPaginationLinks,
  normalizePageNumber,
  parseNotificationSort
} from './notification-helper.js'
import { toRow } from './view-model/row/index.js'
import { sortOptions } from './view-model/sort-options.js'

const view = `${TEMPLATES}/features/dashboard/template`

const copy = copyFor({ en, cy })

const DECIMAL = 10

const parseReferenceNumber = (value) => {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const resultsLabels = (referenceNumber) =>
  referenceNumber
    ? { ...copy.pagination.results, none: copy.search.noResults }
    : copy.pagination.results

export const renderDashboard = async (request, h) => {
  const queryPage = Number.parseInt(request.query?.page, DECIMAL)
  const requestedPage = normalizePageNumber(queryPage)
  const sort = parseNotificationSort(request.query?.sort)
  const referenceNumber = parseReferenceNumber(request.query?.referenceNumber)
  const listFor = (page) =>
    listKnownJourneys(request, { page, sort, referenceNumber })
  const requested = await listFor(requestedPage)
  const currentPage = normalizePageNumber(requestedPage, requested.totalPages)
  const listed =
    currentPage === requestedPage ? requested : await listFor(currentPage)
  const rows = listed.rows.filter((journey) => journey.status !== DELETED)
  const pagination = {
    page: currentPage,
    size: listed.size,
    totalElements: listed.totalElements,
    totalPages: listed.totalPages
  }

  return h.view(view, {
    ...kit.base(copy.title, { page: dashboardPage }),
    contentColumnClass: kit.surfaceClass('display'),
    copy,
    startAction: createPath(),
    listAction: dashboardPath(),
    notificationRows: await Promise.all(rows.map(toRow)),
    resultsLabel: buildPageResultsRangeLabel(
      pagination,
      rows.length,
      resultsLabels(referenceNumber)
    ),
    pagination: buildPaginationLinks(
      pagination,
      dashboardPath(),
      sort,
      copy.pagination,
      referenceNumber
    ),
    currentPage,
    sort,
    referenceNumber: referenceNumber ?? '',
    sortOptions: sortOptions.map((option) => ({
      ...option,
      selected: option.value === sort
    })),
    deletionSucceeded: request.query?.deleted === '1'
  })
}

const listGet = async (request, h) => renderDashboard(request, h)

const amendPost = async (request, h) => {
  const journey = await amendJourney(request, h, request.params.journeyId)
  return h.redirect(journey ? hubPath(journey.journeyId) : dashboardPath())
}

const createPost = async (request, h) => {
  const journey = await startJourney(request, h)
  await beginOpeningRun(request, h, journey.journeyId)
  return h.redirect(pagePath(journey.journeyId, commodityTypePage.slug))
}

export const routes = [
  {
    method: 'GET',
    path: dashboardPath(),
    options: kit.routeOptions,
    handler: listGet
  },
  {
    method: 'POST',
    path: pageRoutePath('amend'),
    options: kit.routeOptions,
    handler: amendPost
  },
  {
    method: 'POST',
    path: createPath(),
    options: kit.routeOptions,
    handler: createPost
  }
]
