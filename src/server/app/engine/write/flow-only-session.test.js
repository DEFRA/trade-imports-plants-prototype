import { beforeEach, describe, expect, it, vi } from 'vitest'
import { commit } from './index.js'
import { get, configureReadyForCheckYourAnswers } from '../read.js'
import { records, configureRecords } from '../persistence/records.js'
import { configureSession, SESSION_COOKIES } from '../persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { journeyRequest, recordingH } from '../test-support.js'
import { FLOW_ONLY_KEY } from '../../../../../test/fixtures/index.js'

const FLOW_ONLY_VALUE = 'confirmed'

describe('flow-only answers — session round-trip', () => {
  beforeEach(async () => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    configureReadyForCheckYourAnswers(() => false)
    await records.clear()
  })

  it('Should return the flow-only answer from a fresh read after commit without adding it to fulfilment', async () => {
    const journey = await records.create()
    const writeH = recordingH()

    await commit(journeyRequest(journey.journeyId), writeH, {
      [FLOW_ONLY_KEY]: FLOW_ONLY_VALUE
    })

    expect(
      (await records.load({ journeyId: journey.journeyId })).fulfilment
    ).toEqual({})

    const freshRequest = journeyRequest(journey.journeyId, {
      state: {
        [SESSION_COOKIES.flowOnlyAnswers]:
          writeH.cookies[SESSION_COOKIES.flowOnlyAnswers]
      }
    })
    const fresh = await get(freshRequest, recordingH())

    expect(fresh.answers[FLOW_ONLY_KEY]).toBe(FLOW_ONLY_VALUE)
  })

  it('Should load flow-only session state once when a request reads repeatedly', async () => {
    const journey = await records.create()
    const flowOnlyAnswers = vi.fn(sessionStub.flowOnlyAnswers)
    configureSession({ ...sessionStub, flowOnlyAnswers })
    const request = journeyRequest(journey.journeyId, {
      app: {},
      state: {
        [SESSION_COOKIES.flowOnlyAnswers]: {
          [journey.journeyId]: { [FLOW_ONLY_KEY]: FLOW_ONLY_VALUE }
        }
      }
    })

    await get(request, recordingH())
    await get(request, recordingH())

    expect(flowOnlyAnswers).toHaveBeenCalledOnce()
  })
})
