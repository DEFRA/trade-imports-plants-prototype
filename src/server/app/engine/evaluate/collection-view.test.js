import { describe, expect, it } from 'vitest'
import { collectionView } from './collection-view.js'
import { evaluateAnswers } from '../../bridge/evaluation.js'
import {
  CATEGORY_ONE,
  SELECTOR_ALPHA,
  TAG_ONE
} from '../../../../../test/fixtures/index.js'

const completeEntry = {
  itemSelector: SELECTOR_ALPHA,
  itemCategory: CATEGORY_ONE,
  itemTags: [TAG_ONE],
  itemGatedField: '5',
  itemCount: '1',
  nestedCollection: [{ nestedGatedFieldA: 'A-1' }]
}

const incompleteEntry = { itemSelector: SELECTOR_ALPHA }

const viewOf = (answers, collectionPath) =>
  collectionView(answers, collectionPath, evaluateAnswers(answers))

describe('#collectionView', () => {
  it('Should map each stored entry to {index, path, entry} in order', () => {
    const answers = { itemCollection: [completeEntry, incompleteEntry] }
    const rows = viewOf(answers, ['itemCollection'])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ index: 0, path: ['itemCollection', 0] })
    expect(rows[0].entry).toBe(completeEntry)
    expect(rows[1]).toMatchObject({ index: 1, path: ['itemCollection', 1] })
    expect(rows[1].entry).toBe(incompleteEntry)
  })

  it('Should set complete per-row from entryComplete across a mixed list', () => {
    const rows = viewOf({ itemCollection: [completeEntry, incompleteEntry] }, [
      'itemCollection'
    ])
    expect(rows[0].complete).toBe(true)
    expect(rows[1].complete).toBe(false)
  })

  it('Should resolve a nested collection path to its own obligation and entries', () => {
    const answers = { itemCollection: [completeEntry] }
    const rows = viewOf(answers, ['itemCollection', 0, 'nestedCollection'])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      index: 0,
      path: ['itemCollection', 0, 'nestedCollection', 0]
    })
    expect(rows[0].entry).toBe(completeEntry.nestedCollection[0])
    expect(rows[0].complete).toBe(true)
  })

  it('Should fall back to complete:true when the collection path matches no obligation', () => {
    const rows = collectionView({ mystery: [{ a: 1 }] }, ['mystery'])
    expect(rows).toEqual([
      { index: 0, path: ['mystery', 0], entry: { a: 1 }, complete: true }
    ])
  })

  it('Should return an empty list when the collection is absent from answers', () => {
    expect(viewOf({}, ['itemCollection'])).toEqual([])
  })
})
