import { SET_BASE, SET_ID } from '../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

import {
  AMEND,
  configureRecords,
  DELETED,
  records
} from '../../../../../../engine/persistence/records.js'
import {
  configureSession,
  knownJourneysCookie,
  openingRunCookie
} from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { records as recordsReal } from '../../../../../../services/persistence/records/real/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  createPath,
  createRoutePath,
  hubPath,
  pagePath
} from '../../../../../../shared/paths.js'
import { CYA_SLUG, SURFACES } from '../../../../../../shared/kit.js'
import { RUN_ACTIVE } from '../../../../../../flow/run-state.js'
import { journeyRequest, stubH } from '../../../../../../engine/test-support.js'
import { commodityTypePage } from '../commodity-type/page.js'

import { routes } from './controller.js'
import { copy } from './copy/copy.en.js'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const CREATED_AT_ASCENDING_SORT = 'createdAt,asc'
const DELETE_ACTION = 'Delete'
const RESUME_ACTION = 'Resume'
const PAGE_SIZE = 20
const OVER_ONE_PAGE = PAGE_SIZE + 1

const handlerOf = (method, pathSuffix) =>
  routes.find(
    (route) => route.method === method && route.path.endsWith(pathSuffix)
  ).handler

const listGet = handlerOf('GET', '/')
const amendPost = handlerOf('POST', '/amend')
const startPost = routes.find(
  (route) => route.method === 'POST' && route.path === createRoutePath()
).handler

const startDraft = async () => records.create()

const startSubmitted = async () => {
  const journey = await records.create()
  await records.finalise(journey.journeyId)
  return records.load({ journeyId: journey.journeyId })
}

const seedDrafts = async (count) => {
  const journeys = await Promise.all(
    Array.from({ length: count }, () => startDraft())
  )
  return journeys.map((journey) => journey.journeyId)
}

const textOf = (row) => row.actions.map((action) => action.text)

const renderListView = async (overrides = {}) => {
  const request = journeyRequest(undefined, overrides)
  const h = stubH(request)
  await listGet(request, h)
  return h.captured.view
}

const renderList = async (overrides = {}) =>
  (await renderListView(overrides)).context

const postAmend = async (journeyId, overrides = {}) => {
  const request = journeyRequest(journeyId, overrides)
  const h = stubH(request)
  const response = await amendPost(request, h)
  return { response, h }
}

const referencesOf = (context) =>
  context.notificationRows.map((row) => row.reference)

