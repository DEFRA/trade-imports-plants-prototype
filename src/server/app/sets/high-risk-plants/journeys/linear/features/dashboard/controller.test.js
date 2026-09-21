import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  AMEND,
  configureRecords,
  DELETED,
  DRAFT,
  records,
  SUBMITTED
} from '../../../../../../engine/persistence/records.js'
import {
  configureSession,
  SESSION_COOKIES
} from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  createPath,
  hubPath,
  pagePath
} from '../../../../../../shared/paths.js'
import { CYA_SLUG, SURFACES } from '../../../../../../shared/kit.js'
import { RUN_ACTIVE } from '../../../../../../flow/run-state.js'
import { authenticatedCredentials } from '../../../../../../engine/test-support.js'
import { commodityTypePage } from '../commodity-type/page.js'

import { routes } from './controller.js'
import { copy } from './copy/copy.en.js'

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
  (route) => route.method === 'POST' && route.path === createPath()
).handler

const buildRequest = ({
  knownJourneyIds = [],
  journeyId,
  query = {},
  openingRun,
  credentials = authenticatedCredentials
} = {}) => ({
  payload: {},
  params: journeyId ? { journeyId } : {},
  query,
  state: {
    [SESSION_COOKIES.knownJourneys]: knownJourneyIds,
    ...(openingRun ? { [SESSION_COOKIES.openingRun]: openingRun } : {})
  },
  headers: {},
  auth: { isAuthenticated: true, credentials },
  app: {}
})

const buildH = () => {
  const captured = { cookies: {} }
  return {
    view: (template, context) => {
      captured.view = { template, context }
      return captured.view
    },
    redirect: (to) => {
      captured.redirect = to
      return { redirect: to }
    },
    state: (name, value) => {
      captured.cookies[name] = value
    },
    unstate: (name) => {
      delete captured.cookies[name]
    },
    captured
  }
}

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

