import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  configureSession,
  knownJourneysCookie
} from '../../engine/persistence/session.js'
import { authenticatedCredentials } from '../../engine/test-support.js'
import { records as stubRecords } from '../persistence/records/stub/index.js'
import { session as stubSession } from '../persistence/session/stub.js'
import { withSetContext } from '../../shared/set-context.js'
import { designerRecords } from '../../../prototype-support/records.js'
import { SET_ID } from '../../../../../test/fixtures/index.js'
import * as notificationSearch from './index.js'

const CONTRACT = JSON.parse(
  readFileSync(
    path.join(fileURLToPath(import.meta.url), '../contract.json'),
    'utf8'
  )
)

/** The unit suite's fixture set stands in for a release: dashboard rows are
 * read through the set's obligations, and the fixture is the set every unit
 * test has configured. */
const RELEASE = SET_ID
const ORG = 'org-notification-search'
const BACKEND = 'http://localhost:8091'

const inRelease = (fn) => withSetContext(RELEASE, fn)

const requestKnowing = (journeyIds, credentials = authenticatedCredentials) =>
  inRelease(() => ({
    query: {},
    state: { [knownJourneysCookie()]: journeyIds },
    auth: { isAuthenticated: true, credentials }
  }))

describe('the stub, in stub mode', () => {
  let wrapped
  let ids

  beforeEach(async () => {
    configureSession(RELEASE, stubSession)
    wrapped = designerRecords(RELEASE, stubRecords, { persist: false })
    ids = await inRelease(async () => {
      await wrapped.clear()
      const draft = await wrapped.create()
      const submitted = await wrapped.create()
      await wrapped.finalise(submitted.journeyId)
      const deleted = await wrapped.create()
      await wrapped.softDelete(deleted.journeyId)
      // Made in the release but never opened in this browser.
      const stranger = await wrapped.create()
      return {
        draft: draft.journeyId,
        submitted: submitted.journeyId,
        deleted: deleted.journeyId,
        stranger: stranger.journeyId
      }
    })
  })

  it('Should list only what the browser knows, filtered by a status from the query string', async () => {
    const request = requestKnowing([ids.draft, ids.submitted, ids.deleted])
    const { filters } = notificationSearch.filtersFromQuery({
      status: 'submitted'
    })

    const listed = await inRelease(() =>
      notificationSearch.searchNotifications(request, { page: 1, ...filters })
    )

    expect(listed.rows.map((row) => row.journeyId)).toEqual([ids.submitted])
    expect(listed.totalElements).toBe(1)
  })

  it('Should count each status for the tabs, leaving out deleted and unknown notifications', async () => {
    const request = requestKnowing([ids.draft, ids.submitted, ids.deleted])

    const counts = await inRelease(() =>
      notificationSearch.countNotifications(request, { status: 'draft' })
    )

    expect(counts).toEqual({
      total: 2,
      byStatus: { draft: 1, submitted: 1, amend: 0 },
      late: 0,
      byTab: { all: 2, drafts: 1, submitted: 1, amended: 0 }
    })
  })

  it('Should answer empty for a signed-in user with no organisation, as the engine does', async () => {
    const request = requestKnowing([ids.draft], {})

    const listed = await inRelease(() =>
      notificationSearch.searchNotifications(request)
    )
    const counts = await inRelease(() =>
      notificationSearch.countNotifications(request)
    )

    expect(listed).toEqual({
      rows: [],
      page: 1,
      size: 0,
      totalElements: 0,
      totalPages: 0
    })
    expect(counts.total).toBe(0)
  })
})

