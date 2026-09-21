import { beforeEach, describe, expect, it } from 'vitest'
import { commit, submitJourney } from './index.js'
import {
  records,
  configureRecords,
  DRAFT,
  SUBMITTED
} from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { stubH, journeyRequest } from './test-support.js'
import { VALUE_ONE, VALUE_TWO } from '../../../../test/fixtures/index.js'

let journeyId
const buildRequest = () => journeyRequest(journeyId)

describe('submit is finalise', () => {
  beforeEach(async () => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    await records.clear()
    journeyId = (await records.create()).journeyId
  })

  it('Should flip to submitted, keep answers byte-equal, and freeze further writes', async () => {
    configureReadyForCheckYourAnswers(() => true)
    await commit(buildRequest(), stubH(), { scalarField: VALUE_ONE })
    const committed = (await records.load({ journeyId })).fulfilment

    const result = await submitJourney(buildRequest(), stubH())

    expect(result.ok).toBe(true)
    expect(result.journey.status).toBe(SUBMITTED)
    expect(result.journey.submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(result.journey.fulfilment).toEqual(committed)
    await expect(
      commit(buildRequest(), stubH(), { scalarField: VALUE_TWO })
    ).rejects.toThrow(/is submitted — writes blocked/)
  })

  it('Should be a no-op when not ready — journey stays in draft', async () => {
    configureReadyForCheckYourAnswers(() => false)
    await commit(buildRequest(), stubH(), { scalarField: VALUE_ONE })

    const result = await submitJourney(buildRequest(), stubH())

    expect(result.ok).toBe(false)
    expect((await records.load({ journeyId })).status).toBe(DRAFT)
  })
})
