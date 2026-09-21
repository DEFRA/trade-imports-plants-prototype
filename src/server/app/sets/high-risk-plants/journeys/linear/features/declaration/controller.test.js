import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import * as state from '../../../../../../engine/index.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { records as realRecords } from '../../../../../../services/persistence/records/real/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { journeyRequest, stubH } from '../../../../../../engine/test-support.js'
import {
  COMPLETE_NOTIFICATION,
  installHighRiskPlantsJourney
} from '../../test-support.js'
import { lateNotificationIndicator } from '../../../../obligations/index.js'
import { SYSTEM_POPULATED } from '../../../../../../bridge/obligation-source.js'
import { copy } from './copy/copy.en.js'
import { routes, meta } from './controller.js'

const get = routes.find(({ method }) => method === 'GET').handler
const post = routes.find(({ method }) => method === 'POST').handler
const CLOCK = '2026-03-25T12:00:00Z'
const setup = async (seed = COMPLETE_NOTIFICATION) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, seed)
  return {
    id: journey.journeyId,
    request: journeyRequest(journey.journeyId, {
      app: { clock: () => new Date(CLOCK) }
    }),
    h: stubH()
  }
}

describe('declaration', () => {
  beforeAll(() => {
    installHighRiskPlantsJourney()
    configureSession(sessionStub)
  })
  beforeEach(() => {
    configureRecords(recordsStub)
    store.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    configureRecords(recordsStub)
  })

  it('Should own the flow-only declaration and leave lateness system-owned', () => {
    expect(meta.collects).toEqual(['declaration'])
    expect(SYSTEM_POPULATED.has(lateNotificationIndicator.name)).toBe(true)
  })

  it('Should render the London date, plants statements, Back link and saved checkbox', async () => {
    const { request, h, id } = await setup()
    await state.commit(request, h, { declaration: 'confirmed' })
    request.app.clock = () => new Date('2026-06-01T23:30:00Z')
    await get(request, h)
    expect(h.captured.view.context).toMatchObject({
      pageTitle: copy.title,
      values: { declaration: 'confirmed' },
      backLink: `/notifications/${id}/notification-view`,
      submissionDate: '2 June 2026',
      copy
    })
    expect(h.captured.view.context.caption).toBeUndefined()
  })

  it.each(['', 'no', ['confirmed', 'no']])(
    'Should refuse invalid declaration %j without writing and preserve the input',
    async (declaration) => {
      const { request, h, id } = await setup()
      request.payload = { declaration }
      const result = await post(request, h)
      expect(result.statusCode).toBe(400)
      expect(h.captured.view.context.values).toEqual({ declaration })
      expect(h.captured.view.context.errorSummary.errorList).toEqual([
        { text: copy.errors.declarationRequired, href: '#declaration' }
      ])
      expect((await store.get(id)).answers).toEqual(COMPLETE_NOTIFICATION)
    }
  )

  it.each([
    [CLOCK, 'on-time'],
    ['2026-03-26T00:00:00Z', 'late']
  ])(
    'Should commit %s as %s before finalising and ignore forged system input',
    async (clock, expected) => {
      const { request, h, id } = await setup()
      request.app.clock = () => new Date(clock)
      request.payload = {
        declaration: 'confirmed',
        lateNotificationIndicator: 'forged'
      }
      const finalise = vi.fn(async (...args) => {
        expect((await store.get(id)).answers.lateNotificationIndicator).toBe(
          expected
        )
        return recordsStub.finalise(...args)
      })
      configureRecords({ ...recordsStub, finalise })
      expect(await post(request, h)).toEqual({
        redirect: `/notifications/${id}/confirmation`
      })
      expect(finalise).toHaveBeenCalledOnce()
      const saved = await store.get(id)
      expect(saved.status).toBe(state.SUBMITTED)
      expect(saved.fulfilment[lateNotificationIndicator.id]).toBeDefined()
      expect((await state.get(request, h)).answers.declaration).toBe(
        'confirmed'
      )
    }
  )

  it('Should return an incomplete submission to check answers', async () => {
    const { request, h, id } = await setup({ commodityType: 'potatoes' })
    request.payload = { declaration: 'confirmed' }
    expect(await post(request, h)).toEqual({
      redirect: `/notifications/${id}/notification-view`
    })
    expect((await store.get(id)).status).toBe(state.DRAFT)
  })

  it('Should redirect submitted GET and POST without changing the original flag', async () => {
    const { request, h, id } = await setup({
      ...COMPLETE_NOTIFICATION,
      lateNotificationIndicator: 'on-time'
    })
    await store.submit(id)
    request.app.clock = () => new Date('2027-01-01T00:00:00Z')
    for (const handler of [get, post]) {
      expect(await handler(request, h)).toEqual({
        redirect: `/notifications/${id}/confirmation`
      })
    }
    expect((await store.get(id)).answers.lateNotificationIndicator).toBe(
      'on-time'
    )
  })

  it('Should preserve first-submission lateness when finalising an amendment', async () => {
    const { request, h, id } = await setup({
      ...COMPLETE_NOTIFICATION,
      lateNotificationIndicator: 'on-time'
    })
    await store.submit(id)
    await recordsStub.amend(id)
    request.app.clock = () => new Date('2027-01-01T00:00:00Z')
    request.payload = { declaration: 'confirmed' }
    await post(request, h)
    expect((await store.get(id)).status).toBe(state.SUBMITTED)
    expect((await store.get(id)).answers.lateNotificationIndicator).toBe(
      'on-time'
    )
  })

  it('Should retain values and show the recoverable failure banner when finalise fails', async () => {
    const { request, h } = await setup()
    request.payload = { declaration: 'confirmed' }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      }))
    )
    configureRecords({ ...recordsStub, finalise: realRecords.finalise })
    expect((await post(request, h)).statusCode).toBe(500)
    expect(h.captured.view.context).toMatchObject({
      recoverableError: true,
      values: { declaration: 'confirmed' }
    })
  })

  it('Should let unexpected persistence errors escape', async () => {
    const { request, h } = await setup()
    request.payload = { declaration: 'confirmed' }
    configureRecords({
      ...recordsStub,
      finalise: async () => {
        throw new TypeError('unexpected')
      }
    })
    await expect(post(request, h)).rejects.toThrow('unexpected')
  })
})
