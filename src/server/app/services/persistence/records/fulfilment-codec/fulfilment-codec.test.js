import { describe, expect, test } from 'vitest'
import { createObligationEvaluator } from '../../../../model/obligations/evaluator.js'
import {
  BRANCH_A,
  BRANCH_B,
  branchSelector,
  compositeBlockOne,
  compositeBlockValue,
  itemSelector,
  nestedGatedFieldA,
  obligations,
  optionalScalarField,
  SELECTOR_ALPHA,
  SELECTOR_BRAVO,
  SELECTOR_CHARLIE,
  VALUE_ONE,
  VALUE_TWO
} from '../../../../../../../test/fixtures/index.js'
import {
  decodePersistedFulfilment,
  encodeEvaluatorFulfilments
} from './index.js'

// The codec is journey-agnostic: it needs a manifest only to tell a scalar
// obligation from a grouped one and to check composite-id depth. It reads the
// synthetic fixture set the suite installs globally, which offers all three
// shapes it cares about — top-level scalars, a depth-1 field on a collection,
// and a depth-2 field on a nested collection.

const evaluator = createObligationEvaluator({ obligations })

const NESTED_VALUE = 'nested-a-1'

const mapCorpus = [
  {
    name: 'explicit-non-manifest-key-order',
    map: {
      [nestedGatedFieldA.id]: {
        'entry1.record2': '',
        'entry0.record0': NESTED_VALUE
      },
      [branchSelector.id]: BRANCH_A,
      [itemSelector.id]: {
        entry1: SELECTOR_BRAVO,
        entry0: SELECTOR_CHARLIE
      }
    }
  },
  {
    name: 'opaque-scalar-values',
    map: {
      [optionalScalarField.id]: [VALUE_ONE, VALUE_TWO],
      [compositeBlockOne.id]: compositeBlockValue('one'),
      [branchSelector.id]: ''
    }
  }
]

