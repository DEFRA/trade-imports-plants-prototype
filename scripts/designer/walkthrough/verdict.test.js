import { describe, expect, it } from 'vitest'

import {
  exitCodeOf,
  githubWarnings,
  readVerdict,
  summaryLines
} from './verdict.js'

const REAL = 'The real journey (high-risk-plants)'
const WORKING = 'Working release (plants-working)'

const spec = (title, setId, test) => ({
  title,
  tags: ['walkthrough', setId],
  tests: [{ annotations: [], projectName: 'walkthroughs', ...test }]
})

const walked = (title, setId, annotations = []) =>
  spec(title, setId, {
    status: 'expected',
    results: [{ status: 'passed', errors: [], annotations }]
  })

const stopped = (title, setId) =>
  spec(title, setId, {
    status: 'unexpected',
    results: [
      {
        status: 'failed',
        errors: [
          {
            message:
              '\u001b[31mError: The example "Deleted draft" stopped at delete: the page said "Try again".\u001b[39m\n    at walk.js:1'
          }
        ],
        steps: [
          { title: '1. Your notifications' },
          {
            title: '2. Are you sure you want to delete this notification?',
            error: { message: 'x' }
          }
        ]
      }
    ]
  })

const report = (suites, errors = []) => ({
  config: {},
  suites: [{ title: 'walkthroughs.walkthrough.spec.js', specs: [], suites }],
  errors,
  stats: {}
})

const allGreen = report([
  {
    title: REAL,
    specs: [
      walked('Submitted', 'high-risk-plants'),
      walked('Draft', 'high-risk-plants')
    ]
  }
])

const someRed = report([
  {
    title: REAL,
    specs: [walked('Submitted', 'high-risk-plants')]
  },
  {
    title: WORKING,
    specs: [
      walked('Submitted', 'plants-working', [
        {
          type: 'Sent directly',
          description: 'The walkthrough could not fill in origin on screen.'
        }
      ]),
      stopped('Deleted draft', 'plants-working')
    ]
  }
])

describe('readVerdict', () => {
  it('Should say every story walked to the end when they all did', () => {
    const verdict = readVerdict(allGreen, {
      expectedSets: ['high-risk-plants']
    })

    expect(summaryLines(verdict)).toEqual([
      `${REAL}: 2 of 2 stories walked to the end.`
    ])
    expect(exitCodeOf(verdict)).toBe(0)
  })

  it('Should report red stories and pages sent directly, and still not fail', () => {
    const verdict = readVerdict(someRed, {
      expectedSets: ['high-risk-plants', 'plants-working']
    })

    expect(summaryLines(verdict)).toEqual([
      `${REAL}: 1 of 1 stories walked to the end.`,
      `${WORKING}: 1 of 2 stories walked to the end.`,
      `  'Deleted draft' stopped at '2. Are you sure you want to delete this notification?': Error: The example "Deleted draft" stopped at delete: the page said "Try again".`,
      `  'Submitted' had 1 page(s) sent directly, because the screen would not move on. See its "Sent directly" notes in the report.`
    ])
    expect(exitCodeOf(verdict)).toBe(0)
  })

  it('Should turn each red story into a GitHub warning', () => {
    const verdict = readVerdict(someRed)

    expect(githubWarnings(verdict)).toEqual([
      expect.stringMatching(
        /^::warning title=Walkthrough: plants-working::'Deleted draft' stopped at /
      )
    ])
  })

  it('Should say a story with a problem after its last page walked to the end, but', () => {
    const problems = spec('Submitted', 'high-risk-plants', {
      status: 'unexpected',
      results: [
        {
          status: 'failed',
          errors: [{ message: 'Error: Console errors or failed pages' }],
          steps: [{ title: '1. Your notifications' }]
        }
      ]
    })

    const verdict = readVerdict(report([{ title: REAL, specs: [problems] }]))

    expect(summaryLines(verdict)[1]).toBe(
      "  'Submitted' walked to the end, but something went wrong: Error: Console errors or failed pages"
    )
  })

  it('Should say a story that timed out ran out of time, not that it walked to the end', () => {
    const slow = spec('Amendment started, then cancelled', 'high-risk-plants', {
      status: 'unexpected',
      results: [
        {
          status: 'timedOut',
          errors: [{ message: 'Test timeout of 300000ms exceeded.' }],
          steps: [{ title: '20. Check your answers' }]
        }
      ]
    })

    const verdict = readVerdict(report([{ title: REAL, specs: [slow] }]))

    expect(summaryLines(verdict)).toEqual([
      `${REAL}: 0 of 1 stories walked to the end.`,
      "  'Amendment started, then cancelled' ran out of time before it finished. If the computer slept or was very busy during the run, run it again."
    ])
    expect(exitCodeOf(verdict)).toBe(0)
  })

  it('Should fail when the prototype never started', () => {
    const verdict = readVerdict(
      report(
        [],
        [
          {
            message:
              '\u001b[31mError: Timed out waiting 180000ms from config.webServer.\u001b[39m'
          }
        ]
      ),
      { expectedSets: ['high-risk-plants'] }
    )

    expect(summaryLines(verdict)).toEqual([
      'The walkthroughs could not run: Error: Timed out waiting 180000ms from config.webServer.'
    ])
    expect(exitCodeOf(verdict)).toBe(1)
  })

  it('Should fail when no walkthrough ran although there were sets to walk', () => {
    const verdict = readVerdict(report([]), {
      expectedSets: ['high-risk-plants']
    })

    expect(verdict.reason).toBe(
      'No walkthrough ran, although there were sets to walk (high-risk-plants).'
    )
    expect(exitCodeOf(verdict)).toBe(1)
  })

  it('Should fail when no report was written', () => {
    expect(exitCodeOf(readVerdict(null))).toBe(1)
  })

  it('Should not fail when there was nothing to walk', () => {
    const verdict = readVerdict(report([]), { expectedSets: [] })

    expect(summaryLines(verdict)).toEqual([
      'There was nothing to walk through.'
    ])
    expect(exitCodeOf(verdict)).toBe(0)
  })

  it('Should leave FIT tests out of the walkthroughs', () => {
    const fit = {
      title: 'journey smoke',
      tags: [],
      tests: [{ status: 'unexpected', results: [] }]
    }

    const verdict = readVerdict(
      report([
        { title: REAL, specs: [fit, walked('Submitted', 'high-risk-plants')] }
      ])
    )

    expect(verdict.sets[0].stories).toHaveLength(1)
  })
})
