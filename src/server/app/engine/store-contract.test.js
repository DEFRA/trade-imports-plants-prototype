import { beforeEach, describe, expect, it } from 'vitest'
import { store, DRAFT, SUBMITTED } from './store.js'
import { configureRecords } from './persistence/records.js'
import { records as recordsStub } from '../services/persistence/records/stub/index.js'
import { obligationSet } from '../model/obligations/manifest.js'
import { VALUE_ONE } from '../../../../test/fixtures/index.js'

const { scalarField, compositeBlockOne } = obligationSet()

// A composite value with a nested branch: the deep-clone contract only
// bites below the first level, so a flat value would not prove it.
const nestedCompositeValue = () => ({
  partOne: 'part one',
  inner: { partTwo: 'part two' }
})

describe('store clone/freeze contract', () => {
  beforeEach(() => {
    configureRecords(recordsStub)
    store.clear()
  })

  it('Should be a frozen surface — methods cannot be reassigned', () => {
    expect(Object.isFrozen(store)).toBe(true)
  })

  it('Should mint a fresh draft journey with empty canonical fulfilment', async () => {
    const journey = await store.create()
    expect(journey).toMatchObject({
      journeyId: expect.any(String),
      status: DRAFT,
      submittedAt: null,
      fulfilment: {},
      answers: {}
    })
  })

  it('Should return a deep clone from get — mutating it never mutates stored state', async () => {
    const { journeyId } = await store.create()
    await store.replaceFulfilment(journeyId, {
      [scalarField.id]: VALUE_ONE,
      [compositeBlockOne.id]: nestedCompositeValue()
    })
    const read = await store.get(journeyId)
    read.fulfilment[scalarField.id] = 'HACKED'
    read.fulfilment[compositeBlockOne.id].inner.partTwo = 'HACKED'
    expect((await store.get(journeyId)).fulfilment).toEqual({
      [scalarField.id]: VALUE_ONE,
      [compositeBlockOne.id]: nestedCompositeValue()
    })
  })

  it('Should copy canonical input by value and return a deep clone', async () => {
    const { journeyId } = await store.create()
    const input = {
      [compositeBlockOne.id]: nestedCompositeValue()
    }
    const saved = await store.replaceFulfilment(journeyId, input)
    input[compositeBlockOne.id].inner.partTwo = 'HACKED'
    saved.fulfilment[compositeBlockOne.id] = 'HACKED'
    expect((await store.get(journeyId)).fulfilment).toEqual({
      [compositeBlockOne.id]: nestedCompositeValue()
    })
  })

  it('Should freeze on submit — replace and re-submit both throw once submitted', async () => {
    const { journeyId } = await store.create()
    await store.submit(journeyId)
    await expect(
      store.replaceFulfilment(journeyId, { late: true })
    ).rejects.toThrow(/is submitted — writes blocked/)
    await expect(store.submit(journeyId)).rejects.toThrow(
      /is submitted — writes blocked/
    )
  })

  it('Should flip status to submitted and stamp submittedAt on submit', async () => {
    const { journeyId } = await store.create()
    const submitted = await store.submit(journeyId)
    expect(submitted.status).toBe(SUBMITTED)
    expect(submitted.submittedAt).toEqual(expect.any(String))
  })

  it('Should treat unknown ids honestly — get undefined, replace throws', async () => {
    expect(await store.get('nope')).toBeUndefined()
    await expect(store.replaceFulfilment('nope', {})).rejects.toThrow(
      /Unknown journey/
    )
    expect(await store.has('nope')).toBe(false)
  })

  it('Should reflect membership via has() and clear()', async () => {
    const { journeyId } = await store.create()
    expect(await store.has(journeyId)).toBe(true)
    await store.clear()
    expect(await store.has(journeyId)).toBe(false)
    expect(await store.get(journeyId)).toBeUndefined()
  })
})
