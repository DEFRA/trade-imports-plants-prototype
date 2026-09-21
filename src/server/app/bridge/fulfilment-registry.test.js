import { describe, expect, it } from 'vitest'
import { feature, grouped, scalar } from './fulfilment-bindings.js'
import { createFulfilmentRegistry } from './fulfilment-registry.js'
import {
  featureEvaluationBindings,
  itemCollection,
  nestedGatedFieldA,
  scalarField
} from '../../../../test/fixtures/index.js'

describe('#createFulfilmentRegistry', () => {
  it('Should accept the complete feature-owned registry', () => {
    expect(() =>
      createFulfilmentRegistry(featureEvaluationBindings)
    ).not.toThrow()
  })

  it('Should reject missing obligation ownership', () => {
    const withoutScalars = featureEvaluationBindings.filter(
      ({ name }) => name !== 'scalars'
    )
    expect(() => createFulfilmentRegistry(withoutScalars)).toThrow(
      /owned by no feature.*scalarField/
    )
  })

  it('Should reject duplicate obligation ownership', () => {
    const duplicate = feature('duplicate-scalars', [
      scalar({ field: 'scalarField', obligation: scalarField })
    ])
    expect(() =>
      createFulfilmentRegistry([...featureEvaluationBindings, duplicate])
    ).toThrow(/owned by both "scalars" and "duplicate-scalars"/)
  })

  it('Should reject a grouped binding with the wrong collection path', () => {
    const items = featureEvaluationBindings.find(({ name }) => name === 'items')
    const wronglyPathed = feature('items', [
      ...items.bindings.filter(
        ({ obligation }) => obligation !== nestedGatedFieldA
      ),
      grouped({
        field: 'nestedGatedFieldA',
        obligation: nestedGatedFieldA,
        groups: [
          {
            field: 'itemCollection',
            token: 'item',
            obligation: itemCollection
          }
        ]
      })
    ])
    const registryWithWrongPath = featureEvaluationBindings.map((bindings) =>
      bindings === items ? wronglyPathed : bindings
    )
    expect(() => createFulfilmentRegistry(registryWithWrongPath)).toThrow(
      /requires depth 2/
    )
  })

  it('Should reject a path containing store-path metacharacters', () => {
    const invalidPath = feature('invalid-path', [
      scalar({ field: 'scalar.Field', obligation: scalarField })
    ])
    expect(() =>
      createFulfilmentRegistry([invalidPath], [scalarField])
    ).toThrow(/invalid store field/)
  })
})