describe('dashboard notifications list', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should render the display surface with the page copy and the caption key', async () => {
    const h = buildH()

    await listGet(buildRequest(), h)

    expect(h.captured.view.template).toBe(
      'high-risk-plants/journeys/linear/features/dashboard/template'
    )
    expect(h.captured.view.context).toMatchObject({
      pageTitle: copy.title,
      copy,
      contentColumnClass: SURFACES.display,
      journeyStrip: null,
      startAction: createPath(),
      listAction: '/'
    })
    expect(h.captured.view.context).toHaveProperty('caption')
    expect(h.captured.view.context.hubHref).toBeUndefined()
  })

  it('Should supply no guidance URL, so the guidance sentence cannot render', async () => {
    const h = buildH()

    await listGet(buildRequest(), h)

    expect(h.captured.view.context).not.toHaveProperty('guidanceUrl')
  })

  it('Should show the empty state when the session knows no journeys', async () => {
    const h = buildH()

    await listGet(buildRequest(), h)

    expect(h.captured.view.context.notificationRows).toEqual([])
    expect(h.captured.view.context.resultsLabel).toBe(
      copy.pagination.results.none
    )
  })

  it('Should answer an empty list when the session carries no organisation', async () => {
    const draft = await startDraft()
    const h = buildH()

    await listGet(
      buildRequest({
        knownJourneyIds: [draft.journeyId],
        credentials: { contactId: 1, name: 'No org' }
      }),
      h
    )

    expect(h.captured.view.context.notificationRows).toEqual([])
  })

  it('Should list ONLY session-known journeys — never the wider store', async () => {
    const known = await startDraft()
    await startDraft()
    const h = buildH()

    await listGet(buildRequest({ knownJourneyIds: [known.journeyId] }), h)

    expect(
      h.captured.view.context.notificationRows.map((row) => row.reference)
    ).toEqual([known.journeyId])
  })

  it('Should keep deleted journeys absent from the list', async () => {
    const deleted = await records.create()
    await records.softDelete(deleted.journeyId)
    const h = buildH()

    await listGet(buildRequest({ knownJourneyIds: [deleted.journeyId] }), h)

    expect(h.captured.view.context.notificationRows).toEqual([])
    expect((await records.load({ journeyId: deleted.journeyId })).status).toBe(
      DELETED
    )
  })

  it('Should default an unrecognised sort and an out-of-range page', async () => {
    const draft = await startDraft()
    const h = buildH()

    await listGet(
      buildRequest({
        knownJourneyIds: [draft.journeyId],
        query: { page: '-4', sort: 'reference,sideways' }
      }),
      h
    )

    expect(h.captured.view.context).toMatchObject({
      currentPage: 1,
      sort: 'arrivalDate,desc',
      resultsLabel: copy.pagination.results.one
    })
  })

  it('Should mark the selected sort option so the select renders it', async () => {
    const h = buildH()

    await listGet(
      buildRequest({ query: { sort: CREATED_AT_ASCENDING_SORT } }),
      h
    )

    expect(h.captured.view.context.sortOptions).toEqual([
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
    const h = buildH()

    await listGet(
      buildRequest({
        knownJourneyIds: [first.journeyId, second.journeyId],
        query: {
          sort: CREATED_AT_ASCENDING_SORT,
          referenceNumber: `  ${second.journeyId}  `
        }
      }),
      h
    )

    expect(h.captured.view.context).toMatchObject({
      referenceNumber: second.journeyId,
      sort: CREATED_AT_ASCENDING_SORT,
      resultsLabel: copy.pagination.results.one
    })
    expect(
      h.captured.view.context.notificationRows.map((row) => row.reference)
    ).toEqual([second.journeyId])
  })

  it('Should swap in the no-results label when a search matches nothing', async () => {
    const draft = await startDraft()
    const h = buildH()

    await listGet(
      buildRequest({
        knownJourneyIds: [draft.journeyId],
        query: { referenceNumber: '26-ZZZZZZ' }
      }),
      h
    )

    expect(h.captured.view.context).toMatchObject({
      notificationRows: [],
      referenceNumber: '26-ZZZZZZ',
      resultsLabel: copy.search.noResults,
      pagination: null
    })
  })

  it('Should page at the twenty-row boundary and preserve the sort in both links', async () => {
    const knownJourneyIds = await seedDrafts(OVER_ONE_PAGE)
    const firstPage = buildH()
    const secondPage = buildH()

    await listGet(
      buildRequest({
        knownJourneyIds,
        query: { sort: CREATED_AT_ASCENDING_SORT }
      }),
      firstPage
    )
    await listGet(
      buildRequest({
        knownJourneyIds,
        query: { page: '2', sort: CREATED_AT_ASCENDING_SORT }
      }),
      secondPage
    )

    expect(firstPage.captured.view.context).toMatchObject({
      currentPage: 1,
      resultsLabel: copy.pagination.results.many(1, PAGE_SIZE, OVER_ONE_PAGE)
    })
    expect(firstPage.captured.view.context.pagination.next.href).toBe(
      '/?page=2&sort=createdAt%2Casc'
    )
    expect(secondPage.captured.view.context).toMatchObject({
      currentPage: 2,
      resultsLabel: copy.pagination.results.oneOf(OVER_ONE_PAGE, OVER_ONE_PAGE)
    })
    expect(secondPage.captured.view.context.pagination.previous.href).toBe(
      '/?sort=createdAt%2Casc'
    )
    expect(secondPage.captured.view.context.pagination.next).toBeUndefined()
  })

  it('Should clamp a page number beyond the last page', async () => {
    const knownJourneyIds = await seedDrafts(OVER_ONE_PAGE)
    const h = buildH()

    await listGet(buildRequest({ knownJourneyIds, query: { page: '9' } }), h)

    expect(h.captured.view.context.currentPage).toBe(2)
    expect(h.captured.view.context.notificationRows).toHaveLength(1)
    expect(h.captured.view.context.resultsLabel).toBe(
      copy.pagination.results.oneOf(OVER_ONE_PAGE, OVER_ONE_PAGE)
    )
  })
})

