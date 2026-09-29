import { describe, expect, it } from 'vitest'

import { isOpaque, probeGate } from './probe-scope.js'

const scope = (inScope, answered = []) => ({
  inScope: new Set(inScope),
  has: (id) => inScope.includes(id),
  answered: (id) => answered.includes(id),
  readyForCheckYourAnswers: false
})

describe('probeGate', () => {
  it('Should record the check your answers flag as a known read', () => {
    const reads = probeGate((s) => s.readyForCheckYourAnswers, [scope([])])
    expect(reads).toEqual({
      ready: true,
      inScope: false,
      has: [],
      answered: [],
      other: []
    })
    expect(isOpaque(reads)).toBe(false)
  })

  it('Should record which questions a designer’s own gate asks about, across every state', () => {
    const gate = (s) => s.has('consignor') || s.answered('arrivalStatus')
    const reads = probeGate(gate, [scope(['consignor']), scope([])])
    expect(reads.has).toEqual(['consignor'])
    expect(reads.answered).toEqual(['arrivalStatus'])
    expect(isOpaque(reads)).toBe(false)
  })

  it('Should mark a gate that reads anything else, or stops with an error, as a rule it cannot read', () => {
    expect(probeGate((s) => s.somethingElse, [scope([])]).other).toEqual([
      'somethingElse'
    ])
    const throwing = probeGate(() => {
      throw new Error('boom')
    }, [scope([])])
    expect(isOpaque(throwing)).toBe(true)
  })
})
