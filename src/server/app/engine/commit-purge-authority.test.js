import { beforeEach, describe, expect, it } from 'vitest'
import { commit } from './index.js'
import { records, configureRecords } from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { purgeFulfilments, wipeSet } from '../bridge/purge.js'
import { assembleFulfilments } from '../bridge/assemble-fulfilments.js'
import { projectAnswers } from '../bridge/fulfilments/index.js'
import { stubH, journeyRequest } from './test-support.js'
import {
  BRANCH_A,
  BRANCH_B,
  TOGGLE_NO,
  TOGGLE_YES,
  VALUE_ONE,
  VALUE_TWO
} from '../../../../test/fixtures/index.js'

// commit's wipe authority is the evaluator purge (projected to positional
// pathKeys), sharing the session/journey/save layer. The status-flip gate:
// answering `statusToggle` 'no' flips `statusFlipField` to optional but
// leaves it in scope, so the stored value survives. The branch gate is a
// second case the evaluator does purge, proving the purge fires widely.

const STATUS_FLIP_ANSWERED = {
  scalarField: VALUE_ONE,
  statusToggle: TOGGLE_YES,
  statusFlipField: VALUE_TWO
}
const TURN_STATUS_GATE_OFF = { statusToggle: TOGGLE_NO }

const BRANCH_ANSWERED = {
  branchSelector: BRANCH_A,
  branchAField: VALUE_ONE
}
const TURN_BRANCH_GATE_OFF = { branchSelector: BRANCH_B }

let journeyId
const buildRequest = () => journeyRequest(journeyId)
const seed = (answers) =>
  records.replaceFulfilment(journeyId, assembleFulfilments(answers))
const durable = async () =>
  projectAnswers((await records.load({ journeyId })).fulfilment)
const wipeOf = (answers) => {
  const fulfilments = assembleFulfilments(answers)
  return wipeSet(fulfilments, purgeFulfilments(fulfilments))
}

describe('#commit — evaluator-authoritative purge', () => {
  beforeEach(async () => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    await records.clear()
    configureReadyForCheckYourAnswers(() => false)
    journeyId = (await records.create()).journeyId
  })

  it('Should retain statusFlipField when its gate is answered "no" (retain-value)', async () => {
    await seed(STATUS_FLIP_ANSWERED)
    const { answers } = await commit(
      buildRequest(),
      stubH(),
      TURN_STATUS_GATE_OFF
    )
    // Retain-value pattern: the field stays in scope (optional) on 'no',
    // so the purge never claims it and the stored value survives.
    expect(
      wipeOf({ ...STATUS_FLIP_ANSWERED, ...TURN_STATUS_GATE_OFF })
    ).not.toContain('statusFlipField')
    expect(answers.statusFlipField).toBe(STATUS_FLIP_ANSWERED.statusFlipField)
    expect((await durable()).statusFlipField).toBe(
      STATUS_FLIP_ANSWERED.statusFlipField
    )
  })

  it('Should destroy exactly the evaluator purge set', async () => {
    await seed(BRANCH_ANSWERED)
    const merged = { ...BRANCH_ANSWERED, ...TURN_BRANCH_GATE_OFF }
    const expectedWipe = wipeOf(merged)

    const { answers } = await commit(
      buildRequest(),
      stubH(),
      TURN_BRANCH_GATE_OFF
    )

    // B purges the out-of-scope dependant, so commit destroys exactly that key.
    expect(expectedWipe).toContain('branchAField')
    const destroyed = Object.keys(merged).filter(
      (key) => answers[key] === undefined
    )
    expect(destroyed).toEqual(expectedWipe)
    expect(answers.branchSelector).toBe(BRANCH_B)
  })
})
