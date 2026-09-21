import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { records as realRecords } from '../../../../../../services/persistence/records/real/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  postHandlerOf
} from '../../../../../../engine/test-support.js'
import { hubPath } from '../../../../../../shared/paths.js'
import { PLANTS_WOOD_DAYS_AFTER_ARRIVAL } from '../timing-windows.js'
import { installHighRiskPlantsJourney } from '../../test-support.js'
import { copy } from './copy/copy.en.js'
import {
  ALREADY_ARRIVED,
  ARRIVAL_STATUSES,
  NOT_YET_ARRIVED
} from './statuses.js'
import * as arrivalStatus from './controller.js'

const get = arrivalStatus.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(arrivalStatus)

const PLANTS_FOR_PLANTING = 'plants-for-planting'
const WOOD_AND_CUT_TREES = 'wood-and-cut-trees'
const POTATOES = 'potatoes'
const UNOFFERED_STATUS = 'maybe'

const plants = (answers = {}) => ({
  commodityType: PLANTS_FOR_PLANTING,
  ...answers
})

const installStubs = () => {
  configureRecords(recordsStub)
  configureSession(sessionStub)
  installHighRiskPlantsJourney()
}

describe('#meta', () => {
  it('Should own the arrivalStatus obligation on the arrival-status page', () => {
    expect(arrivalStatus.meta).toEqual({
      id: 'arrival-status',
      slug: 'arrival-status',
      collects: ['arrivalStatus']
    })
  })
})

describe('GET arrival-status', () => {
  beforeAll(installStubs)
  beforeEach(() => store.clear())

  it('Should render the question as the heading and caption the arrival section', async () => {
    const result = await driveHandler(get, { seed: plants() })

    expect(result.view.context.pageTitle).toBe(
      'Has the consignment arrived in Great Britain?'
    )
    expect(result.view.context.caption).toBe('Arrival')
  })

  it('Should offer both statuses, already arrived first, each with its hint', async () => {
    const result = await driveHandler(get, { seed: plants() })

    expect(result.view.context.statusOptions.map(({ value }) => value)).toEqual(
      [...ARRIVAL_STATUSES]
    )
    expect(result.view.context.statusOptions).toEqual([
      {
        value: ALREADY_ARRIVED,
        text: copy.statusLabels[ALREADY_ARRIVED],
        hint: {
          text: copy.statusHints[ALREADY_ARRIVED](
            PLANTS_WOOD_DAYS_AFTER_ARRIVAL
          )
        },
        checked: false
      },
      {
        value: NOT_YET_ARRIVED,
        text: copy.statusLabels[NOT_YET_ARRIVED],
        hint: { text: copy.statusHints[NOT_YET_ARRIVED] },
        checked: false
      }
    ])
  })

  it('Should quote the plants and wood notification window in the post-arrival hint', async () => {
    const result = await driveHandler(get, { seed: plants() })

    const [alreadyArrived] = result.view.context.statusOptions
    expect(alreadyArrived.hint.text).toContain(
      `${PLANTS_WOOD_DAYS_AFTER_ARRIVAL} days`
    )
  })

  it('Should show no answer and no error on a notification with none', async () => {
    const result = await driveHandler(get, { seed: plants() })

    expect(result.view.context.values).toEqual({ arrivalStatus: '' })
    expect(result.view.context.errorSummary).toBeNull()
  })

  it('Should check the stored status', async () => {
    const result = await driveHandler(get, {
      seed: plants({ arrivalStatus: ALREADY_ARRIVED })
    })

    expect(result.view.context.values).toEqual({
      arrivalStatus: ALREADY_ARRIVED
    })
    expect(
      result.view.context.statusOptions.find(({ checked }) => checked).value
    ).toBe(ALREADY_ARRIVED)
  })

  it('Should send Back to the overview', async () => {
    const result = await driveHandler(get, { seed: plants() })

    expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
  })
})

