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
import { assembleFulfilments } from '../../../../../../bridge/assemble-fulfilments.js'
import { projectAnswers } from '../../../../../../bridge/fulfilments/index.js'
import { installHighRiskPlantsJourney } from '../../test-support.js'
import {
  AMEND,
  configureRecords,
  records,
  SUBMITTED
} from '../../../../../../engine/persistence/records.js'
import {
  configureSession,
  SESSION_COOKIES
} from '../../../../../../engine/persistence/session.js'
import { store } from '../../../../../../engine/store.js'
import { journeyRequest, stubH } from '../../../../../../engine/test-support.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { records as realRecords } from '../../../../../../services/persistence/records/real/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import * as cancelAmend from './controller.js'

const NOTIFICATION_VIEW_SLUG = 'notification-view'

const get = cancelAmend.routes.find((route) => route.method === 'GET').handler
const post = cancelAmend.routes.find((route) => route.method === 'POST').handler

// The real session writes known journeys through h.request.yar, so a read later
// in the same request sees the id currentJourney adopted. stubH's no-op state()
// hides that, so this toolkit writes the adoption back onto the request.
const adoptingH = (request) => ({
  ...stubH(),
  state: (name, value) => {
    request.state[name] = value
  }
})

const startAmend = async () => {
  const journey = await store.create()
  await records.replaceFulfilment(
    journey.journeyId,
    assembleFulfilments({ producerIdentificationNumber: 'SubmittedRef' })
  )
  const submitted = await records.finalise(journey.journeyId)
  await records.amend(journey.journeyId)
  await records.replaceFulfilment(
    journey.journeyId,
    assembleFulfilments({ producerIdentificationNumber: 'AmendedRef' })
  )
  return { journeyId: journey.journeyId, submittedAt: submitted.submittedAt }
}

describe('cancel amendment routes', () => {
  beforeAll(() => {
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })

  beforeEach(() => {
    configureRecords(recordsStub)
    store.clear()
  })

  afterEach(() => {
    configureRecords(recordsStub)
    vi.unstubAllGlobals()
  })

  it('Should render the confirmation for an amending journey with journey-scoped actions', async () => {
    const { journeyId } = await startAmend()
    const h = stubH()

    const response = await get(journeyRequest(journeyId), h)

    expect(response.view).toBe(
      'high-risk-plants/journeys/linear/features/cancel-amend/template'
    )
    expect(response.context).toMatchObject({
      heading: 'Cancel this amendment?',
      cancelAction: pagePath(journeyId, 'cancel-amend'),
      noHref: pagePath(journeyId, NOTIFICATION_VIEW_SLUG)
    })
    expect(response.context.copy.body).toContain('submitted version restored')
  })

  it('Should cancel AMEND, restore submitted content and redirect to the read-only CYA with success', async () => {
    const { journeyId, submittedAt } = await startAmend()

    const response = await post(journeyRequest(journeyId), stubH())

    expect(response).toEqual({
      redirect: `${pagePath(journeyId, NOTIFICATION_VIEW_SLUG)}?cancelled=1`
    })
    const restored = await records.load({ journeyId })
    expect(restored.status).toBe(SUBMITTED)
    expect(restored.submittedAt).toBe(submittedAt)
    expect(
      projectAnswers(restored.fulfilment).producerIdentificationNumber
    ).toBe('SubmittedRef')
  })

  it('Should redirect non-AMEND journeys without attempting the transition', async () => {
    const draft = await store.create()
    const submitted = await store.create()
    await records.finalise(submitted.journeyId)

    expect(await get(journeyRequest(draft.journeyId), stubH())).toEqual({
      redirect: '/'
    })
    expect(await post(journeyRequest(submitted.journeyId), stubH())).toEqual({
      redirect: pagePath(submitted.journeyId, NOTIFICATION_VIEW_SLUG)
    })
    expect((await records.load({ journeyId: draft.journeyId })).status).toBe(
      'draft'
    )
    expect(
      (await records.load({ journeyId: submitted.journeyId })).status
    ).toBe(SUBMITTED)
  })

  it('Should refuse to disclose or cancel an amendment the session does not hold', async () => {
    const { journeyId } = await startAmend()
    const foreign = () =>
      journeyRequest(journeyId, {
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

    // no adoption into the caller's session
    expect(getRequest.state[SESSION_COOKIES.knownJourneys]).toEqual([])
    expect(postRequest.state[SESSION_COOKIES.knownJourneys]).toEqual([])

    // the amendment is untouched
    const after = await records.load({ journeyId })
    expect(after.status).toBe(AMEND)
    expect(projectAnswers(after.fulfilment).producerIdentificationNumber).toBe(
      'AmendedRef'
    )
  })

  it('Should redirect a journeyId no record exists for', async () => {
    const request = journeyRequest('GBN-AG-26-UNKNOWN', {
      state: { [SESSION_COOKIES.knownJourneys]: [] }
    })
    expect(await post(request, adoptingH(request))).toEqual({ redirect: '/' })
  })

  it('Should re-render confirmation at 500 with the recoverable-save banner after a backend failure', async () => {
    configureRecords({
      ...recordsStub,
      cancelAmend: realRecords.cancelAmend
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      }))
    )
    const { journeyId } = await startAmend()
    const h = stubH()

    const response = await post(journeyRequest(journeyId), h)

    expect(response.statusCode).toBe(500)
    expect(response.context.recoverableError).toBe(true)
    expect(response.view).toBe(
      'high-risk-plants/journeys/linear/features/cancel-amend/template'
    )
  })
})
