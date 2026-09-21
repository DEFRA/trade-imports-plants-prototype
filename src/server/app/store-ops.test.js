import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  appendEntryAt,
  commit,
  reconcileEntriesAt,
  removeEntryAt,
  updateEntryAt
} from './engine/index.js'
import { store } from './engine/store.js'
import { records, configureRecords } from './engine/persistence/records.js'
import { configureSession } from './engine/persistence/session.js'
import { records as recordsStub } from './services/persistence/records/stub/index.js'
import { session as sessionStub } from './services/persistence/session/stub.js'
import { stubH, journeyRequest } from './engine/test-support.js'
import { buildDispatch } from './flow/dispatch.js'
import { projectAnswers } from './bridge/fulfilments/index.js'
import {
  compositeBlockValue,
  dispatchPages,
  SELECTOR_ALPHA,
  SELECTOR_BRAVO,
  SELECTOR_CHARLIE,
  SELECTOR_DELTA,
  SELECTOR_ECHO,
  TAG_ONE,
  TAG_TWO,
  TOGGLE_NO
} from '../../../test/fixtures/index.js'

let journeyId
const buildRequest = () => journeyRequest(journeyId)
const answersNow = async () => (await store.get(journeyId)).answers

const entry = (itemSelector, extra = {}) => ({
  itemSelector,
  itemTags: [TAG_ONE],
  itemCount: 25,
  ...extra
})

const nestedPath = (entryIndex) => [
  'itemCollection',
  entryIndex,
  'nestedCollection'
]

// `SELECTOR_DELTA` is the value that puts both `nestedGatedFieldD` and
// `nestedCompositeBlock` in scope inside `nestedCollection`.
const deltaEntry = (nestedRecords = []) => ({
  itemSelector: SELECTOR_DELTA,
  nestedCollection: nestedRecords
})

const blockValue = compositeBlockValue('nested')

const setupJourneyEngine = () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(async () => {
    await store.clear()
    journeyId = (await store.create()).journeyId
  })
}

describe('path-addressed store ops at depth-1 (itemCollection — live carrier)', () => {
  setupJourneyEngine()

  it('Should append an entry, minting the next index and persisting it', async () => {
    const first = await appendEntryAt(
      buildRequest(),
      stubH(),
      ['itemCollection'],
      { itemSelector: SELECTOR_ALPHA }
    )
    expect(first).toBe(0)
    const second = await appendEntryAt(
      buildRequest(),
      stubH(),
      ['itemCollection'],
      { itemSelector: SELECTOR_BRAVO }
    )
    expect(second).toBe(1)
    expect((await answersNow()).itemCollection).toEqual([
      { itemSelector: SELECTOR_ALPHA },
      { itemSelector: SELECTOR_BRAVO }
    ])
  })

  it('Should edit an entry in place, leaving siblings intact', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [entry(SELECTOR_ALPHA), entry(SELECTOR_BRAVO)]
    })
    await updateEntryAt(
      buildRequest(),
      stubH(),
      ['itemCollection'],
      0,
      entry(SELECTOR_CHARLIE)
    )
    expect((await answersNow()).itemCollection[0].itemSelector).toBe(
      SELECTOR_CHARLIE
    )
    expect((await answersNow()).itemCollection[1].itemSelector).toBe(
      SELECTOR_BRAVO
    )
  })

  it('Should remove an entry in place, leaving siblings intact', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [entry(SELECTOR_ALPHA), entry(SELECTOR_BRAVO)]
    })
    await removeEntryAt(buildRequest(), stubH(), ['itemCollection'], 0)
    expect(
      (await answersNow()).itemCollection.map((record) => record.itemSelector)
    ).toEqual([SELECTOR_BRAVO])
  })

  it('Should ignore a non-integer index on remove (a malformed URL must not destroy instance 0)', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [entry(SELECTOR_ALPHA), entry(SELECTOR_BRAVO)]
    })
    await removeEntryAt(
      buildRequest(),
      stubH(),
      ['itemCollection'],
      Number('foo')
    )
    expect(
      (await answersNow()).itemCollection.map((record) => record.itemSelector)
    ).toEqual([SELECTOR_ALPHA, SELECTOR_BRAVO])
  })

  it('Should ignore an out-of-range index on remove', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [entry(SELECTOR_ALPHA)]
    })
    await removeEntryAt(buildRequest(), stubH(), ['itemCollection'], 5)
    expect((await answersNow()).itemCollection).toEqual([entry(SELECTOR_ALPHA)])
  })

  it('Should ignore a non-integer index on update', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [entry(SELECTOR_ALPHA)]
    })
    await updateEntryAt(
      buildRequest(),
      stubH(),
      ['itemCollection'],
      Number('foo'),
      entry(SELECTOR_DELTA)
    )
    expect((await answersNow()).itemCollection).toEqual([entry(SELECTOR_ALPHA)])
  })

  it('Should ignore an out-of-range index on update', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [entry(SELECTOR_ALPHA)]
    })
    await updateEntryAt(
      buildRequest(),
      stubH(),
      ['itemCollection'],
      5,
      entry(SELECTOR_DELTA)
    )
    expect((await answersNow()).itemCollection).toEqual([entry(SELECTOR_ALPHA)])
  })

  it('Should write through a commit that mutates an entry, re-running reconcile and destroying the now-out-of-scope gated field at its exact path', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [entry(SELECTOR_ALPHA, { itemGatedField: '5' })]
    })
    await commit(buildRequest(), stubH(), {
      itemCollection: [entry(SELECTOR_CHARLIE, { itemGatedField: '5' })]
    })
    const persisted = projectAnswers(
      (await records.load({ journeyId })).fulfilment
    )
    expect(persisted.itemCollection[0].itemSelector).toBe(SELECTOR_CHARLIE)
    expect('itemGatedField' in persisted.itemCollection[0]).toBe(false)
  })

  it('Should preserve an in-scope gated field when a commit leaves the entry on the list', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [entry(SELECTOR_ALPHA, { itemGatedField: '5' })]
    })
    await commit(buildRequest(), stubH(), {
      itemCollection: [entry(SELECTOR_ALPHA, { itemGatedField: '9' })]
    })
    expect(
      projectAnswers((await records.load({ journeyId })).fulfilment)
        .itemCollection[0]
    ).toEqual(entry(SELECTOR_ALPHA, { itemGatedField: '9' }))
  })
})

