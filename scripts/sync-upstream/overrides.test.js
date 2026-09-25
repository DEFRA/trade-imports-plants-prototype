import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { describe, expect, test } from 'vitest'

import { declaredOverlaps, matchesAnyGlob } from './rules.js'

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..')

const overrides = JSON.parse(
  readFileSync(path.join(REPO_ROOT, 'overrides.json'), 'utf8')
)

// --others --exclude-standard picks up new files this change added but has
// not yet staged - this test must pass before the sync branch commits.
const trackedFiles = () =>
  execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard'],
    { cwd: REPO_ROOT, encoding: 'utf8' }
  )
    .trim()
    .split('\n')

const isLiteralPath = (pattern) => !pattern.includes('*')

describe('overrides.json', () => {
  test('has the three expected lists', () => {
    expect(Array.isArray(overrides.deleted)).toBe(true)
    expect(Array.isArray(overrides.ours)).toBe(true)
    expect(Array.isArray(overrides.patched)).toBe(true)
  })

  test('every patched entry names a path and a reason', () => {
    for (const entry of overrides.patched) {
      expect(typeof entry.path).toBe('string')
      expect(entry.path.length).toBeGreaterThan(0)
      expect(typeof entry.why).toBe('string')
      expect(entry.why.length).toBeGreaterThan(0)
    }
  })

  test('no pattern is declared in more than one list', () => {
    expect(declaredOverlaps(overrides)).toEqual([])
  })

  test('every literal (non-glob) patched path exists in the tree', () => {
    const tracked = new Set(trackedFiles())
    const literalPatchedPaths = overrides.patched
      .map((entry) => entry.path)
      .filter(isLiteralPath)

    for (const patchedPath of literalPatchedPaths) {
      expect(tracked.has(patchedPath)).toBe(true)
    }
  })

  test('no path deleted is still tracked', () => {
    const tracked = trackedFiles()
    const reappeared = tracked.filter((filePath) =>
      matchesAnyGlob(overrides.deleted, filePath)
    )
    expect(reappeared).toEqual([])
  })

  test('no tracked file matches both an ours pattern and a patched pattern', () => {
    const tracked = trackedFiles()
    const patchedPatterns = overrides.patched.map((entry) => entry.path)

    const doubleClassified = tracked.filter(
      (filePath) =>
        matchesAnyGlob(overrides.ours, filePath) &&
        matchesAnyGlob(patchedPatterns, filePath)
    )
    expect(doubleClassified).toEqual([])
  })

  test('every ours glob directory matches at least one tracked file', () => {
    const tracked = trackedFiles()
    const globPatterns = overrides.ours.filter(
      (pattern) => !isLiteralPath(pattern)
    )

    for (const pattern of globPatterns) {
      const matches = tracked.filter((filePath) =>
        matchesAnyGlob([pattern], filePath)
      )
      expect(
        matches.length,
        `no tracked file matches "${pattern}"`
      ).toBeGreaterThan(0)
    }
  })
})
