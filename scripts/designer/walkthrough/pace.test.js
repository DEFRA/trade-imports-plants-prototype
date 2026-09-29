import { describe, expect, it } from 'vitest'

import {
  PACES,
  keyDelayFor,
  paceFromEnv,
  readingTimeMs,
  roleOfStep
} from './pace.js'

describe('readingTimeMs', () => {
  it('Should clamp a short page to the minimum reading time', () => {
    expect(readingTimeMs(1, PACES.human)).toBe(2000)
  })

  it('Should clamp a long page to the maximum reading time', () => {
    expect(readingTimeMs(200, PACES.human)).toBe(6000)
  })

  it('Should grow with the word count between the bounds', () => {
    expect(readingTimeMs(20, PACES.human)).toBe(1500 + 20 * 60)
  })

  it('Should use the wider bounds for a final page', () => {
    expect(readingTimeMs(1, PACES.human, 'final')).toBe(4000)
    expect(readingTimeMs(200, PACES.human, 'final')).toBe(8000)
  })

  it('Should use the error bounds for an error summary', () => {
    expect(readingTimeMs(1, PACES.human, 'errors')).toBe(2500)
    expect(readingTimeMs(200, PACES.human, 'errors')).toBe(5000)
  })

  it('Should always be zero at the fast pace', () => {
    expect(readingTimeMs(200, PACES.fast)).toBe(0)
    expect(readingTimeMs(200, PACES.fast, 'final')).toBe(0)
  })
})

describe('keyDelayFor', () => {
  it('Should use the pace’s own delay for a short value', () => {
    expect(keyDelayFor('GB', PACES.human)).toBe(70)
  })

  it('Should type a long value faster, never longer than maxTypingMs', () => {
    const value = 'x'.repeat(100)

    expect(keyDelayFor(value, PACES.human)).toBe(Math.floor(2500 / 100))
  })

  it('Should not divide by zero for an empty value', () => {
    expect(keyDelayFor('', PACES.human)).toBe(70)
  })

  it('Should always be zero at the fast pace', () => {
    expect(keyDelayFor('anything', PACES.fast)).toBe(0)
  })
})

describe('paceFromEnv', () => {
  it.each([
    [undefined, 'human'],
    [null, 'human'],
    ['', 'human'],
    ['human', 'human'],
    ['fast', 'fast']
  ])('Should read %j as %j, with no warning', (value, name) => {
    expect(paceFromEnv(value)).toEqual({ name, warning: null })
  })

  it('Should fall back to human for an unknown value, with a warning', () => {
    expect(paceFromEnv('turbo')).toEqual({
      name: 'human',
      warning:
        'WALKTHROUGH_PACE was "turbo", which is neither "human" nor "fast". Using human pacing.'
    })
  })
})

describe('roleOfStep', () => {
  it.each([
    ['confirmation', 'final'],
    ['dashboard-afterwards', 'final'],
    ['after-amend', 'final'],
    ['after-delete', 'final']
  ])('Should call %j a final page', (key, role) => {
    expect(roleOfStep(key)).toBe(role)
  })

  it.each(['dashboard', 'origin', 'task-list', 'notification-view'])(
    'Should call %j a plain page',
    (key) => {
      expect(roleOfStep(key)).toBe('page')
    }
  )
})