describe('batch reconcile (reconcileEntriesAt — the tag-grain create)', () => {
  setupJourneyEngine()

  const keyOf = (record) => `${record.itemSelector}|${record.itemTags}`
  const seed = (itemSelector, itemTags) => ({
    itemSelector,
    itemTags,
    itemGatedField: '',
    itemCount: ''
  })
  const reconcileEntries = (entries) =>
    reconcileEntriesAt(
      buildRequest(),
      stubH(),
      ['itemCollection'],
      keyOf,
      entries
    )

  it('Should create one entry per desired record, in the desired order', async () => {
    await reconcileEntries([
      seed(SELECTOR_ALPHA, [TAG_ONE]),
      seed(SELECTOR_ALPHA, [TAG_TWO]),
      seed(SELECTOR_BRAVO, [TAG_ONE])
    ])
    expect((await answersNow()).itemCollection.map(keyOf)).toEqual([
      `${SELECTOR_ALPHA}|${TAG_ONE}`,
      `${SELECTOR_ALPHA}|${TAG_TWO}`,
      `${SELECTOR_BRAVO}|${TAG_ONE}`
    ])
  })

  it("Should keep ALL of an existing entry's data when its tag stays selected — per-entry counts and nested records survive the reconcile", async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [
        {
          itemSelector: SELECTOR_ALPHA,
          itemTags: [TAG_ONE],
          itemGatedField: '5',
          itemCount: '25',
          nestedCollection: [{ nestedGatedFieldA: 'A-1' }]
        }
      ]
    })
    await reconcileEntries([
      seed(SELECTOR_ALPHA, [TAG_ONE]),
      seed(SELECTOR_ALPHA, [TAG_TWO])
    ])
    const entries = (await answersNow()).itemCollection
    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual({
      itemSelector: SELECTOR_ALPHA,
      itemTags: [TAG_ONE],
      itemGatedField: '5',
      itemCount: 25,
      nestedCollection: [{ nestedGatedFieldA: 'A-1' }]
    })
    expect(entries[1]).toEqual(seed(SELECTOR_ALPHA, [TAG_TWO]))
  })

  it("Should remove a deselected tag's entry entirely — deselect wipes the entry and its nested records", async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [
        {
          itemSelector: SELECTOR_ALPHA,
          itemTags: [TAG_ONE],
          itemCount: '25',
          nestedCollection: [{ nestedGatedFieldA: 'A-1' }]
        },
        {
          itemSelector: SELECTOR_DELTA,
          itemTags: [TAG_TWO],
          itemCount: '2'
        }
      ]
    })
    await reconcileEntries([seed(SELECTOR_DELTA, [TAG_TWO])])
    const entries = (await answersNow()).itemCollection
    expect(entries).toHaveLength(1)
    expect(entries[0].itemSelector).toBe(SELECTOR_DELTA)
    expect(entries[0].itemCount).toBe(2)
  })

  it('Should run the scope-and-wipe pass: dropping the last triggering entry destroys the dependent top-level answer', async () => {
    // aggregateGatedToggle is in scope only while SOME entry carries the
    // listed selector (an anyAllowListed gate), and is purged when none does.
    await store.seedAnswers(journeyId, {
      aggregateGatedToggle: TOGGLE_NO,
      itemCollection: [
        { itemSelector: SELECTOR_BRAVO, itemTags: [TAG_ONE] },
        { itemSelector: SELECTOR_DELTA, itemTags: [TAG_TWO] }
      ]
    })
    await reconcileEntries([seed(SELECTOR_DELTA, [TAG_TWO])])
    const answers = await answersNow()
    expect('aggregateGatedToggle' in answers).toBe(false)
  })
})

