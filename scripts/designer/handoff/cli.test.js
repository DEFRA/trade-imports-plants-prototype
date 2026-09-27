import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { HandoffError } from './build.js'
import { outputDir, parseArgs, resolveOptions } from './cli.js'

describe('parseArgs', () => {
  it('Should read the release, features and slug', () => {
    expect(
      parseArgs([
        '--set',
        'plants-working',
        '--features',
        'origin,arrival-details',
        '--slug',
        'arrival-hint'
      ])
    ).toEqual({
      set: 'plants-working',
      features: ['origin', 'arrival-details'],
      recipes: [],
      slug: 'arrival-hint'
    })
  })

  it('Should accept name=value and repeated recipes', () => {
    expect(
      parseArgs([
        '--set=plants-working',
        '--recipe',
        'add-a-field',
        '--recipe=add-a-branch',
        '--all',
        '--dry-run'
      ])
    ).toEqual({
      set: 'plants-working',
      features: [],
      recipes: ['add-a-field', 'add-a-branch'],
      all: true,
      dryRun: true
    })
  })

  it('Should refuse an option it does not know', () => {
    expect(() => parseArgs(['--push'])).toThrow(HandoffError)
  })

  it('Should refuse an option with no value', () => {
    expect(() => parseArgs(['--set', '--all'])).toThrow('--set needs a value.')
  })

  it('Should refuse --features with --all', () => {
    expect(() => parseArgs(['--set', 'a', '--all', '--features', 'b'])).toThrow(
      'Use --features or --all, not both.'
    )
  })
})

describe('resolveOptions', () => {
  it('Should default the slug to the set and build the folder name', () => {
    const resolved = resolveOptions({
      set: 'plants-working',
      date: '2026-09-27'
    })

    expect(resolved.folderName).toBe('2026-09-27-plants-working')
    expect(resolved.title).toBe(
      'Plants working: hand-off from the plants prototype'
    )
  })

  it('Should ask for a release when none is given', () => {
    expect(() => resolveOptions({})).toThrow(
      'Say which design release to hand over'
    )
  })

  it('Should refuse a slug that cannot be a folder name', () => {
    expect(() =>
      resolveOptions({ set: 'plants-working', slug: '../../etc' })
    ).toThrow('cannot be a folder name')
  })

  it('Should refuse a date in another format', () => {
    expect(() =>
      resolveOptions({ set: 'plants-working', date: '27/09/2026' })
    ).toThrow('--date must look like 2026-09-27')
  })
})

describe('outputDir', () => {
  const resolved = { folderName: '2026-09-27-plants-working' }

  it('Should write to handoffs/ normally', () => {
    expect(outputDir('/repo', resolved)).toBe(
      path.join('/repo', 'handoffs', '2026-09-27-plants-working')
    )
  })

  it('Should write to the ignored cache for a dry run', () => {
    expect(outputDir('/repo', { ...resolved, dryRun: true })).toBe(
      path.join('/repo', '.cache/designer/handoff', '2026-09-27-plants-working')
    )
  })
})
