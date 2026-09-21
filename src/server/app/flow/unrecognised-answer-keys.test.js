import { describe, expect, it } from 'vitest'
import { unrecognisedAnswerKeys } from '../bridge/obligation-source.js'
import {
  BOUNDED_TYPE_ONE,
  FLOW_ONLY_KEY,
  SELECTOR_BRAVO,
  VALUE_ONE
} from '../../../../test/fixtures/index.js'

// The recognition surface: manifest obligation names in their declared
// positions, flow-only keys and system keys. Anything else is inert to the
// evaluator yet ships raw at finalise — these tests pin that such keys are
// reported, with their path.

describe('#unrecognisedAnswerKeys', () => {
  it('Should report a typo of an obligation name at top level', () => {
    expect(unrecognisedAnswerKeys({ scalarFeild: VALUE_ONE })).toEqual([
      { key: 'scalarFeild', path: '(top level)' }
    ])
  })

  it('Should report a typo inside a nested collection entry, with its path', () => {
    const answers = {
      itemCollection: [
        {
          itemSelector: SELECTOR_BRAVO,
          nestedCollection: [{ nestedGatedFeildB: VALUE_ONE }]
        }
      ]
    }
    expect(unrecognisedAnswerKeys(answers)).toEqual([
      {
        key: 'nestedGatedFeildB',
        path: 'itemCollection[0].nestedCollection[0]'
      }
    ])
  })

  it('Should report an unknown key on a bounded-collection entry but allow its manifest obligations', () => {
    const answers = {
      boundedCollection: [
        {
          boundedItemType: BOUNDED_TYPE_ONE,
          boundedItemUploadId: 'u-1',
          boundedItemFilename: 'attachment.pdf',
          bogusKey: 'x'
        }
      ]
    }
    expect(unrecognisedAnswerKeys(answers)).toEqual([
      { key: 'bogusKey', path: 'boundedCollection[0]' }
    ])
  })

  it('Should recognise the flow-only and system keys', () => {
    expect(
      unrecognisedAnswerKeys({
        [FLOW_ONLY_KEY]: 'confirmed',
        referenceNumber: 'REF-26-0001'
      })
    ).toEqual([])
  })

  it('Should treat values below a leaf key as opaque', () => {
    // compositeBlockTwo is a leaf obligation whose value is a composite; its
    // sub-shape belongs to the feature, not the recognition surface.
    expect(
      unrecognisedAnswerKeys({ compositeBlockTwo: { anything: { at: 'all' } } })
    ).toEqual([])
  })
})
