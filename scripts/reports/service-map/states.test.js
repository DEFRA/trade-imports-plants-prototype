import { describe, expect, it } from 'vitest'

import { ServiceMapProblem } from './install-set.js'
import { MAX_STATES, conditionOver, statesOf } from './states.js'

const TYPE = {
  id: 'commodityType',
  kind: 'decision',
  question: 'What are you importing?',
  values: [
    { value: 'potatoes', label: 'Potatoes' },
    { value: 'plants', label: 'Plants' },
    { value: 'wood', label: 'Wood' }
  ]
}
const READY = {
  id: 'everyTaskComplete',
  kind: 'ready',
  values: [
    { value: false, label: 'No' },
    { value: true, label: 'Yes' }
  ]
}
const DIMENSIONS = [TYPE, READY]
const STATES = statesOf(DIMENSIONS)

const holdsWhen = (predicate) => (index) => predicate(STATES[index])

describe('statesOf', () => {
  it('Should give every combination, the last dimension varying fastest', () => {
    expect(STATES).toEqual([
      { commodityType: 'potatoes', everyTaskComplete: false },
      { commodityType: 'potatoes', everyTaskComplete: true },
      { commodityType: 'plants', everyTaskComplete: false },
      { commodityType: 'plants', everyTaskComplete: true },
      { commodityType: 'wood', everyTaskComplete: false },
      { commodityType: 'wood', everyTaskComplete: true }
    ])
  })

  it('Should refuse more states than a readable map can show, naming the answers', () => {
    const wide = Array.from({ length: 9 }, (_, index) => ({
      id: `d${index}`,
      question: `Question ${index}`,
      values: [{ value: 1 }, { value: 2 }]
    }))
    expect(2 ** 9).toBeGreaterThan(MAX_STATES)
    expect(() => statesOf(wide)).toThrow(ServiceMapProblem)
    expect(() => statesOf(wide)).toThrow(/Question 0, Question 1/)
  })
})

describe('conditionOver', () => {
  it('Should drop an answer that never changes the outcome, and join values in the order the page offers them', () => {
    const condition = conditionOver({
      states: STATES,
      dimensions: DIMENSIONS,
      holds: holdsWhen((state) => state.commodityType !== 'potatoes')
    })
    expect(condition).toEqual({
      kind: 'values',
      when: '“What are you importing?” is “Plants” or “Wood”',
      text: 'If “What are you importing?” is “Plants” or “Wood”',
      clauses: [{ commodityType: ['plants', 'wood'] }],
      values: { commodityType: ['plants', 'wood'] }
    })
  })

  it('Should say always and never plainly', () => {
    expect(
      conditionOver({
        states: STATES,
        dimensions: DIMENSIONS,
        holds: () => true
      })
    ).toEqual({ kind: 'always' })
    expect(
      conditionOver({
        states: STATES,
        dimensions: DIMENSIONS,
        holds: () => false
      })
    ).toEqual({ kind: 'never' })
  })

  it('Should join two answers with "and", and alternatives with "; or"', () => {
    const condition = conditionOver({
      states: STATES,
      dimensions: DIMENSIONS,
      holds: holdsWhen(
        (state) =>
          state.commodityType === 'wood' ||
          (state.commodityType === 'potatoes' && state.everyTaskComplete)
      )
    })
    expect(condition.when).toBe(
      '“What are you importing?” is “Potatoes” and every task is complete; or “What are you importing?” is “Wood”'
    )
  })

  it('Should ignore states it is told not to care about', () => {
    const condition = conditionOver({
      states: STATES,
      dimensions: DIMENSIONS,
      holds: () => true,
      applies: holdsWhen((state) => state.commodityType === 'plants')
    })
    expect(condition).toEqual({ kind: 'always' })
  })
})
