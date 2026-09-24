import { describe, expect, test } from 'vitest'

import {
  allChecksPassed,
  buildSummary,
  NEEDS_PERSON_LABEL,
  pullRequestDecision
} from './summary.js'

describe('buildSummary', () => {
  test('reports a clean no-op when upstream is already merged', () => {
    const text = buildSummary({
      branch: 'main',
      mergedCommits: [],
      appliedRules: [],
      conflictedPaths: [],
      checks: [],
      merged: true
    })

    expect(text).toContain('already merged')
    expect(text).not.toContain('## Checks')
  })

  test('lists merged commits, applied rules, conflicts and checks', () => {
    const text = buildSummary({
      branch: 'sync/upstream-2026-09-24',
      mergedCommits: [{ hash: 'abc123', subject: 'feat: something upstream' }],
      appliedRules: [
        { path: 'scripts/lighthouse/run-audit.js', rule: 'deleted' },
        { path: 'src/prototype-defaults.js', rule: 'ours' },
        { path: 'src/server/app/engine/journey.js', rule: 'patched' }
      ],
      conflictedPaths: ['src/server/router.js'],
      checks: [
        { name: 'npm ci', passed: true },
        { name: 'lint', passed: false, detail: '1 problem' }
      ],
      merged: false
    })

    expect(text).toContain('sync/upstream-2026-09-24')
    expect(text).toContain('Merged 1 upstream commit(s).')
    expect(text).toContain('`abc123` feat: something upstream')
    expect(text).toContain('`scripts/lighthouse/run-audit.js` -> deleted')
    expect(text).toContain('`src/prototype-defaults.js` -> ours')
    expect(text).toContain('`src/server/app/engine/journey.js` -> patched')
    expect(text).toContain('src/server/router.js')
    expect(text).toContain('npm ci')
    expect(text).toContain('1 problem')
  })

  test('says so when nothing conflicted', () => {
    const text = buildSummary({
      branch: 'sync/upstream-2026-09-24',
      mergedCommits: [],
      appliedRules: [],
      conflictedPaths: [],
      checks: [],
      merged: false
    })

    expect(text).toContain('none - the merge resolved cleanly')
  })
})

describe('allChecksPassed', () => {
  test('is true only when every check passed', () => {
    expect(allChecksPassed([{ passed: true }, { passed: true }])).toBe(true)
    expect(allChecksPassed([{ passed: true }, { passed: false }])).toBe(false)
    expect(allChecksPassed([])).toBe(true)
  })
})

describe('pullRequestDecision', () => {
  test('is not draft and carries no label when everything is clean', () => {
    expect(
      pullRequestDecision({
        conflictedPaths: [],
        checks: [{ passed: true }, { passed: true }]
      })
    ).toEqual({ draft: false, label: undefined })
  })

  test('is draft and needs the label when there are conflicts', () => {
    expect(
      pullRequestDecision({
        conflictedPaths: ['src/server/router.js'],
        checks: [{ passed: true }]
      })
    ).toEqual({ draft: true, label: NEEDS_PERSON_LABEL })
  })

  test('is draft and needs the label when a check failed', () => {
    expect(
      pullRequestDecision({
        conflictedPaths: [],
        checks: [{ passed: true }, { passed: false }]
      })
    ).toEqual({ draft: true, label: NEEDS_PERSON_LABEL })
  })
})
