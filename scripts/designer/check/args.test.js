import { describe, expect, it } from 'vitest'

import { parseCheckArgs } from './args.js'

describe('parseCheckArgs', () => {
  it('Should default to the quick check', () => {
    expect(parseCheckArgs(['--set', 'plants-working'])).toEqual({
      set: 'plants-working',
      tier: 'quick',
      json: false,
      help: false,
      errors: []
    })
  })

  it.each([
    ['--quick', 'quick'],
    ['--full', 'full'],
    ['--walk', 'walk']
  ])('Should read %s', (flag, tier) => {
    expect(parseCheckArgs(['--set', 'plants-working', flag]).tier).toBe(tier)
  })

  it('Should read --set=<id>, a bare set id and --json', () => {
    expect(parseCheckArgs(['--set=plants-dr2', '--json'])).toMatchObject({
      set: 'plants-dr2',
      json: true
    })
    expect(parseCheckArgs(['plants-dr2']).set).toBe('plants-dr2')
  })

  it('Should leave the set empty when none is given', () => {
    expect(parseCheckArgs(['--full']).set).toBeUndefined()
  })

  it('Should explain a --set with nothing after it', () => {
    expect(parseCheckArgs(['--set', '--full']).errors).toEqual([
      '--set needs a set id after it, for example --set plants-working.'
    ])
  })

  it('Should refuse two tiers at once', () => {
    expect(parseCheckArgs(['--quick', '--walk']).errors).toEqual([
      'Choose one of --quick, --full or --walk, not several.'
    ])
  })

  it('Should name an option it does not know', () => {
    expect(parseCheckArgs(['--set', 'a', '--fast']).errors).toEqual([
      'I do not know "--fast".'
    ])
  })

  it('Should read --help', () => {
    expect(parseCheckArgs(['--help']).help).toBe(true)
  })
})
