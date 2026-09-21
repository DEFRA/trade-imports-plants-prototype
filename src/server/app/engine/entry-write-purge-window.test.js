import { beforeEach, describe, expect, it } from 'vitest'
import { updateEntryAt } from './write/index.js'
import { makeScope, configureReadyForCheckYourAnswers } from './read.js'
import { records, configureRecords } from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { purgeFulfilments, wipeSet } from '../bridge/purge.js'
import { assembleFulfilments } from '../bridge/assemble-fulfilments.js'
import { projectAnswers } from '../bridge/fulfilments/index.js'
import { stubH, journeyRequest } from './test-support.js'
import {
  CATEGORY_ONE,
  SELECTOR_ALPHA,
  SELECTOR_BRAVO,
  VALUE_ONE
} from '../../../../test/fixtures/index.js'

// Every entry mutation now rebuilds and evaluates the canonical snapshot.
// These tests pin that the old stale-answer window has closed.

// `nestedGatedFieldB` is in scope only on records whose parent entry's
// `itemSelector` is SELECTOR_BRAVO. An entry on SELECTOR_ALPHA still
// holding a stored `nestedGatedFieldB` is the simulated stale window.
const STALE_ALPHA_ENTRY = {
  scalarField: VALUE_ONE,
  itemCollection: [
    {
      itemSelector: SELECTOR_ALPHA,
      itemCategory: CATEGORY_ONE,
      itemCount: '2',
      nestedCollection: [{ nestedGatedFieldA: 'A-1', nestedGatedFieldB: 'B-1' }]
    }
  ]
}

const BRAVO_ENTRY = {
  scalarField: VALUE_ONE,
  itemCollection: [
    {
      itemSelector: SELECTOR_BRAVO,
      itemCategory: CATEGORY_ONE,
      itemCount: '1',
      nestedCollection: [{ nestedGatedFieldB: 'B-1' }]
    }
  ]
}

const STALE_NESTED_FIELD_KEY =
  'itemCollection[0].nestedCollection[0].nestedGatedFieldB'

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

describe('entry-write canonical purge', () => {
  beforeEach(async () => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    await records.clear()
    configureReadyForCheckYourAnswers(() => false)
    journeyId = (await records.create()).journeyId
  })

  it('Should keep an out-of-scope stored value invisible to scope', () => {
    const scope = makeScope(STALE_ALPHA_ENTRY)
    expect(scope.inScope.has(STALE_NESTED_FIELD_KEY)).toBe(false)
    expect(
      scope.inScope.has(
        'itemCollection[0].nestedCollection[0].nestedGatedFieldA'
      )
    ).toBe(true)
  })

  it('Should name the stale value in the wipe set', () => {
    expect(wipeOf(STALE_ALPHA_ENTRY)).toContain(STALE_NESTED_FIELD_KEY)
  })

  it('Should destroy an out-of-scope value in the same updateEntryAt snapshot', async () => {
    await seed(BRAVO_ENTRY)
    await updateEntryAt(
      buildRequest(),
      stubH(),
      ['itemCollection'],
      0,
      STALE_ALPHA_ENTRY.itemCollection[0]
    )
    const answers = await durable()
    expect(
      answers.itemCollection[0].nestedCollection[0].nestedGatedFieldB
    ).toBeUndefined()
    expect(
      answers.itemCollection[0].nestedCollection[0].nestedGatedFieldA
    ).toBe('A-1')
  })
})