describe('POST arrival-status — the answers it refuses', () => {
  beforeAll(installStubs)
  beforeEach(() => store.clear())

  it('Should refuse an empty choice and check nothing', async () => {
    const result = await driveHandler(post, {
      seed: plants(),
      payload: {}
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.arrivalStatus).toBe(
      copy.errors.arrivalStatus
    )
    expect(result.view.context.values).toEqual({ arrivalStatus: '' })
    expect(result.after.arrivalStatus).toBeUndefined()
  })

  it('Should refuse a status the page does not offer', async () => {
    const result = await driveHandler(post, {
      seed: plants(),
      payload: { arrivalStatus: UNOFFERED_STATUS }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.arrivalStatus).toBe(
      copy.errors.arrivalStatus
    )
    expect(result.after.arrivalStatus).toBeUndefined()
  })

  it('Should re-render the refused value rather than dropping it', async () => {
    const result = await driveHandler(post, {
      seed: plants(),
      payload: { arrivalStatus: UNOFFERED_STATUS }
    })

    expect(result.view.context.values).toEqual({
      arrivalStatus: UNOFFERED_STATUS
    })
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: copy.errors.arrivalStatus, href: '#arrivalStatus' }
    ])
  })
})

describe('POST arrival-status — an accepted answer', () => {
  beforeAll(installStubs)
  beforeEach(() => store.clear())

  it('Should commit exactly the chosen status', async () => {
    const result = await driveHandler(post, {
      seed: plants(),
      payload: { arrivalStatus: ALREADY_ARRIVED, crumb: 'token' }
    })

    expect(result.after).toEqual({
      commodityType: PLANTS_FOR_PLANTING,
      arrivalStatus: ALREADY_ARRIVED
    })
  })

  it('Should accept the question on a wood notification too', async () => {
    const result = await driveHandler(post, {
      seed: { commodityType: WOOD_AND_CUT_TREES },
      payload: { arrivalStatus: NOT_YET_ARRIVED }
    })

    expect(result.after.arrivalStatus).toBe(NOT_YET_ARRIVED)
  })

  it('Should redirect to the overview, the page after the arrival section', async () => {
    const result = await driveHandler(post, {
      seed: plants(),
      payload: { arrivalStatus: NOT_YET_ARRIVED }
    })

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
  })

  it('Should honour Save and return to overview', async () => {
    const result = await driveHandler(post, {
      seed: plants(),
      payload: { arrivalStatus: NOT_YET_ARRIVED, exit: 'hub' }
    })

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after.arrivalStatus).toBe(NOT_YET_ARRIVED)
  })

  it('Should keep no status on a potato notification, which is never asked', async () => {
    const result = await driveHandler(post, {
      seed: { commodityType: POTATOES },
      payload: { arrivalStatus: ALREADY_ARRIVED }
    })

    expect(result.after.arrivalStatus).toBeUndefined()
  })
})

describe('POST arrival-status — save failures', () => {
  beforeAll(() => {
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })

  beforeEach(() => {
    store.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      }))
    )
  })

  afterEach(() => {
    configureRecords(recordsStub)
    vi.unstubAllGlobals()
  })

  const failingOnControllerCommit = (failure) => {
    let replaceCalls = 0
    configureRecords({
      ...recordsStub,
      replaceFulfilment: (...args) => {
        replaceCalls += 1
        return replaceCalls === 1
          ? recordsStub.replaceFulfilment(...args)
          : failure(...args)
      }
    })
  }

  it('Should re-render a backend request failure at 500 with the banner and the value', async () => {
    failingOnControllerCommit(realRecords.replaceFulfilment)

    const result = await driveHandler(post, {
      payload: { arrivalStatus: ALREADY_ARRIVED }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.view.context.values).toEqual({
      arrivalStatus: ALREADY_ARRIVED
    })
  })

  it('Should let a programming error escape to the promoted catch-all', async () => {
    failingOnControllerCommit(async () => {
      throw new TypeError('programming failure')
    })

    await expect(
      driveHandler(post, { payload: { arrivalStatus: ALREADY_ARRIVED } })
    ).rejects.toThrow(new TypeError('programming failure'))
  })
})
