import { describe, expect, it } from 'vitest'
import { deleteAt, destroyWiped, pathKey, setAt, valueAt } from './path.js'
import { SELECTOR_ALPHA, VALUE_ONE } from '../../../../test/fixtures/index.js'

describe('#pathKey / #valueAt / #setAt / #deleteAt', () => {
  it('Should collapse a depth-0 path to the legacy bare id', () => {
    expect(pathKey(['itemCollection'])).toBe('itemCollection')
    expect(pathKey(['scalarField'])).toBe('scalarField')
  })

  it('Should encode indexed instance paths', () => {
    expect(pathKey(['itemCollection', 0, 'itemSelector'])).toBe(
      'itemCollection[0].itemSelector'
    )
    expect(pathKey(['itemCollection', 2, 'itemCount'])).toBe(
      'itemCollection[2].itemCount'
    )
  })

  const nestedAnswers = {
    itemCollection: [{ itemSelector: SELECTOR_ALPHA, itemCount: '25' }]
  }

  it('Should read a leaf value at a nested path', () => {
    expect(valueAt(nestedAnswers, ['itemCollection', 0, 'itemSelector'])).toBe(
      SELECTOR_ALPHA
    )
  })

  it('Should read a sibling leaf value at a nested path', () => {
    expect(valueAt(nestedAnswers, ['itemCollection', 0, 'itemCount'])).toBe(
      '25'
    )
  })

  it('Should return the whole array when the path targets a collection', () => {
    expect(valueAt(nestedAnswers, ['itemCollection'])).toEqual([
      { itemSelector: SELECTOR_ALPHA, itemCount: '25' }
    ])
  })

  it('Should return undefined for an out-of-range index', () => {
    expect(
      valueAt(nestedAnswers, ['itemCollection', 5, 'itemSelector'])
    ).toBeUndefined()
  })

  it('Should set a value at a nested path without mutating the input', () => {
    const answers = {
      itemCollection: [{ itemSelector: SELECTOR_ALPHA }]
    }
    const next = setAt(answers, ['itemCollection', 0, 'itemCount'], '25')
    expect(next.itemCollection[0].itemCount).toBe('25')
    expect(answers.itemCollection[0].itemCount).toBeUndefined()
  })

  it('Should delete a leaf key at a nested path', () => {
    const answers = {
      itemCollection: [{ itemSelector: SELECTOR_ALPHA, itemCount: '25' }]
    }
    deleteAt(answers, ['itemCollection', 0, 'itemCount'])
    expect(answers.itemCollection[0]).toEqual({
      itemSelector: SELECTOR_ALPHA
    })
  })

  it('Should splice an indexed entry out when the leaf is an array index', () => {
    const answers = {
      itemCollection: [{ itemSelector: 'a' }, { itemSelector: 'b' }]
    }
    deleteAt(answers, ['itemCollection', 0])
    expect(answers.itemCollection).toEqual([{ itemSelector: 'b' }])
  })

  it('Should delete a whole collection at a depth-0 path (=== delete answers.id)', () => {
    const answers = {
      itemCollection: [{ itemSelector: 'a' }],
      other: 1
    }
    deleteAt(answers, ['itemCollection'])
    expect(answers).toEqual({ other: 1 })
  })
})

const FIRST_ITEM_ENTRY_KEY = 'itemCollection[0]'

describe('#wipeOrder — sibling-safe deletion order', () => {
  const applyWipes = (answers, keys) => {
    destroyWiped(answers, keys)
    return answers
  }

  it('Should destroy both siblings when two array indices are wiped', () => {
    expect(
      applyWipes({ itemCollection: [{ id: 'a' }, { id: 'b' }] }, [
        FIRST_ITEM_ENTRY_KEY,
        'itemCollection[1]'
      ]).itemCollection
    ).toEqual([])
  })

  it('Should destroy every sibling when a whole array is wiped index-by-index', () => {
    expect(
      applyWipes({ itemCollection: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }, [
        FIRST_ITEM_ENTRY_KEY,
        'itemCollection[1]',
        'itemCollection[2]'
      ]).itemCollection
    ).toEqual([])
  })

  it('Should delete a nested field before its container entry is spliced away', () => {
    const answers = { itemCollection: [{ x: '1' }, { x: '2' }] }
    applyWipes(answers, [FIRST_ITEM_ENTRY_KEY, 'itemCollection[0].x'])
    expect(answers.itemCollection).toEqual([{ x: '2' }])
  })

  it('Should delete a sibling array-index and a nested path in order via destroyWiped', () => {
    const answers = {
      itemCollection: [
        { itemSelector: 'a', itemCount: '100' },
        { itemSelector: 'b', itemCount: '200' }
      ],
      scalarField: VALUE_ONE
    }
    destroyWiped(answers, [FIRST_ITEM_ENTRY_KEY, 'itemCollection[1].itemCount'])
    expect(answers).toEqual({
      itemCollection: [{ itemSelector: 'b' }],
      scalarField: VALUE_ONE
    })
  })
})
