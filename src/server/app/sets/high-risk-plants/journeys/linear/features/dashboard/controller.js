import {
  createPath,
  createRoutePath,
  dashboardPath,
  dashboardRoutePath,
  pagePath,
  pageRoutePath,
  startRoutePath
} from '../../../../../../shared/paths.js'
import { buildActor } from '../../../../../../../common/helpers/actor-helpers.js'
import { TEMPLATES } from '../../config.js'
import { DELETED } from '../../../../../../engine/index.js'
import {
  amendJourney,
  listKnownJourneys,
  startJourney
} from '../../../../../../engine/journey.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { commodityTypePage } from '../commodity-type/page.js'
import { notificationViewPage } from '../check-answers/page.js'
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

const organisationIdOf = (request) =>
  buildActor(request.auth?.credentials)?.organisationId

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
    deletionSucceeded: request.query?.deleted === '1',
    amendRefused: request.query?.amendRefused === '1'
  })
}

const listGet = async (request, h) => renderDashboard(request, h)

const amendPost = async (request, h) => {
  const journey = await amendJourney(request, h, request.params.journeyId)
  if (!journey) {
    return h.redirect(`${dashboardPath()}?amendRefused=1`)
  }
  request.logger.info(
    {
      journeyId: journey.journeyId,
      organisationId: organisationIdOf(request)
    },
    'Amendment started, sent to the review page'
  )
  return h.redirect(
    kit.withTrail(pagePath(journey.journeyId, notificationViewPage.slug), [
      kit.TRAIL_START.dashboard
    ])
  )
}

const openNewNotification = async (request, h, { entry, startPlace }) => {
  const journey = await startJourney(request, h)
  request.logger.info(
    {
      journeyId: journey.journeyId,
      entry,
      organisationId: organisationIdOf(request)
    },
    'New notification opened'
  )
  return h.redirect(
    kit.withTrail(pagePath(journey.journeyId, commodityTypePage.slug), [
      startPlace
    ])
  )
}

const createPost = async (request, h) =>
  openNewNotification(request, h, {
    entry: 'list-create',
    startPlace: kit.TRAIL_START.dashboard
  })

const startGet = async (request, h) =>
  (
    await openNewNotification(request, h, {
      entry: 'start',
      startPlace: kit.TRAIL_START.ins
    })
  ).header('Cache-Control', 'no-store')

export const routes = [
  {
    method: 'GET',
    path: dashboardRoutePath(),
    options: kit.pageRouteOptions(dashboardPage),
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
    path: createRoutePath(),
    options: kit.routeOptions,
    handler: createPost
  },
  {
    method: 'GET',
    path: startRoutePath(),
    options: kit.routeOptions,
    handler: startGet
  }
]
