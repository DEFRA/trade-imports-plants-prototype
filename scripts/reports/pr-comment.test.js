import { describe, expect, it } from 'vitest'

import { COMMENT_MARKER, commentFor, fitCounts } from './pr-comment.js'

const REPORT_URL =
  'https://defra.github.io/trade-imports-plants-prototype/reports/pr-12/'
const RUN_URL =
  'https://github.com/DEFRA/trade-imports-plants-prototype/actions/runs/1'
const SHA = '0123456789abcdef'

const story = (title, setId, status, extra = {}) => ({
  title,
  tags: ['walkthrough', setId],
  tests: [
    {
      projectName: 'walkthroughs',
      status,
      annotations: [],
      results: [
        {
          status: status === 'expected' ? 'passed' : 'failed',
          errors: [],
          ...extra
        }
      ]
    }
  ]
})

const fit = (title, project, status) => ({
  title,
  tags: [],
  tests: [{ projectName: project, status, annotations: [], results: [] }]
})

const walkthroughSuite = (suites) => ({
  title: 'walkthroughs/walkthroughs.walkthrough.spec.js',
  specs: [],
  suites
})

const fitSuite = {
  title: 'journey-smoke.fit.spec.js',
  specs: [
    fit('walks to confirmation', 'journeys', 'expected'),
    fit('origin shows its error', 'features', 'expected'),
    fit('arrival retries', 'features', 'flaky'),
    fit('declaration', 'features', 'unexpected')
  ]
}

const green = {
  suites: [
    walkthroughSuite([
      {
        title: 'The real journey (high-risk-plants)',
        specs: [
          story('Submitted', 'high-risk-plants', 'expected'),
          story('Draft', 'high-risk-plants', 'expected')
        ]
      }
    ]),
    fitSuite
  ],
  errors: []
}

const someRed = {
  suites: [
    walkthroughSuite([
      {
        title: 'Working release (plants-working)',
        specs: [
          story('Submitted', 'plants-working', 'expected'),
          story('Deleted draft', 'plants-working', 'unexpected', {
            errors: [{ message: 'Error: the page said "Try again"' }],
            steps: [{ title: '2. Delete | confirm', error: {} }]
          }),
          story('Amended', 'plants-working', 'unexpected', {
            errors: [{ message: 'Error: stuck' }],
            steps: [{ title: '5. Declaration', error: {} }]
          })
        ]
      }
    ])
  ],
  errors: []
}

describe('commentFor', () => {
  it('Should link the walkthroughs, each release and the whole report when all is green', () => {
    expect(
      commentFor(green, { reportUrl: REPORT_URL, runUrl: RUN_URL, sha: SHA })
    ).toBe(
      [
        COMMENT_MARKER,
        '### The prototype, walked through',
        '',
        `**[Watch the walkthroughs](${REPORT_URL}#?q=@walkthrough)**: every release on this branch, page by page, with a picture of each page, a video and a trace.`,
        '',
        '| Release | Stories | Walked to the end |',
        '| --- | --- | --- |',
        `| [The real journey (high-risk-plants)](${REPORT_URL}#?q=@high-risk-plants) | 2 | 2 |`,
        '',
        `FIT tests: 2 passed, 1 failed, 1 flaky. [The whole report](${REPORT_URL})`,
        '',
        'Updated for 0123456. A new link can take a minute to appear while GitHub Pages publishes it.',
        ''
      ].join('\n')
    )
  })

  it('Should name the first red story in its release’s row, and count the rest', () => {
    const comment = commentFor(someRed, { reportUrl: REPORT_URL })

    expect(comment).toContain(
      `| [Working release (plants-working)](${REPORT_URL}#?q=@plants-working) | 3 | 1: 'Deleted draft' stopped at '2. Delete \\| confirm': Error: the page said "Try again" (and 1 more) |`
    )
  })

  it('Should point at the run’s download when GitHub Pages is not on', () => {
    const comment = commentFor(green, {
      reportUrl: '',
      runUrl: RUN_URL,
      sha: SHA
    })

    expect(comment).toContain(
      `The report could not be published as a web page (GitHub Pages is not turned on for this repository yet). Download **prototype-playwright-report** from [this run](${RUN_URL}), unzip it and open \`playwright-report/index.html\`.`
    )
    expect(comment).toContain('| The real journey (high-risk-plants) | 2 | 2 |')
    expect(comment).toContain('FIT tests: 2 passed, 1 failed, 1 flaky.\n')
    expect(comment).toContain('Updated for 0123456.\n')
    expect(comment).not.toContain('github.io')
  })

  it('Should say when the walkthroughs did not run', () => {
    const comment = commentFor(
      { suites: [fitSuite], errors: [] },
      { reportUrl: REPORT_URL }
    )

    expect(comment).toContain(
      'The walkthroughs did not run: see the Walkthroughs check.'
    )
  })

  it('Should say when the FIT tests did not run', () => {
    expect(commentFor(someRed, { reportUrl: '' })).toContain(
      'The FIT tests did not run: see the FIT Tests check.'
    )
  })

  it('Should still write a comment when there is no report at all', () => {
    const comment = commentFor(null, { runUrl: RUN_URL })

    expect(comment.startsWith(COMMENT_MARKER)).toBe(true)
    expect(comment).toContain('The walkthroughs did not run')
  })
})

describe('fitCounts', () => {
  it('Should count only the journeys and features projects', () => {
    expect(fitCounts(green)).toEqual({
      passed: 2,
      failed: 1,
      flaky: 1,
      skipped: 0
    })
  })
})