describe('dashboard notifications list', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should render the display surface with the page copy and the caption key', async () => {
    const view = await renderListView()

    expect(view.view).toBe(
      'high-risk-plants/journeys/linear/features/dashboard/template'
    )
    expect(view.context).toMatchObject({
      pageTitle: copy.title,
      copy,
      contentColumnClass: SURFACES.display,
      journeyStrip: null,
      startAction: createPath(),
      listAction: SET_BASE
    })
    expect(view.context).toHaveProperty('caption')
    expect(view.context.hubHref).toBeUndefined()
  })

  it('Should supply no guidance URL, so the guidance sentence cannot render', async () => {
    const context = await renderList()

    expect(context).not.toHaveProperty('guidanceUrl')
  })

  it('Should show the empty state when the session knows no journeys', async () => {
    const context = await renderList()

    expect(context.notificationRows).toEqual([])
    expect(context.resultsLabel).toBe(copy.pagination.results.none)
  })

  it('Should still list known journeys when the session carries no organisation', async () => {
    const draft = await startDraft()

    const context = await renderList({
      knownJourneyIds: [draft.journeyId],
      auth: {
        isAuthenticated: true,
        credentials: { contactId: 1, name: 'No org' }
      }
    })

    expect(referencesOf(context)).toEqual([draft.journeyId])
  })

  it('Should list ONLY session-known journeys — never the wider store', async () => {
    const known = await startDraft()
    await startDraft()

    const context = await renderList({ knownJourneyIds: [known.journeyId] })

    expect(referencesOf(context)).toEqual([known.journeyId])
  })

  it('Should keep deleted journeys absent from the list', async () => {
    const deleted = await records.create()
    await records.softDelete(deleted.journeyId)

    const context = await renderList({ knownJourneyIds: [deleted.journeyId] })

    expect(context.notificationRows).toEqual([])
    expect((await records.load({ journeyId: deleted.journeyId })).status).toBe(
      DELETED
    )
  })

  it('Should default an unrecognised sort and an out-of-range page', async () => {
    const draft = await startDraft()

    const context = await renderList({
      knownJourneyIds: [draft.journeyId],
      query: { page: '-4', sort: 'reference,sideways' }
    })

    expect(context).toMatchObject({
      currentPage: 1,
      sort: 'arrivalDate,desc',
      resultsLabel: copy.pagination.results.one
    })
  })

  it('Should mark the selected sort option so the select renders it', async () => {
    const context = await renderList({
      query: { sort: CREATED_AT_ASCENDING_SORT }
    })

    expect(context.sortOptions).toEqual([
      {
        value: 'arrivalDate,desc',
        text: copy.sort.options.arrivalNewest,
        selected: false
      },
      {
        value: 'arrivalDate,asc',
        text: copy.sort.options.arrivalOldest,
        selected: false
      },
      {
        value: 'createdAt,desc',
        text: copy.sort.options.createdNewest,
        selected: false
      },
      {
        value: CREATED_AT_ASCENDING_SORT,
        text: copy.sort.options.createdOldest,
        selected: true
      }
    ])
  })

  it('Should trim a reference search, pass it to the list and preserve the sort', async () => {
    const first = await startDraft()
    const second = await startDraft()

    const context = await renderList({
      knownJourneyIds: [first.journeyId, second.journeyId],
      query: {
        sort: CREATED_AT_ASCENDING_SORT,
        referenceNumber: `  ${second.journeyId}  `
      }
    })

    expect(context).toMatchObject({
      referenceNumber: second.journeyId,
      sort: CREATED_AT_ASCENDING_SORT,
      resultsLabel: copy.pagination.results.one
    })
    expect(referencesOf(context)).toEqual([second.journeyId])
  })

  it('Should swap in the no-results label when a search matches nothing', async () => {
    const draft = await startDraft()

    const context = await renderList({
      knownJourneyIds: [draft.journeyId],
      query: { referenceNumber: '26-ZZZZZZ' }
    })

    expect(context).toMatchObject({
      notificationRows: [],
      referenceNumber: '26-ZZZZZZ',
      resultsLabel: copy.search.noResults,
      pagination: null
    })
  })

  it('Should page at the twenty-row boundary and preserve the sort in both links', async () => {
    const known = { knownJourneyIds: await seedDrafts(OVER_ONE_PAGE) }

    const firstPage = await renderList({
      ...known,
      query: { sort: CREATED_AT_ASCENDING_SORT }
    })
    const secondPage = await renderList({
      ...known,
      query: { page: '2', sort: CREATED_AT_ASCENDING_SORT }
    })

    expect(firstPage).toMatchObject({
      currentPage: 1,
      resultsLabel: copy.pagination.results.many(1, PAGE_SIZE, OVER_ONE_PAGE)
    })
    expect(firstPage.pagination.next.href).toBe(
      `${SET_BASE}?page=2&sort=createdAt%2Casc`
    )
    expect(secondPage).toMatchObject({
      currentPage: 2,
      resultsLabel: copy.pagination.results.oneOf(OVER_ONE_PAGE, OVER_ONE_PAGE)
    })
    expect(secondPage.pagination.previous.href).toBe(
      `${SET_BASE}?sort=createdAt%2Casc`
    )
    expect(secondPage.pagination.next).toBeUndefined()
  })

  it('Should clamp a page number beyond the last page', async () => {
    const known = { knownJourneyIds: await seedDrafts(OVER_ONE_PAGE) }

    const context = await renderList({ ...known, query: { page: '9' } })

    expect(context.currentPage).toBe(2)
    expect(context.notificationRows).toHaveLength(1)
    expect(context.resultsLabel).toBe(
      copy.pagination.results.oneOf(OVER_ONE_PAGE, OVER_ONE_PAGE)
    )
  })
})

