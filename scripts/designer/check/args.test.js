import { describe, expect, it } from 'vitest'

import { parseCheckArgs } from './args.js'

describe('parseCheckArgs', () => {
  it('Should default to the quick check', () => {
    expect(parseCheckArgs(['--set', 'plants-working'])).toEqual({
      set: 'plants-working',
      tier: 'quick',
      json: false,
      help: false,
      since: undefined,
      noNewPatterns: false,
      errors: []
    })
  })

  it('Should read --since and --no-new-patterns together', () => {
    expect(
      parseCheckArgs(['--set', 'a', '--since', 'abc123', '--no-new-patterns'])
    ).toMatchObject({ since: 'abc123', noNewPatterns: true, errors: [] })
    expect(parseCheckArgs(['--since=abc123']).since).toBe('abc123')
  })

  it('Should refuse --no-new-patterns without the commit the run started from', () => {
    expect(parseCheckArgs(['--set', 'a', '--no-new-patterns']).errors).toEqual([
      '--no-new-patterns needs the commit the run started from: add --since <commit>.'
    ])
  })

  it('Should read --mandate with --since', () => {
    expect(
      parseCheckArgs(['--set', 'a', '--since', 'abc123', '--mandate', 'm-1'])
    ).toMatchObject({ since: 'abc123', mandate: 'm-1', errors: [] })
  })

  it('Should refuse --mandate without --since, or beside --no-new-patterns', () => {
    expect(parseCheckArgs(['--mandate', 'm-1']).errors).toEqual([
      '--mandate needs the commit the run started from: add --since <commit>.'
    ])
    expect(
      parseCheckArgs(['--since', 'a', '--mandate', 'm-1', '--no-new-patterns'])
        .errors
    ).toEqual([
      'Choose --no-new-patterns for a run with no mandate, or --mandate for a run with one, not both.'
    ])
  })

  it('Should explain a --since with nothing after it', () => {
    expect(parseCheckArgs(['--since', '--full']).errors).toEqual([
      '--since needs a commit after it, for example --since 1a2b3c4: the commit the run started from.'
    ])
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
