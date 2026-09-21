import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  appendEntryAt,
  removeEntryAt,
  reconcileEntriesAt,
  updateEntryAt
} from './index.js'
import { store } from './store.js'
import { configureRecords } from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { assembleFulfilments } from '../bridge/assemble-fulfilments.js'
import { purgeFulfilments, wipeSet } from '../bridge/purge.js'
import { stubH, journeyRequest } from './test-support.js'
import {
  CATEGORY_ONE,
  CATEGORY_TWO,
  SELECTOR_ALPHA,
  SELECTOR_BRAVO,
  SELECTOR_CHARLIE,
  TOGGLE_NO
} from '../../../../test/fixtures/index.js'

// Mutator behaviour. Storage is positional (an array; the evaluator holds no
// instance record and infers instances from leaf composite prefixes), so every
// mutator's storage mechanic — index-minting, in-place `with`, `toSpliced`,
// key-matched reconcile — is a storage concern:
//   - append/update/remove/reconcile store positionally;
//   - append's cap rejection fires via `collectionCapAt` (`maxEntriesFrom`);
//   - an empty appended entry survives in storage even though the evaluator
//     cannot address it (no leaf → no evaluator instance);
//   - remove/reconcile route their purge to the evaluator (evaluator-authoritative
//     wipe of now-orphaned notification-level data).

let journeyId
const buildRequest = () => journeyRequest(journeyId)
const answersNow = async () => (await store.get(journeyId)).answers
const wipeOf = (answers) => {
  const fulfilments = assembleFulfilments(answers)
  return wipeSet(fulfilments, purgeFulfilments(fulfilments))
}

const entry = (itemSelector, extra = {}) => ({
  itemSelector,
  itemCategory: CATEGORY_ONE,
  itemCount: '25',
  ...extra
})

const nestedPath = (entryIndex) => [
  'itemCollection',
  entryIndex,
  'nestedCollection'
]