describe('dashboard row actions', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should give a draft a Draft tag, its created date and Resume plus Delete', async () => {
    const draft = await startDraft()

    const context = await renderList({ knownJourneyIds: [draft.journeyId] })

    const [row] = context.notificationRows
    expect(row.status).toEqual({ text: 'Draft', classes: 'govuk-tag--blue' })
    expect(row.created).toMatch(/^\d{1,2} \w{3} \d{4}$/)
    expect(row.submitted).toBe('')
    expect(textOf(row)).toEqual([RESUME_ACTION, DELETE_ACTION])
    expect(row.actions[0].href).toBe(hubPath(draft.journeyId))
    expect(row.actions[1].href).toBe(pagePath(draft.journeyId, 'delete'))
  })

  it('Should give a submitted notification View, an Amend POST and Delete', async () => {
    const submitted = await startSubmitted()

    const context = await renderList({ knownJourneyIds: [submitted.journeyId] })

    const [row] = context.notificationRows
    expect(row.status).toEqual({
      text: 'Submitted',
      classes: 'govuk-tag--green'
    })
    expect(row.submitted).toMatch(/^\d{1,2} \w{3} \d{4}$/)
    expect(textOf(row)).toEqual(['View', 'Amend', DELETE_ACTION])
    expect(row.actions[0].href).toBe(pagePath(submitted.journeyId, CYA_SLUG))
    expect(row.actions[1].postAction).toBe(
      pagePath(submitted.journeyId, 'amend')
    )
    expect(row.actions[1].href).toBeUndefined()
    expect(row.actions[2].href).toBe(pagePath(submitted.journeyId, 'delete'))
  })

  it('Should give an amending notification Resume, Cancel amendment and Delete', async () => {
    const submitted = await startSubmitted()
    await postAmend(submitted.journeyId)

    const context = await renderList({ knownJourneyIds: [submitted.journeyId] })

    const [row] = context.notificationRows
    expect(row.status).toEqual({
      text: 'Amend',
      classes: 'govuk-tag--yellow'
    })
    expect(textOf(row)).toEqual([
      RESUME_ACTION,
      'Cancel amendment',
      DELETE_ACTION
    ])
    expect(row.actions[1].href).toBe(
      pagePath(submitted.journeyId, 'cancel-amend')
    )
  })

  it('Should offer no Copy as new action on any status', async () => {
    const draft = await startDraft()
    const submitted = await startSubmitted()

    const context = await renderList({
      knownJourneyIds: [draft.journeyId, submitted.journeyId]
    })

    for (const row of context.notificationRows) {
      expect(textOf(row)).not.toContain('Copy as new')
    }
  })

  it('Should leave the card title to name the link actions and suffix only the button', async () => {
    const submitted = await startSubmitted()

    const context = await renderList({ knownJourneyIds: [submitted.journeyId] })

    const [row] = context.notificationRows
    expect(
      row.actions
        .filter((action) => action.href)
        .every((action) => action.visuallyHiddenText === undefined)
    ).toBe(true)
    expect(
      row.actions.find((action) => action.postAction).visuallyHiddenText
    ).toBe(copy.actionHidden(row.reference))
  })
})

