import { describe, expect, it } from 'vitest'
import {
  camelCase,
  isKebabCase,
  screamingSnakeCase,
  sentenceCase
} from './names.js'

describe('isKebabCase', () => {
  it.each([
    ['sample-journey', true],
    ['high-risk-plants', true],
    ['single', true],
    ['Sample-Journey', false],
    ['sample_journey', false],
    ['-sample', false],
    ['sample-', false],
    ['', false]
  ])('%s -> %s', (id, expected) => {
    expect(isKebabCase(id)).toBe(expected)
  })
})

describe('camelCase', () => {
  it('Should join hyphenated words, capitalising every word but the first', () => {
    expect(camelCase('sample-journey')).toBe('sampleJourney')
    expect(camelCase('high-risk-plants')).toBe('highRiskPlants')
  })

  it('Should leave a single word untouched', () => {
    expect(camelCase('sample')).toBe('sample')
  })
})

describe('sentenceCase', () => {
  it('Should replace hyphens with spaces and capitalise only the first letter', () => {
    expect(sentenceCase('sample-journey')).toBe('Sample journey')
    expect(sentenceCase('high-risk-plants')).toBe('High risk plants')
  })
})

describe('screamingSnakeCase', () => {
  it('Should replace hyphens with underscores and upper-case the whole id', () => {
    expect(screamingSnakeCase('sample-journey')).toBe('SAMPLE_JOURNEY')
  })
})
