import { beforeEach, describe, expect, it } from 'vitest'
import { commit } from './index.js'
import { records, configureRecords } from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { stubH, journeyRequest } from './test-support.js'
import { obligationSet } from '../model/obligations/manifest.js'
import { VALUE_ONE, VALUE_TWO } from '../../../../test/fixtures/index.js'

const { scalarField, optionalScalarField } = obligationSet()

let journeyId
const buildRequest = () => journeyRequest(journeyId)

describe('#commit', () => {
  beforeEach(async () => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    await records.clear()
    configureReadyForCheckYourAnswers(() => false)
    journeyId = (await records.create()).journeyId
  })

  it('Should persist to the records port on the first commit, before any submit', async () => {
    await commit(buildRequest(), stubH(), { scalarField: VALUE_ONE })
    expect((await records.load({ journeyId })).fulfilment).toEqual({
      [scalarField.id]: VALUE_ONE
    })
  })

  it('Should overwrite the durable record on a second commit', async () => {
    await commit(buildRequest(), stubH(), { scalarField: VALUE_ONE })
    await commit(buildRequest(), stubH(), {
      optionalScalarField: VALUE_TWO
    })
    expect((await records.load({ journeyId })).fulfilment).toEqual({
      [scalarField.id]: VALUE_ONE,
      [optionalScalarField.id]: VALUE_TWO
    })
  })
})
