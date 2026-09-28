import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { HandoffError } from './build.js'
import { outputDir, parseArgs, readCriteria, resolveOptions } from './cli.js'

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
      links: [],
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
      links: [],
      all: true,
      dryRun: true
    })
  })

  it('Should read the story options, repeated links and brief only', () => {
    expect(
      parseArgs([
        '--set',
        'plants-working',
        '--as',
        'a trader importing plants',
        '--want',
        'to say the plants were grown under glass',
        '--so-that',
        'the inspector knows before they arrive',
        '--criteria',
        '.cache/designer/handoff/glass.criteria.txt',
        '--link',
        'https://github.com/DEFRA/trade-imports-plants-prototype/tree/design/plants-working-glass',
        '--link=https://github.com/DEFRA/trade-imports-plants-prototype/pull/12?a=1,2',
        '--brief-only'
      ])
    ).toEqual({
      set: 'plants-working',
      features: [],
      recipes: [],
      as: 'a trader importing plants',
      want: 'to say the plants were grown under glass',
      soThat: 'the inspector knows before they arrive',
      criteria: '.cache/designer/handoff/glass.criteria.txt',
      links: [
        'https://github.com/DEFRA/trade-imports-plants-prototype/tree/design/plants-working-glass',
        'https://github.com/DEFRA/trade-imports-plants-prototype/pull/12?a=1,2'
      ],
      briefOnly: true
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

describe('readCriteria', () => {
  let root

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'handoff-criteria-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('Should read the criteria file from the repo root', () => {
    writeFileSync(
      path.join(root, 'glass.txt'),
      'Given I am on the page\nWhen I continue\nThen I see the next page\n'
    )

    expect(readCriteria(root, 'glass.txt')).toHaveLength(1)
  })

  it('Should give no criteria when none were named', () => {
    expect(readCriteria(root, undefined)).toBeNull()
  })

  it('Should say plainly when the file is missing or wrong', () => {
    expect(() => readCriteria(root, 'missing.txt')).toThrow(
      new HandoffError(
        'There is no criteria file at missing.txt. Write the acceptance criteria there first, as Given, When and Then lines.'
      )
    )
    writeFileSync(path.join(root, 'bad.txt'), 'It works\n')
    expect(() => readCriteria(root, 'bad.txt')).toThrow(HandoffError)
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