const nestedRecordCrudTests = () => {
  it('Should append a record into a specific entry, minting the nested index and persisting it', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [deltaEntry(), deltaEntry()]
    })
    const first = await appendEntryAt(buildRequest(), stubH(), nestedPath(1), {
      nestedGatedFieldD: 'D-1'
    })
    expect(first).toBe(0)
    const second = await appendEntryAt(buildRequest(), stubH(), nestedPath(1), {
      nestedGatedFieldD: 'D-2'
    })
    expect(second).toBe(1)
    expect(
      (await answersNow()).itemCollection[0].nestedCollection
    ).toBeUndefined()
    expect(
      (await answersNow()).itemCollection[1].nestedCollection.map(
        (record) => record.nestedGatedFieldD
      )
    ).toEqual(['D-1', 'D-2'])
  })

  it('Should edit a record in place at depth-2, leaving sibling records intact', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [
        deltaEntry([{ nestedGatedFieldD: 'D-1' }, { nestedGatedFieldD: 'D-2' }])
      ]
    })
    await updateEntryAt(buildRequest(), stubH(), nestedPath(0), 0, {
      nestedGatedFieldD: 'D-1-edited'
    })
    expect(
      (await answersNow()).itemCollection[0].nestedCollection.map(
        (record) => record.nestedGatedFieldD
      )
    ).toEqual(['D-1-edited', 'D-2'])
  })

  it('Should remove a record in place at depth-2, leaving sibling records intact', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [
        deltaEntry([{ nestedGatedFieldD: 'D-1' }, { nestedGatedFieldD: 'D-2' }])
      ]
    })
    await removeEntryAt(buildRequest(), stubH(), nestedPath(0), 0)
    expect(
      (await answersNow()).itemCollection[0].nestedCollection.map(
        (record) => record.nestedGatedFieldD
      )
    ).toEqual(['D-2'])
  })

  it('Should ignore a non-integer nested index on remove (a malformed URL must not destroy record 0)', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [deltaEntry([{ nestedGatedFieldD: 'D-1' }])]
    })
    await removeEntryAt(buildRequest(), stubH(), nestedPath(0), Number('foo'))
    expect(
      (await answersNow()).itemCollection[0].nestedCollection.map(
        (record) => record.nestedGatedFieldD
      )
    ).toEqual(['D-1'])
  })

  it('Should ignore an out-of-range nested index on update', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [deltaEntry([{ nestedGatedFieldD: 'D-1' }])]
    })
    await updateEntryAt(buildRequest(), stubH(), nestedPath(0), 5, {
      nestedGatedFieldD: 'D-X'
    })
    expect(
      (await answersNow()).itemCollection[0].nestedCollection[0]
        .nestedGatedFieldD
    ).toBe('D-1')
  })
}