describe('persisted fulfilment codec', () => {
  test.each(mapCorpus)(
    'Should losslessly round-trip the $name evaluator map',
    ({ map }) => {
      const encoded = encodeEvaluatorFulfilments(map)
      const decoded = decodePersistedFulfilment(encoded)

      expect(decoded).toEqual(map)
      expect(JSON.stringify(decoded)).toBe(JSON.stringify(map))
      expect(encodeEvaluatorFulfilments(decoded)).toEqual(encoded)
      expect(JSON.stringify(encodeEvaluatorFulfilments(decoded))).toBe(
        JSON.stringify(encoded)
      )
    }
  )

  test('Should emit the canonical entry and record field shapes in input order', () => {
    const persisted = [
      {
        value: BRANCH_A,
        obligationId: branchSelector.id
      },
      {
        records: [
          { value: SELECTOR_CHARLIE, fulfilmentId: 'entry1' },
          { value: SELECTOR_ALPHA, fulfilmentId: 'entry0' }
        ],
        obligationId: itemSelector.id
      }
    ]

    expect(
      JSON.stringify(
        encodeEvaluatorFulfilments(decodePersistedFulfilment(persisted))
      )
    ).toBe(
      JSON.stringify([
        {
          obligationId: branchSelector.id,
          value: BRANCH_A
        },
        {
          obligationId: itemSelector.id,
          records: [
            { fulfilmentId: 'entry1', value: SELECTOR_CHARLIE },
            { fulfilmentId: 'entry0', value: SELECTOR_ALPHA }
          ]
        }
      ])
    )
  })

  test.each(mapCorpus)(
    'Should pass both golden-equivalence gates for $name',
    ({ map }) => {
      const decodedMap = decodePersistedFulfilment(
        encodeEvaluatorFulfilments(map)
      )

      expect(JSON.stringify(decodedMap)).toBe(JSON.stringify(map))

      const oldEvaluation = evaluator.evaluate(map)
      const decodedEvaluation = evaluator.evaluate(decodedMap)
      expect(JSON.stringify(decodedEvaluation.fulfilments)).toBe(
        JSON.stringify(oldEvaluation.fulfilments)
      )
      expect(JSON.stringify(decodedEvaluation.obligations)).toBe(
        JSON.stringify(oldEvaluation.obligations)
      )
    }
  )

  test.each([
    {
      name: 'duplicate obligation ids',
      persisted: [
        { obligationId: branchSelector.id, value: BRANCH_B },
        { obligationId: branchSelector.id, value: BRANCH_A }
      ],
      error: /duplicate obligationId/
    },
    {
      name: 'duplicate fulfilment ids within one obligation',
      persisted: [
        {
          obligationId: itemSelector.id,
          records: [
            { fulfilmentId: 'entry0', value: SELECTOR_ALPHA },
            { fulfilmentId: 'entry0', value: SELECTOR_CHARLIE }
          ]
        }
      ],
      error: /duplicate fulfilmentId/
    },
    {
      name: 'an entry with both value and records',
      persisted: [
        {
          obligationId: branchSelector.id,
          value: BRANCH_B,
          records: [{ fulfilmentId: 'entry0', value: SELECTOR_ALPHA }]
        }
      ],
      error: /exactly one of value or records/
    },
    {
      name: 'an entry with neither value nor records',
      persisted: [{ obligationId: branchSelector.id }],
      error: /exactly one of value or records/
    },
    {
      name: 'an empty records array',
      persisted: [{ obligationId: itemSelector.id, records: [] }],
      error: /non-empty array/
    },
    {
      name: 'records for a current scalar obligation',
      persisted: [
        {
          obligationId: branchSelector.id,
          records: [{ fulfilmentId: 'entry0', value: BRANCH_B }]
        }
      ],
      error: /must use value/
    },
    {
      name: 'value for a current grouped obligation',
      persisted: [{ obligationId: itemSelector.id, value: SELECTOR_ALPHA }],
      error: /must use records/
    },
    {
      name: 'a composite id deeper than the current within chain',
      persisted: [
        {
          obligationId: itemSelector.id,
          records: [{ fulfilmentId: 'entry0.record0', value: SELECTOR_ALPHA }]
        }
      ],
      error: /requires depth 1/
    },
    {
      name: 'a composite id shallower than the current within chain',
      persisted: [
        {
          obligationId: nestedGatedFieldA.id,
          records: [{ fulfilmentId: 'entry0', value: NESTED_VALUE }]
        }
      ],
      error: /requires depth 2/
    },
    {
      name: 'a segment without a trailing numeric index',
      persisted: [
        {
          obligationId: nestedGatedFieldA.id,
          records: [
            { fulfilmentId: 'entry0.record-unknown', value: NESTED_VALUE }
          ]
        }
      ],
      error: /trailing numeric index/
    }
  ])('Should reject $name', ({ persisted, error }) => {
    expect(() => decodePersistedFulfilment(persisted)).toThrow(error)
  })

  test('Should preserve unknown UUID entries before the evaluator drops them', () => {
    const unknownScalarId = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
    const unknownGroupedId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    const persisted = [
      {
        obligationId: unknownScalarId,
        value: { legacyValue: true }
      },
      {
        obligationId: unknownGroupedId,
        records: [
          { fulfilmentId: 'historic2', value: 'first' },
          { fulfilmentId: 'historic0.record3', value: { untouched: true } }
        ]
      }
    ]

    const decoded = decodePersistedFulfilment(persisted)

    expect(decoded).toHaveProperty(unknownScalarId, { legacyValue: true })
    expect(decoded).toHaveProperty(unknownGroupedId, {
      historic2: 'first',
      'historic0.record3': { untouched: true }
    })
    expect(encodeEvaluatorFulfilments(decoded)).toEqual(persisted)

    const evaluated = evaluator.evaluate(decoded)
    expect(evaluated.fulfilments).not.toHaveProperty(unknownScalarId)
    expect(evaluated.fulfilments).not.toHaveProperty(unknownGroupedId)
    expect(evaluated.fulfilments).toEqual({})
  })
})