describe('the proposed client, against the plants backend', () => {
  const originalMode = process.env.STUB_MODE
  const signedIn = { auth: { credentials: { organisationId: ORG } } }

  const notification = (overrides = {}) => ({
    referenceNumber: 'GBN-HRP-26-000123',
    status: 'SUBMITTED',
    created: '2026-09-01T10:00:00Z',
    commodity: { name: 'Rosa canina' },
    origin: { countryCode: 'NL' },
    transport: { arrivalDate: '2026-10-05' },
    lateNotificationIndicator: true,
    consignor: { name: 'Nordvik Plants AS' },
    consignee: { name: 'Green Leaf Imports Ltd' },
    ...overrides
  })

  const okResponse = (body) => ({
    ok: true,
    status: 200,
    json: async () => body
  })

  const realService = async (answer) => {
    vi.resetModules()
    process.env.STUB_MODE = 'false'
    const fetched = vi.fn(answer)
    vi.stubGlobal('fetch', fetched)
    return { service: await import('./index.js'), fetched }
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalMode === undefined) {
      delete process.env.STUB_MODE
    } else {
      process.env.STUB_MODE = originalMode
    }
  })

  it('Should ask for the filters as query parameters, with the organisation and trace headers', async () => {
    const { service, fetched } = await realService(async () =>
      okResponse({
        content: [],
        page: 1,
        size: 20,
        totalElements: 0,
        totalPages: 0
      })
    )

    await service.searchNotifications(signedIn, {
      page: 2,
      status: ['submitted'],
      tab: 'amended',
      commodity: 'rosa',
      late: true,
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31'
    })

    const [url, options] = fetched.mock.calls[0]
    const asked = new URL(url)
    expect(`${asked.origin}${asked.pathname}`).toBe(`${BACKEND}/notifications`)
    expect(asked.searchParams.getAll('status')).toEqual(['SUBMITTED', 'AMEND'])
    expect(Object.fromEntries(asked.searchParams)).toMatchObject({
      page: '2',
      sort: 'arrivalDate,desc',
      commodity: 'rosa',
      late: 'true',
      arrivalFrom: '2026-10-01',
      arrivalTo: '2026-10-31'
    })
    expect(options.headers['Trade-Imports-Organisation-Id']).toBe(ORG)
    expect(options.headers).toHaveProperty('x-cdp-request-id')
  })

  it('Should map each notification onto the dashboard row', async () => {
    const { service } = await realService(async () =>
      okResponse({
        content: [notification()],
        page: 1,
        size: 20,
        totalElements: 1,
        totalPages: 1
      })
    )

    const listed = await service.searchNotifications(signedIn)

    expect(listed.rows).toEqual([
      expect.objectContaining({
        journeyId: 'GBN-HRP-26-000123',
        status: 'submitted',
        commodity: { name: 'Rosa canina' },
        originCountryCode: 'NL',
        arrivalDate: '2026-10-05',
        lateNotificationIndicator: true,
        consignorName: 'Nordvik Plants AS',
        consigneeName: 'Green Leaf Imports Ltd'
      })
    ])
    expect(listed.totalElements).toBe(1)
  })

  it('Should turn the backend counts into counts per tab, leaving out the status filter', async () => {
    const { service, fetched } = await realService(async () =>
      okResponse({
        total: 4,
        byStatus: { DRAFT: 2, SUBMITTED: 1, AMEND: 1 },
        late: 1
      })
    )

    const counts = await service.countNotifications(signedIn, {
      status: 'draft',
      commodity: 'rosa'
    })

    const asked = new URL(fetched.mock.calls[0][0])
    expect(asked.pathname).toBe('/notifications/counts')
    expect(asked.searchParams.getAll('status')).toEqual([])
    expect(asked.searchParams.get('commodity')).toBe('rosa')
    expect(counts).toEqual({
      total: 4,
      byStatus: { draft: 2, submitted: 1, amend: 1 },
      late: 1,
      byTab: { all: 4, drafts: 2, submitted: 1, amended: 1 }
    })
  })

  it('Should raise a failure rather than show an empty dashboard', async () => {
    const { service } = await realService(async () => ({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable'
    }))

    await expect(service.searchNotifications(signedIn)).rejects.toThrow(
      'Failed to search notifications: 503 Service Unavailable'
    )
  })
})

describe('what it says it needs', () => {
  it('Should name the real service it stands in for, and its contract, in contract.json', () => {
    expect(CONTRACT.needsARealService).toMatch(/plants backend/)
    expect(CONTRACT).toMatchObject({
      service: 'notification-search',
      owner: 'plants-backend',
      baseUrlEnv: 'TRADE_IMPORTS_PLANTS_BACKEND_URL'
    })
    expect(CONTRACT.operations.map(({ name }) => name)).toEqual([
      'searchNotifications',
      'countNotifications'
    ])
  })

  it('Should export neither CONTRACT nor NEEDS_A_REAL_SERVICE from index.js', () => {
    expect(notificationSearch.CONTRACT).toBeUndefined()
    expect(notificationSearch.NEEDS_A_REAL_SERVICE).toBeUndefined()
  })
})