const cardinalityCapTests = () => {
  it('Should reject an append at the cardinality cap — records never exceed the sibling count', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [
        {
          itemSelector: SELECTOR_DELTA,
          itemCount: '2',
          nestedCollection: [
            { nestedGatedFieldD: 'D-1' },
            { nestedGatedFieldD: 'D-2' }
          ]
        }
      ]
    })
    const rejected = await appendEntryAt(
      buildRequest(),
      stubH(),
      nestedPath(0),
      { nestedGatedFieldD: 'D-3' }
    )
    expect(rejected).toBeNull()
    expect(
      (await answersNow()).itemCollection[0].nestedCollection
    ).toHaveLength(2)
  })

  it('Should append below the cap, minting the next index as before', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [
        {
          itemSelector: SELECTOR_DELTA,
          itemCount: '2',
          nestedCollection: [{ nestedGatedFieldD: 'D-1' }]
        }
      ]
    })
    const index = await appendEntryAt(buildRequest(), stubH(), nestedPath(0), {
      nestedGatedFieldD: 'D-2'
    })
    expect(index).toBe(1)
    expect(
      (await answersNow()).itemCollection[0].nestedCollection
    ).toHaveLength(2)
  })

  it('Should apply NO cap while the sibling count is unanswered — the ruled blank-count semantics (the floor still bites at submit)', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [
        {
          itemSelector: SELECTOR_DELTA,
          itemCount: '',
          nestedCollection: [{ nestedGatedFieldD: 'D-1' }]
        }
      ]
    })
    const index = await appendEntryAt(buildRequest(), stubH(), nestedPath(0), {
      nestedGatedFieldD: 'D-2'
    })
    expect(index).toBe(1)
  })

  it('Should apply NO cap for a non-integer count value — garbage never blocks the append', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [
        {
          itemSelector: SELECTOR_DELTA,
          itemCount: 'many',
          nestedCollection: [{ nestedGatedFieldD: 'D-1' }]
        }
      ]
    })
    const index = await appendEntryAt(buildRequest(), stubH(), nestedPath(0), {
      nestedGatedFieldD: 'D-2'
    })
    expect(index).toBe(1)
  })

  it("Should resolve the cap per frame — one entry at its cap never blocks a sibling entry's append", async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [
        {
          itemSelector: SELECTOR_DELTA,
          itemCount: '1',
          nestedCollection: [{ nestedGatedFieldD: 'D-1' }]
        },
        {
          itemSelector: SELECTOR_DELTA,
          itemCount: '2',
          nestedCollection: [{ nestedGatedFieldD: 'D-2' }]
        }
      ]
    })
    expect(
      await appendEntryAt(buildRequest(), stubH(), nestedPath(0), {
        nestedGatedFieldD: 'D-X'
      })
    ).toBeNull()
    expect(
      await appendEntryAt(buildRequest(), stubH(), nestedPath(1), {
        nestedGatedFieldD: 'D-3'
      })
    ).toBe(1)
  })

  it('Should leave a collection WITHOUT the cardinality link uncapped — itemCollection appends stay unbounded', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [entry(SELECTOR_ALPHA, { itemCount: '1' })]
    })
    const index = await appendEntryAt(
      buildRequest(),
      stubH(),
      ['itemCollection'],
      entry(SELECTOR_DELTA)
    )
    expect(index).toBe(1)
  })
}

describe('path-addressed store ops at depth-2 (itemCollection[i].nestedCollection)', () => {
  setupJourneyEngine()

  nestedRecordCrudTests()
  cardinalityCapTests()

  it('Should destroy a nested composite block at its exact depth-2 path when the enclosing entry leaves the gate', async () => {
    await store.seedAnswers(journeyId, {
      itemCollection: [
        deltaEntry([
          { nestedGatedFieldD: 'D-1', nestedCompositeBlock: blockValue }
        ])
      ]
    })
    await commit(buildRequest(), stubH(), {
      itemCollection: [
        {
          itemSelector: SELECTOR_ECHO,
          nestedCollection: [
            {
              nestedFallbackFieldA: 'fallback-1',
              nestedCompositeBlock: blockValue
            }
          ]
        }
      ]
    })
    const persisted = projectAnswers(
      (await records.load({ journeyId })).fulfilment
    )
    const record = persisted.itemCollection[0].nestedCollection[0]
    expect(record.nestedFallbackFieldA).toBe('fallback-1')
    expect('nestedCompositeBlock' in record).toBe(false)
  })
})