describe('mutators — storage is positional, purge is evaluator-authoritative', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    configureReadyForCheckYourAnswers(() => false)
  })
  beforeEach(async () => {
    await store.clear()
    journeyId = (await store.create()).journeyId
  })

  describe('#appendEntryAt — mints the next index, stores positionally', () => {
    it('Should append a collection entry and persist it in positional order', async () => {
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
  })

  describe('#updateEntryAt — edits in place, siblings intact', () => {
    it('Should edit an entry in place', async () => {
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
      const entries = (await answersNow()).itemCollection
      expect(entries[0].itemSelector).toBe(SELECTOR_CHARLIE)
      expect(entries[1].itemSelector).toBe(SELECTOR_BRAVO)
    })
  })

  describe('#removeEntryAt — splices positionally, siblings intact', () => {
    it('Should remove an entry by index', async () => {
      await store.seedAnswers(journeyId, {
        itemCollection: [entry(SELECTOR_ALPHA), entry(SELECTOR_BRAVO)]
      })
      await removeEntryAt(buildRequest(), stubH(), ['itemCollection'], 0)
      expect(
        (await answersNow()).itemCollection.map((stored) => stored.itemSelector)
      ).toEqual([SELECTOR_BRAVO])
    })
  })

  describe('#appendEntryAt cap — `maxEntriesFrom` fires', () => {
    const cappedEntry = () => ({
      itemSelector: SELECTOR_BRAVO,
      itemCount: '2',
      nestedCollection: [
        { nestedGatedFieldB: 'B-1' },
        { nestedGatedFieldB: 'B-2' }
      ]
    })

    it('Should reject an append at the sibling-count cap', async () => {
      await store.seedAnswers(journeyId, { itemCollection: [cappedEntry()] })
      const rejected = await appendEntryAt(
        buildRequest(),
        stubH(),
        nestedPath(0),
        { nestedGatedFieldB: 'B-3' }
      )
      expect(rejected).toBeNull()
      expect(
        (await answersNow()).itemCollection[0].nestedCollection
      ).toHaveLength(2)
    })
  })

  describe('#appendEntryAt — an empty appended entry is not persisted', () => {
    it('Should accept the ruled loss of a leaf-less unit the canonical evaluator cannot express', async () => {
      // No itemCount → uncapped (blank-count semantics).
      await store.seedAnswers(journeyId, {
        itemCollection: [{ itemSelector: SELECTOR_BRAVO, nestedCollection: [] }]
      })
      const index = await appendEntryAt(
        buildRequest(),
        stubH(),
        nestedPath(0),
        {}
      )
      expect(index).toBe(0)
      // The evaluator infers instances from leaf composite prefixes, so this
      expect(
        (await answersNow()).itemCollection[0].nestedCollection
      ).toBeUndefined()
    })
  })

  describe('#removeEntryAt — the purge is evaluator-authoritative', () => {
    it('Should let the evaluator purge a now-orphaned top-level answer when the last triggering entry is removed', async () => {
      // aggregateGatedToggle is gated (anyAllowListed) on an entry whose
      // itemSelector is SELECTOR_BRAVO existing in ANY entry, and is purged
      // when none does.
      await store.seedAnswers(journeyId, {
        aggregateGatedToggle: TOGGLE_NO,
        itemCollection: [
          { itemSelector: SELECTOR_BRAVO, itemCategory: CATEGORY_ONE },
          { itemSelector: SELECTOR_CHARLIE, itemCategory: CATEGORY_TWO }
        ]
      })
      // After removing the SELECTOR_BRAVO entry, the evaluator owns the wipe.
      const afterRemoval = {
        aggregateGatedToggle: TOGGLE_NO,
        itemCollection: [
          { itemSelector: SELECTOR_CHARLIE, itemCategory: CATEGORY_TWO }
        ]
      }
      expect(wipeOf(afterRemoval)).toContain('aggregateGatedToggle')

      await removeEntryAt(buildRequest(), stubH(), ['itemCollection'], 0)
      const answers = await answersNow()
      expect(
        answers.itemCollection.map((stored) => stored.itemSelector)
      ).toEqual([SELECTOR_CHARLIE])
      expect('aggregateGatedToggle' in answers).toBe(false)
    })
  })

  describe('#reconcileEntriesAt — multi-select sync + evaluator-authoritative purge', () => {
    const keyOf = (stored) => `${stored.itemSelector}|${stored.itemCategory}`
    const reconcileEntries = (entries) =>
      reconcileEntriesAt(
        buildRequest(),
        stubH(),
        ['itemCollection'],
        keyOf,
        entries
      )

    it('Should sync the collection to the desired set, preserving kept entries', async () => {
      await store.seedAnswers(journeyId, {
        itemCollection: [
          {
            itemSelector: SELECTOR_ALPHA,
            itemCategory: CATEGORY_ONE,
            itemCount: '25',
            nestedCollection: [{ nestedGatedFieldA: 'A-1' }]
          }
        ]
      })
      await reconcileEntries([
        { itemSelector: SELECTOR_ALPHA, itemCategory: CATEGORY_ONE },
        { itemSelector: SELECTOR_ALPHA, itemCategory: CATEGORY_TWO }
      ])
      const entries = (await answersNow()).itemCollection
      expect(entries).toHaveLength(2)
      // The kept entry retains ALL its data — positional key-matched merge.
      expect(entries[0].nestedCollection).toEqual([
        { nestedGatedFieldA: 'A-1' }
      ])
      expect(entries[1]).toEqual({
        itemSelector: SELECTOR_ALPHA,
        itemCategory: CATEGORY_TWO
      })
    })

    it('Should run the evaluator as the wipe authority: deselecting the last triggering entry destroys the dependent', async () => {
      await store.seedAnswers(journeyId, {
        aggregateGatedToggle: TOGGLE_NO,
        itemCollection: [
          { itemSelector: SELECTOR_BRAVO, itemCategory: CATEGORY_ONE },
          { itemSelector: SELECTOR_CHARLIE, itemCategory: CATEGORY_TWO }
        ]
      })
      await reconcileEntries([
        { itemSelector: SELECTOR_CHARLIE, itemCategory: CATEGORY_TWO }
      ])
      const answers = await answersNow()
      expect('aggregateGatedToggle' in answers).toBe(false)
    })
  })
})