describe('dashboard rows the backend supplies', () => {
  const backendRow = (referenceNumber, status, fields = {}) => ({
    referenceNumber,
    status,
    created: '2026-07-14T09:00:00',
    submittedAt: null,
    ...fields
  })

  const backendListing = (content) =>
    JSON.stringify({
      page: 1,
      size: PAGE_SIZE,
      totalElements: content.length,
      totalPages: 1,
      content
    })

  beforeAll(() => {
    configureRecords(SET_ID, recordsReal)
    configureSession(SET_ID, sessionStub)
  })
  beforeEach(() => {
    fetchMocker.mockClear()
  })

  it('Should drop a DELETED row the backend still returns', async () => {
    fetchMocker.mockResponse(
      backendListing([
        backendRow('26-ABC123', 'DELETED'),
        backendRow('26-DEF456', 'DRAFT')
      ])
    )

    const context = await renderList()

    expect(referencesOf(context)).toEqual(['26-DEF456'])
  })

  it('Should carry the display cells through to the view', async () => {
    fetchMocker.mockResponse(
      backendListing([
        backendRow('26-DEF456', 'DRAFT', {
          commodity: { name: 'Potatoes' },
          origin: { countryCode: 'FR' },
          transport: { arrivalDate: '2026-03-05' },
          consignor: { name: 'Acme Ltd' }
        })
      ])
    )

    const context = await renderList()

    expect(context.notificationRows[0]).toMatchObject({
      commodity: 'Potatoes',
      origin: 'France',
      arrival: '5 Mar 2026',
      consignor: 'Acme Ltd'
    })
  })
})

describe('dashboard banners', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should raise the deleted banner only after a delete redirect', async () => {
    const ordinary = await renderList()
    const deleted = await renderList({ query: { deleted: '1' } })

    expect(ordinary.deletionSucceeded).toBe(false)
    expect(deleted.deletionSucceeded).toBe(true)
  })

  it('Should raise the amend-refused banner only after a refused-amend redirect', async () => {
    const ordinary = await renderList()
    const refused = await renderList({ query: { amendRefused: '1' } })

    expect(ordinary.amendRefused).toBe(false)
    expect(refused.amendRefused).toBe(true)
  })
})

describe('dashboard amend POST', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should unfreeze a known submitted notification and land on its hub', async () => {
    const submitted = await startSubmitted()

    const { response } = await postAmend(submitted.journeyId)

    expect(response.redirect).toBe(hubPath(submitted.journeyId))
    expect(
      (await records.load({ journeyId: submitted.journeyId })).status
    ).toBe(AMEND)
  })

  it('Should open an amend for a submitted notification the session does not know at its hub and leave it amending', async () => {
    const submitted = await startSubmitted()

    const { response } = await postAmend(submitted.journeyId, {
      knownJourneyIds: []
    })

    expect(response.redirect).toBe(hubPath(submitted.journeyId))
    expect(
      (await records.load({ journeyId: submitted.journeyId })).status
    ).toBe(AMEND)
  })

  it('Should send an amend for a deleted notification back to the dashboard carrying the amend-refused flag', async () => {
    const deleted = await records.create()
    await records.softDelete(deleted.journeyId)

    const { response } = await postAmend(deleted.journeyId)

    expect(response.redirect).toBe(`${SET_BASE}?amendRefused=1`)
    expect((await records.load({ journeyId: deleted.journeyId })).status).toBe(
      DELETED
    )
  })
})

describe('dashboard create POST', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should start a notification, begin its opening run and land on its first question', async () => {
    const request = journeyRequest()
    const h = stubH(request)

    const response = await startPost(request, h)

    const newJourneyId = h.cookies[knownJourneysCookie()].at(-1)
    expect(response.redirect).toBe(
      pagePath(newJourneyId, commodityTypePage.slug)
    )
    expect(h.cookies[openingRunCookie()]).toEqual({
      [newJourneyId]: RUN_ACTIVE
    })
  })

  it('Should keep an earlier notification listed alongside the new one', async () => {
    const oldDraft = await startDraft()
    const request = journeyRequest(undefined, {
      knownJourneyIds: [oldDraft.journeyId]
    })
    const h = stubH(request)

    await startPost(request, h)

    const knownJourneyIds = h.cookies[knownJourneysCookie()]
    expect(knownJourneyIds).toHaveLength(2)
    expect(knownJourneyIds[0]).toBe(oldDraft.journeyId)
  })
})
