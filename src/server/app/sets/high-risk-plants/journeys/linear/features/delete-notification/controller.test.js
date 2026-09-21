import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { pagePath } from '../../../../../../shared/paths.js'
import {
  configureRecords,
  DELETED,
  DRAFT,
  records
} from '../../../../../../engine/persistence/records.js'
import { SESSION_COOKIES } from '../../../../../../engine/journey.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { journeyRequest, stubH } from '../../../../../../engine/test-support.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { records as realRecords } from '../../../../../../services/persistence/records/real/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { routes } from './controller.js'

const get = routes.find((route) => route.method === 'GET').handler
const post = routes.find((route) => route.method === 'POST').handler

const view =
  'high-risk-plants/journeys/linear/features/delete-notification/template'

// The real session writes known journeys through h.request.yar, so a read later
// in the same request sees the id currentJourney adopted. stubH's no-op state()
// hides that, so this toolkit writes the adoption back onto the request.
const adoptingH = (request) => ({
  ...stubH(),
  state: (name, value) => {
    request.state[name] = value
  }
})

describe('delete notification routes', () => {
  beforeAll(() => {
    configureSession(sessionStub)
  })

  beforeEach(() => {
    configureRecords(recordsStub)
    records.clear()
  })

  afterEach(() => {
    configureRecords(recordsStub)
    vi.unstubAllGlobals()
  })

  it('Should render a journey-scoped irreversible confirmation', async () => {
    const journey = await records.create()

    const response = await get(journeyRequest(journey.journeyId), stubH())

    expect(response.view).toBe(view)
    expect(response.context).toMatchObject({
      heading: 'Delete this notification?',
      deleteAction: pagePath(journey.journeyId, 'delete'),
      noHref: '/'
    })
    expect(response.context.copy.body).toBe('This cannot be undone.')
  })

  it('Should soft-delete and redirect to the dashboard success banner', async () => {
    const journey = await records.create()

    const response = await post(journeyRequest(journey.journeyId), stubH())

    expect(response).toEqual({ redirect: '/?deleted=1' })
    expect((await records.load({ journeyId: journey.journeyId })).status).toBe(
      DELETED
    )
    expect(
      (await records.list({ journeyIds: [journey.journeyId] })).rows
    ).toEqual([])
  })

  it('Should handle an already-deleted journey without another transition', async () => {
    const journey = await records.create()
    await records.softDelete(journey.journeyId)

    expect(await get(journeyRequest(journey.journeyId), stubH())).toEqual({
      redirect: '/'
    })
    expect(await post(journeyRequest(journey.journeyId), stubH())).toEqual({
      redirect: '/'
    })
  })

  it('Should refuse to disclose or delete a journey the session does not hold', async () => {
    const journey = await records.create()
    const foreign = () =>
      journeyRequest(journey.journeyId, {
        state: { [SESSION_COOKIES.knownJourneys]: [] }
      })
    const getRequest = foreign()
    const postRequest = foreign()

    expect(await get(getRequest, adoptingH(getRequest))).toEqual({
      redirect: '/'
    })
    expect(await post(postRequest, adoptingH(postRequest))).toEqual({
      redirect: '/'
    })
    expect((await records.load({ journeyId: journey.journeyId })).status).toBe(
      DRAFT
    )
  })

  it('Should re-render confirmation at 500 with the recoverable-save banner after a backend failure', async () => {
    configureRecords({
      ...recordsStub,
      softDelete: realRecords.softDelete
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      }))
    )
    const journey = await records.create()

    const response = await post(journeyRequest(journey.journeyId), stubH())

    expect(response.statusCode).toBe(500)
    expect(response.context.recoverableError).toBe(true)
    expect(response.view).toBe(view)
  })
})
