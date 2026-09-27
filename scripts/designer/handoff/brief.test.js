import { describe, expect, it } from 'vitest'
import {
  briefOutline,
  longDate,
  renderBriefJira,
  renderBriefMarkdown
} from './brief.js'

const COPY_EN =
  'src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-details/copy/copy.en.js'
const COPY_CY = COPY_EN.replace('copy.en.js', 'copy.cy.js')
const COPY_TEST = COPY_EN.replace('copy.en.js', 'copy.test.js')

const REPORT = {
  set: 'plants-working',
  mode: 'release',
  chain: [{ releaseId: 'plants-working', fromId: 'high-risk-plants' }],
  baseRef: 'a'.repeat(40),
  files: [{ path: COPY_EN, status: 'changed' }],
  leftOut: [
    {
      path: 'src/server/app/sets/plants-working/journeys/linear/features/transporter/controller.js',
      reason: 'Uses a service that only exists in the prototype.'
    }
  ],
  pages: [
    {
      feature: 'arrival-details',
      slugs: ['arrival-details'],
      files: [
        { path: COPY_EN, status: 'changed' },
        { path: COPY_CY, status: 'changed' }
      ],
      copy: [
        {
          language: 'en',
          key: 'time.hint',
          before: 'Use the 24-hour clock. For example, 14:30.',
          after: 'Use the 24-hour clock, for example 14:30.'
        }
      ]
    }
  ],
  applyCheck: { ok: true, empty: false, message: 'The patch applies cleanly.' },
  drift: { ref: 'b'.repeat(40), overlapping: [], elsewhere: [] },
  testImpact: [
    {
      text: 'Use the 24-hour clock. For example, 14:30.',
      file: COPY_TEST,
      line: 89
    }
  ],
  cannotShip: {
    services: [
      {
        file: 'controller.js',
        name: 'transporters',
        kind: 'prototype-services',
        shape: { file: 'data.json', example: { name: 'Haulage Ltd' } }
      }
    ],
    welshNeeded: [
      {
        file: COPY_CY,
        line: 24,
        english: 'Use the 24-hour clock, for example 14:30.'
      }
    ],
    designGaps: [{ page: 'dashboard', why: 'No chip component' }],
    researchRules: []
  },
  recipes: ['add-a-field']
}

const META = {
  title: 'Clearer arrival time hint',
  why: 'Traders were unsure about the time format.',
  date: '2026-09-27',
  branch: 'feat/EUDPA-XXXX-arrival-hint',
  screenshots: [
    {
      slug: 'arrival-details',
      state: 'before',
      fileName: 'arrival-details--before.png'
    }
  ],
  skippedScreenshots: []
}

describe('longDate', () => {
  it('Should write a date the GOV.UK way', () => {
    expect(longDate('2026-09-27')).toBe('27 September 2026')
  })
})

describe('the Markdown brief', () => {
  const markdown = renderBriefMarkdown(briefOutline(REPORT, META))

  it('Should start with the title, the date and the release', () => {
    expect(markdown).toMatch(
      /^# Clearer arrival time hint\n\nHand-off from the plants prototype, 27 September 2026\. Design release plants-working, made from high-risk-plants\./
    )
  })

  it('Should list the Welsh still needed', () => {
    expect(markdown).toContain(
      `- \`${COPY_CY}\` line 24: "Use the 24-hour clock, for example 14:30."`
    )
  })

  it('Should list the test that pins the old words', () => {
    expect(markdown).toContain(
      `- \`${COPY_TEST}\` line 89: "Use the 24-hour clock. For example, 14:30."`
    )
  })

  it('Should show the copy change as old and new English', () => {
    expect(markdown).toContain(
      '| `time.hint` | Use the 24-hour clock. For example, 14:30. | Use the 24-hour clock, for example 14:30. |'
    )
  })

  it('Should show the before screenshot for the page', () => {
    expect(markdown).toContain(
      '![arrival-details: before](screenshots/arrival-details--before.png)'
    )
  })

  it('Should name what cannot ship and what was left out', () => {
    expect(markdown).toContain('pretend "transporters"')
    expect(markdown).toContain(
      'Design gap: page: dashboard; why: No chip component'
    )
    expect(markdown).toContain(
      'Uses a service that only exists in the prototype.'
    )
  })

  it('Should explain both ways the change can land', () => {
    expect(markdown).toContain('`git apply --3way upstream.patch`')
    expect(markdown).toContain('The prototype never pushes to plants-frontend.')
  })

  it('Should ask for a reason when none was given', () => {
    const withoutWhy = renderBriefMarkdown(
      briefOutline(REPORT, { ...META, why: null })
    )

    expect(withoutWhy).toContain('[Say what this change is and why')
  })
})

describe('the Jira brief', () => {
  const jira = renderBriefJira(briefOutline(REPORT, META))

  it('Should use Jira headings and tables', () => {
    expect(jira).toMatch(/^h1\. Clearer arrival time hint/)
    expect(jira).toContain('h2. Welsh needed')
    expect(jira).toContain('||Key||Old English||New English||')
  })

  it('Should escape square brackets so the Welsh marker is not read as a link', () => {
    expect(jira).toContain('\\[Welsh needed\\]')
  })

  it('Should list the pinned test in monospace', () => {
    expect(jira).toContain(`* {{${COPY_TEST}}} line 89`)
  })
})