describe('dashboard row actions', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should give a draft a Draft tag, its created date and Resume plus Delete', async () => {
    const draft = await startDraft()
    const h = buildH()

    await listGet(buildRequest({ knownJourneyIds: [draft.journeyId] }), h)

    const [row] = h.captured.view.context.notificationRows
    expect(row.status).toEqual({ text: 'Draft', classes: 'govuk-tag--blue' })
    expect(row.created).toMatch(/^\d{1,2} \w{3} \d{4}$/)
    expect(row.submitted).toBe('')
    expect(textOf(row)).toEqual([RESUME_ACTION, DELETE_ACTION])
    expect(row.actions[0].href).toBe(hubPath(draft.journeyId))
    expect(row.actions[1].href).toBe(pagePath(draft.journeyId, 'delete'))
  })

  it('Should give a submitted notification View, an Amend POST and Delete', async () => {
    const submitted = await startSubmitted()
    const h = buildH()

    await listGet(buildRequest({ knownJourneyIds: [submitted.journeyId] }), h)

    const [row] = h.captured.view.context.notificationRows
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
    await amendPost(
      buildRequest({
        knownJourneyIds: [submitted.journeyId],
        journeyId: submitted.journeyId
      }),
      buildH()
    )
    const h = buildH()

    await listGet(buildRequest({ knownJourneyIds: [submitted.journeyId] }), h)

    const [row] = h.captured.view.context.notificationRows
    expect(row.status).toEqual({
      text: 'Amending',
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
    const h = buildH()

    await listGet(
      buildRequest({
        knownJourneyIds: [draft.journeyId, submitted.journeyId]
      }),
      h
    )

    for (const row of h.captured.view.context.notificationRows) {
      expect(textOf(row)).not.toContain('Copy as new')
    }
  })

  it('Should leave the card title to name the link actions and suffix only the button', async () => {
    const submitted = await startSubmitted()
    const h = buildH()

    await listGet(buildRequest({ knownJourneyIds: [submitted.journeyId] }), h)

    const [row] = h.captured.view.context.notificationRows
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

describe('dashboard rows the records port supplies', () => {
  const listing = (rows) => ({
    ...recordsStub,
    list: async () => ({
      rows,
      page: 1,
      size: PAGE_SIZE,
      totalElements: rows.length,
      totalPages: 1
    })
  })

  beforeAll(() => configureSession(sessionStub))
  afterEach(() => configureRecords(recordsStub))

  it('Should drop a DELETED row the port still returns', async () => {
    configureRecords(
      listing([
        { journeyId: '26-ABC123', reference: '26-ABC123', status: DELETED },
        { journeyId: '26-DEF456', reference: '26-DEF456', status: DRAFT }
      ])
    )
    const h = buildH()

    await listGet(buildRequest(), h)

    expect(
      h.captured.view.context.notificationRows.map((row) => row.reference)
    ).toEqual(['26-DEF456'])
  })

  it('Should carry the display cells and the late flag through to the view', async () => {
    configureRecords(
      listing([
        {
          journeyId: '26-DEF456',
          reference: '26-DEF456',
          status: DRAFT,
          lateNotificationIndicator: true,
          commodity: { name: 'Potatoes' },
          originCountryCode: 'FR',
          arrivalDate: '2026-03-05',
          consignorName: 'Acme Ltd'
        }
      ])
    )
    const h = buildH()

    await listGet(buildRequest(), h)

    expect(h.captured.view.context.notificationRows[0]).toMatchObject({
      late: true,
      commodity: 'Potatoes',
      origin: 'France',
      arrival: '5 Mar 2026',
      consignor: 'Acme Ltd'
    })
  })
})

describe('dashboard banners', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should raise the deleted banner only after a delete redirect', async () => {
    const ordinary = buildH()
    const deleted = buildH()

    await listGet(buildRequest(), ordinary)
    await listGet(buildRequest({ query: { deleted: '1' } }), deleted)

    expect(ordinary.captured.view.context.deletionSucceeded).toBe(false)
    expect(deleted.captured.view.context.deletionSucceeded).toBe(true)
  })

  it('Should leave the copied banner dormant', async () => {
    const h = buildH()

    await listGet(buildRequest({ query: { copied: '1' } }), h)

    expect(h.captured.view.context).not.toHaveProperty('copySucceeded')
  })
})

describe('dashboard amend POST', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should unfreeze a known submitted notification and land on its hub', async () => {
    const submitted = await startSubmitted()
    const h = buildH()

    await amendPost(
      buildRequest({
        knownJourneyIds: [submitted.journeyId],
        journeyId: submitted.journeyId
      }),
      h
    )

    expect(h.captured.redirect).toBe(hubPath(submitted.journeyId))
    expect(
      (await records.load({ journeyId: submitted.journeyId })).status
    ).toBe(AMEND)
  })

  it('Should bounce an amend the session does not know back to the dashboard', async () => {
    const submitted = await startSubmitted()
    const h = buildH()

    await amendPost(
      buildRequest({ knownJourneyIds: [], journeyId: submitted.journeyId }),
      h
    )

    expect(h.captured.redirect).toBe('/')
    expect(
      (await records.load({ journeyId: submitted.journeyId })).status
    ).toBe(SUBMITTED)
  })
})

describe('dashboard create POST', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should start a notification, begin its opening run and land on its first question', async () => {
    const h = buildH()

    await startPost(buildRequest(), h)

    const newJourneyId =
      h.captured.cookies[SESSION_COOKIES.knownJourneys].at(-1)
    expect(h.captured.redirect).toBe(
      pagePath(newJourneyId, commodityTypePage.slug)
    )
    expect(h.captured.cookies[SESSION_COOKIES.openingRun]).toEqual({
      [newJourneyId]: RUN_ACTIVE
    })
  })

  it('Should keep an earlier notification listed alongside the new one', async () => {
    const oldDraft = await startDraft()
    const h = buildH()

    await startPost(buildRequest({ knownJourneyIds: [oldDraft.journeyId] }), h)

    const knownJourneyIds = h.captured.cookies[SESSION_COOKIES.knownJourneys]
    expect(knownJourneyIds).toHaveLength(2)
    expect(knownJourneyIds[0]).toBe(oldDraft.journeyId)
  })
})
