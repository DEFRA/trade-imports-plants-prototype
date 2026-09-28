import { describe, expect, test } from 'vitest'

import {
  classifyPath,
  declaredOverlaps,
  matchesGlob,
  matchesAnyGlob,
  oursAction,
  prototypeServiceOf
} from './rules.js'

describe('oursAction', () => {
  const overrides = {
    deleted: [],
    ours: [
      'scripts/sync-upstream/**',
      'src/server/app/services/transporters/**'
    ],
    patched: []
  }
  const SERVICE_FILE = 'src/server/app/services/transporters/index.js'
  const OTHER_FILE = 'scripts/sync-upstream/new.js'

  test('removes an ours path added only upstream, never checking out HEAD', () => {
    expect(oursAction('A ', OTHER_FILE, overrides)).toEqual({
      action: 'remove'
    })
    expect(oursAction('UA', OTHER_FILE, overrides)).toEqual({
      action: 'remove'
    })
  })

  test('takes our side of an add/add clash and any other conflict', () => {
    expect(oursAction('AA', OTHER_FILE, overrides)).toEqual({
      action: 'checkout-ours'
    })
    expect(oursAction('UU', OTHER_FILE, overrides)).toEqual({
      action: 'checkout-ours'
    })
  })

  test('puts back our committed file after a clean upstream change', () => {
    expect(oursAction('M ', OTHER_FILE, overrides)).toEqual({
      action: 'checkout-head'
    })
  })

  test('reports a real service arriving over a prototype-owned one, keeping ours', () => {
    expect(oursAction('AA', SERVICE_FILE, overrides)).toEqual({
      action: 'service-arrived',
      keep: 'checkout-ours',
      service: 'transporters'
    })
    expect(oursAction('A ', SERVICE_FILE, overrides)).toEqual({
      action: 'service-arrived',
      keep: 'remove',
      service: 'transporters'
    })
  })

  test('leaves an untracked file alone', () => {
    expect(oursAction('??', OTHER_FILE, overrides)).toEqual({
      action: 'leave'
    })
  })

  test('counts only a services folder with its own ours line as prototype-owned', () => {
    expect(prototypeServiceOf(SERVICE_FILE, overrides)).toBe('transporters')
    expect(
      prototypeServiceOf(
        'src/server/app/services/countries/index.js',
        overrides
      )
    ).toBeNull()
  })
})

describe('matchesGlob', () => {
  test('matches a literal path exactly', () => {
    expect(matchesGlob('src/index.js', 'src/index.js')).toBe(true)
    expect(matchesGlob('src/index.js', 'src/index.test.js')).toBe(false)
  })

  test('matches * within one path segment', () => {
    expect(matchesGlob('src/*.js', 'src/index.js')).toBe(true)
    expect(matchesGlob('src/*.js', 'src/app/index.js')).toBe(false)
  })

  test('matches ** across path segments', () => {
    expect(
      matchesGlob('scripts/lighthouse/**', 'scripts/lighthouse/run-audit.js')
    ).toBe(true)
    expect(
      matchesGlob(
        'scripts/lighthouse/**',
        'scripts/lighthouse/nested/seed-notification.js'
      )
    ).toBe(true)
    expect(matchesGlob('scripts/lighthouse/**', 'scripts/npm-version.js')).toBe(
      false
    )
  })

  test('escapes regex-significant characters in the literal parts', () => {
    expect(
      matchesGlob('.dependency-cruiser.cjs', '.dependency-cruiser.cjs')
    ).toBe(true)
    expect(
      matchesGlob('.dependency-cruiser.cjs', 'Xdependency-cruiserXcjs')
    ).toBe(false)
  })
})

describe('matchesAnyGlob', () => {
  test('is true when any pattern matches', () => {
    expect(matchesAnyGlob(['a/**', 'b/**'], 'b/c.js')).toBe(true)
  })

  test('is false when no pattern matches', () => {
    expect(matchesAnyGlob(['a/**', 'b/**'], 'c/d.js')).toBe(false)
  })
})

const overrides = {
  deleted: ['scripts/lighthouse/**', '.mcp.json'],
  ours: ['src/prototype-defaults.js', 'src/server/app/sets/sample-journey/**'],
  patched: [
    { path: 'src/index.js', why: 'loads prototype-defaults.js first' },
    { path: 'src/server/app/routes.js', why: 'per-set route gateways' }
  ]
}

describe('classifyPath', () => {
  test('classifies a deleted path', () => {
    expect(classifyPath('scripts/lighthouse/run-audit.js', overrides)).toBe(
      'deleted'
    )
  })

  test('classifies an ours path', () => {
    expect(classifyPath('src/prototype-defaults.js', overrides)).toBe('ours')
    expect(
      classifyPath('src/server/app/sets/sample-journey/set.js', overrides)
    ).toBe('ours')
  })

  test('classifies a declared patched path', () => {
    expect(classifyPath('src/index.js', overrides)).toBe('patched')
  })

  test('defaults everything else to patched, so it merges normally', () => {
    expect(classifyPath('src/server/app/engine/journey.js', overrides)).toBe(
      'patched'
    )
  })

  test('deleted takes priority over a path that also happens to match ours', () => {
    const ambiguous = {
      deleted: ['a/**'],
      ours: ['a/**'],
      patched: []
    }
    expect(classifyPath('a/b.js', ambiguous)).toBe('deleted')
  })
})

describe('declaredOverlaps', () => {
  test('finds no overlaps when every pattern is declared once', () => {
    expect(declaredOverlaps(overrides)).toEqual([])
  })

  test('finds a pattern declared in two lists', () => {
    const withOverlap = {
      deleted: ['a/**'],
      ours: ['a/**'],
      patched: []
    }
    expect(declaredOverlaps(withOverlap)).toEqual([
      { pattern: 'a/**', lists: ['deleted', 'ours'] }
    ])
  })
})
