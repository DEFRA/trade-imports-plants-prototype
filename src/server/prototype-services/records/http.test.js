import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  registerJourneyCookie,
  startJourney
} from '../../app/engine/journey.js'
import {
  configureRecords,
  records
} from '../../app/engine/persistence/records.js'
import { configureSession } from '../../app/engine/persistence/session.js'
import { registerTestSessionAuth } from '../../app/engine/test-support.js'
import { records as stubRecords } from '../../app/services/persistence/records/stub/index.js'
import { session as stubSession } from '../../app/services/persistence/session/stub.js'
import {
  routeWithSetContext,
  withSetContext
} from '../../app/shared/set-context.js'
import { SET_BASE, SET_ID } from '../../../../test/fixtures/index.js'
import {
  countKnown,
  designerRecords,
  filtersFromQuery,
  listKnownWithFilters
} from './index.js'

/**
 * A release's dashboard, cut down to what the wrapper touches: a create
 * route that starts a notification the way the real dashboard does, and a
 * list route that reads its filters from the query string the way a release's
 * dashboard controller is told to (docs/designers/services-and-dashboards.md).
 * The unit suite's fixture set stands in for the release.
 */
const releaseRoutes = [
  {
    method: 'POST',
    path: '/notifications',
    options: { auth: 'session' },
    handler: async (request, h) => {
      const journey = await startJourney(request, h)
      if (request.query.submit === 'yes') {
        await records.finalise(journey.journeyId)
      }
      return h.response({ journeyId: journey.journeyId })
    }
  },
  {
    method: 'GET',
    path: '/',
    options: { auth: 'session' },
    handler: async (request) => {
      const { filters, errors } = filtersFromQuery(request.query)
      const listed = await listKnownWithFilters(request, {
        page: 1,
        ...filters
      })
      return {
        journeyIds: listed.rows.map((row) => row.journeyId),
        counts: await countKnown(request, filters),
        errors
      }
    }
  }
]

const release = {
  plugin: {
    name: 'fake-a-service-http-test',
    register: (server) => {
      withSetContext(SET_ID, () => {
        const wrapped = designerRecords(SET_ID, stubRecords, { persist: false })
        configureRecords(SET_ID, wrapped)
        configureSession(SET_ID, stubSession)
        registerJourneyCookie(server)
        server.route(
          releaseRoutes.map((route) => routeWithSetContext(SET_ID, route))
        )
      })
    }
  }
}

/** The name=value pairs a response set, ready to send back as a Cookie. */
const cookiesFrom = (response) =>
  [response.headers['set-cookie'] ?? []]
    .flat()
    .map((header) => header.split(';')[0])
    .join('; ')

describe('a release dashboard with a status filter and counts, over HTTP', () => {
  let server
  let cookie = ''

  const create = async (query = '') => {
    const response = await server.inject({
      method: 'POST',
      url: `${SET_BASE}/notifications${query}`,
      headers: cookie ? { cookie } : {}
    })
    cookie = cookiesFrom(response) || cookie
    return response.result.journeyId
  }

  const dashboard = async (query) => {
    const response = await server.inject({
      method: 'GET',
      url: `${SET_BASE}${query}`,
      headers: { cookie }
    })
    return response.result
  }

  beforeAll(async () => {
    server = Hapi.server()
    registerTestSessionAuth(server)
    await server.register(release, { routes: { prefix: SET_BASE } })
    await server.initialize()
    await withSetContext(SET_ID, () => records.clear())
  })

  afterAll(async () => {
    await server.stop()
  })

  it('Should list only the submitted notifications, with a count for every tab', async () => {
    const draft = await create()
    const submitted = await create('?submit=yes')
    const alsoSubmitted = await create('?submit=yes')

    const filtered = await dashboard('?status=submitted')

    const expected = [submitted, alsoSubmitted].sort()
    expect([...filtered.journeyIds].sort()).toEqual(expected)
    expect(filtered.journeyIds).not.toContain(draft)
    expect(filtered.counts).toMatchObject({
      total: 3,
      byStatus: { draft: 1, submitted: 2, amend: 0 },
      byTab: { all: 3, drafts: 1, submitted: 2, amended: 0 }
    })
  })

  it('Should show the empty state when nothing matches', async () => {
    const empty = await dashboard('?status=amend')

    expect(empty.journeyIds).toEqual([])
    expect(empty.counts.total).toBe(3)
  })

  it('Should report a date the user got wrong, for the error state', async () => {
    const refused = await dashboard(
      '?dateFrom-day=31&dateFrom-month=2&dateFrom-year=2026'
    )

    expect(refused.errors).toEqual({ dateFrom: 'invalid' })
    expect(refused.journeyIds).toHaveLength(3)
  })
})
