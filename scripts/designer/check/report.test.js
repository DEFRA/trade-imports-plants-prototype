import { describe, expect, it } from 'vitest'

import { formatJson, formatReport } from './report.js'

const LOG = '.cache/designer/check/2026-09-27T10-11-12.log'

const passedQuick = {
  setId: 'plants-working',
  tier: 'quick',
  ok: true,
  steps: [
    {
      id: 'tidy',
      title: 'Tidy the code layout (Prettier)',
      status: 'pass',
      summary: 'Tidied 1 file.',
      details: ['Tidied a.js']
    },
    {
      id: 'copy',
      title: 'English and Welsh words',
      status: 'pass',
      summary: '3 copy folders match; 2 pieces of text still need Welsh.',
      details: []
    }
  ],
  findings: [],
  suggestion: { tier: 'quick', reason: 'You changed only words.' }
}

const failedFull = {
  setId: 'plants-working',
  tier: 'full',
  ok: false,
  steps: [
    {
      id: 'copy',
      title: 'English and Welsh words',
      status: 'fail',
      summary: '1 problem in the English and Welsh copy.',
      details: ['origin: The Welsh file has no `hint`.']
    },
    {
      id: 'unit-tests',
      title: 'All unit tests (pre-commit hook)',
      status: 'skipped',
      summary: 'Not run: fix the problems above first.'
    }
  ],
  findings: [
    {
      id: 'copy-shape',
      title: 'English and Welsh words do not match',
      step: 'English and Welsh words',
      cause: 'The copy files are not the same shape.',
      fix: "Write '[Welsh needed] ' and the English.",
      skill: 'change-the-words',
      attribution: 'yours'
    },
    {
      id: 'failing-test',
      title: 'A test failed',
      step: 'All unit tests (pre-commit hook)',
      cause: 'A test failed.',
      fix: 'Read the log.',
      skill: 'check-my-change',
      attribution: 'not-yours'
    }
  ],
  suggestion: { tier: 'full', reason: 'You changed how pages work.' }
}

describe('formatReport', () => {
  it('Should print a plain pass table, the verdict and the log path', () => {
    const report = formatReport(passedQuick, { logPath: LOG })

    expect(report.split('\n')).toEqual([
      'Checked plants-working: quick check',
      '',
      '  Passed   Tidy the code layout (Prettier)  Tidied 1 file.',
      '  Passed   English and Welsh words          3 copy folders match; 2 pieces of text still need Welsh.',
      '',
      'Result: the quick check passed.',
      `Full log: ${LOG}`
    ])
  })

  it('Should explain each failure with its fix and skill', () => {
    const report = formatReport(failedFull, { logPath: LOG })

    expect(report).toContain('  FAILED   English and Welsh words')
    expect(report).toContain('  Not run  All unit tests (pre-commit hook)')
    expect(report).toContain(
      '1. English and Welsh words do not match (English and Welsh words)'
    )
    expect(report).toContain(
      "   How to fix it: Write '[Welsh needed] ' and the English."
    )
    expect(report).toContain(
      '   Steps Claude follows to fix it: change-the-words'
    )
    expect(report).toContain(
      'Result: 2 problems to fix before this can be saved.'
    )
  })

  it('Should say plainly when a failure is not caused by the change', () => {
    const report = formatReport(failedFull, { logPath: LOG })

    expect(report).toContain(
      '   Not caused by your change: tell the maintainer.'
    )
    expect(
      report.match(/Not caused by your change/g),
      'only the failure in an untouched file carries it'
    ).toHaveLength(1)
  })

  it('Should promise the pre-commit hook will pass after a green full check', () => {
    const report = formatReport(
      { ...passedQuick, tier: 'full' },
      { logPath: LOG }
    )

    expect(report).toContain(
      'Result: everything passed. A commit made now will pass the pre-commit hook.'
    )
  })

  it('Should suggest the full check when a quick check covered a flow change', () => {
    const report = formatReport(
      { ...passedQuick, suggestion: failedFull.suggestion },
      { logPath: LOG }
    )

    expect(report).toContain('Next: You changed how pages work.')
  })
})

describe('formatJson', () => {
  it('Should carry the whole result and the log path', () => {
    expect(JSON.parse(formatJson(failedFull, { logPath: LOG }))).toEqual({
      ...failedFull,
      log: LOG
    })
  })
})
