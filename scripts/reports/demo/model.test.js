import { describe, expect, it } from 'vitest'

import { REAL_JOURNEY_TITLE, TAG, buildModel, reRootedPath } from './model.js'

const OUTPUT_DIR = '/runner/work/repo/.cache/test-results'
const RESULTS_DIR = '/home/sam/downloaded/test-results'

const annotation = (type, description) => ({
  type,
  description,
  location: { file: 'x', line: 1, column: 1 }
})

const attachment = (name, contentType, fileName) => ({
  name,
  contentType,
  path: `${OUTPUT_DIR}/some-test/${fileName}`
})

const spec = (
  id,
  title,
  setId,
  { annotations = [], status = 'expected', result = {}, featured = false } = {}
) => ({
  id,
  title,
  tags: ['walkthrough', setId, ...(featured ? ['featured'] : [])],
  tests: [
    {
      annotations,
      status,
      results: [
        {
          status: status === 'expected' ? 'passed' : 'failed',
          duration: 12_000,
          errors: [],
          attachments: [],
          annotations,
          ...result
        }
      ]
    }
  ]
})

const walkthroughSuite = (title, specs) => ({ title, specs, suites: [] })

const reportOf = (suites, projectOutputDir = OUTPUT_DIR) => ({
  config: {
    projects: [{ name: 'walkthroughs', outputDir: projectOutputDir }]
  },
  suites: [{ title: 'walkthroughs.walkthrough.spec.js', specs: [], suites }]
})

describe('buildModel', () => {
  it('Should keep only @walkthrough specs, grouped by set', () => {
    const report = reportOf([
      walkthroughSuite('The real journey (high-risk-plants)', [
        spec('id-1', 'Submitted', 'high-risk-plants', {
          annotations: [annotation('Story', 'A trader sends it.')]
        })
      ])
    ])

    const model = buildModel(report)

    expect(model.sets).toHaveLength(1)
    expect(model.sets[0].id).toBe('high-risk-plants')
    expect(model.sets[0].other[0].summary).toBe('A trader sends it.')
  })

  it('Should read a story’s headline and featured position from its annotations', () => {
    const report = reportOf([
      walkthroughSuite('Working release (plants-working)', [
        spec('id-1', 'Submitted', 'plants-working', {
          featured: true,
          annotations: [
            annotation('Headline', 'Send a notification from start to finish'),
            annotation('Featured', '1')
          ]
        })
      ])
    ])

    const [set] = buildModel(report).sets

    // The set id resolves correctly even with the @featured tag alongside it.
    expect(set.id).toBe('plants-working')
    expect(set.featured).toEqual([
      expect.objectContaining({
        headline: 'Send a notification from start to finish',
        featured: 1
      })
    ])
    expect(set.other).toEqual([])
  })

  it('Should default a story’s headline to its name when there is no Headline annotation', () => {
    const report = reportOf([
      walkthroughSuite('Working release (plants-working)', [
        spec('id-1', 'Submitted', 'plants-working')
      ])
    ])

    expect(buildModel(report).sets[0].other[0].headline).toBe('Submitted')
  })

  it('Should order featured stories by position', () => {
    const report = reportOf([
      walkthroughSuite('Working release (plants-working)', [
        spec('id-1', 'Second', 'plants-working', {
          annotations: [annotation('Featured', '2')]
        }),
        spec('id-2', 'First', 'plants-working', {
          annotations: [annotation('Featured', '1')]
        })
      ])
    ])

    const [set] = buildModel(report).sets

    expect(set.featured.map((story) => story.name)).toEqual(['First', 'Second'])
  })

  it('Should re-root every attachment onto the given results folder', () => {
    const report = reportOf([
      walkthroughSuite('Working release (plants-working)', [
        spec('id-1', 'Submitted', 'plants-working', {
          result: {
            attachments: [
              attachment('video', 'video/webm', 'video.webm'),
              attachment('trace', 'application/zip', 'trace.zip'),
              attachment('01 Origin', 'image/jpeg', '01-Origin.jpg'),
              attachment('02 Commodities', 'image/jpeg', '02-Commodities.jpg'),
              attachment('screenshot', 'image/png', 'test-finished-1.png')
            ]
          }
        })
      ])
    ])

    const [story] = buildModel(report, report, {
      resultsDir: RESULTS_DIR
    }).sets[0].other

    expect(story.video).toBe(`${RESULTS_DIR}/some-test/video.webm`)
    expect(story.trace).toBe(`${RESULTS_DIR}/some-test/trace.zip`)
    expect(story.pages).toEqual([
      { caption: 'Origin', url: `${RESULTS_DIR}/some-test/01-Origin.jpg` },
      {
        caption: 'Commodities',
        url: `${RESULTS_DIR}/some-test/02-Commodities.jpg`
      }
    ])
  })

  it('Should leave attachment paths alone when the report names no walkthroughs outputDir', () => {
    const report = reportOf([
      walkthroughSuite('Working release (plants-working)', [
        spec('id-1', 'Submitted', 'plants-working', {
          result: { attachments: [attachment('video', 'video/webm', 'v.webm')] }
        })
      ])
    ])
    report.config.projects = []

    const [story] = buildModel(report).sets[0].other

    expect(story.video).toBe(`${OUTPUT_DIR}/some-test/v.webm`)
  })

  it('Should link a story’s detail page by the merged report’s test id', () => {
    const report = reportOf([
      walkthroughSuite('Working release (plants-working)', [
        spec('blob-id', 'Submitted', 'plants-working')
      ])
    ])
    const links = reportOf([
      walkthroughSuite('Working release (plants-working)', [
        spec('merged-id', 'Submitted', 'plants-working')
      ])
    ])

    const [story] = buildModel(report, links).sets[0].other

    expect(story.testId).toBe('merged-id')
    expect(story.detailsPath).toBe('tests/#?testId=merged-id')
  })

  it('Should fall back to a set-tag link when there is no matching test in the links report', () => {
    const report = reportOf([
      walkthroughSuite('Working release (plants-working)', [
        spec('blob-id', 'Submitted', 'plants-working')
      ])
    ])

    const [story] = buildModel(report, reportOf([])).sets[0].other

    expect(story.testId).toBe('blob-id')
    expect(story.detailsPath).toBe('tests/#?q=@plants-working')
  })

  it('Should give a stopped story a warning sentence, and leave a walked one with none', () => {
    const report = reportOf([
      walkthroughSuite('Working release (plants-working)', [
        spec('id-1', 'Deleted draft', 'plants-working', {
          status: 'unexpected',
          result: {
            status: 'failed',
            errors: [{ message: 'Error: the page said "Try again"' }],
            steps: [
              { title: '1. Your notifications' },
              { title: '2. Delete', error: { message: 'x' } }
            ]
          }
        }),
        spec('id-2', 'Submitted', 'plants-working')
      ])
    ])

    const [stopped, walked] = buildModel(report).sets[0].other

    expect(stopped.status).toBe('stopped')
    expect(stopped.warning).toContain("'Deleted draft' stopped at '2. Delete'")
    expect(walked.status).toBe('walked')
    expect(walked.warning).toBeNull()
  })

  it('Should order sets: changed first, then working releases, then frozen, then the real journey last', () => {
    const report = reportOf([
      walkthroughSuite('The real journey (high-risk-plants)', [
        spec('id-1', 'Submitted', 'high-risk-plants')
      ]),
      walkthroughSuite('Frozen release (plants-frozen)', [
        spec('id-2', 'Submitted', 'plants-frozen')
      ]),
      walkthroughSuite('Working release (plants-working)', [
        spec('id-3', 'Submitted', 'plants-working')
      ]),
      walkthroughSuite('Changed release (plants-changed)', [
        spec('id-4', 'Submitted', 'plants-changed')
      ])
    ])

    const model = buildModel(report, report, {
      changedSetIds: ['plants-changed'],
      releases: { 'plants-frozen': { frozen: true } }
    })

    expect(model.sets.map((set) => set.id)).toEqual([
      'plants-changed',
      'plants-working',
      'plants-frozen',
      'high-risk-plants'
    ])
    expect(model.sets.map((set) => set.tag)).toEqual([
      TAG.changed,
      TAG.release,
      TAG.frozen,
      TAG.realJourney
    ])
    expect(model.sets.at(-1).title).toBe(REAL_JOURNEY_TITLE)
  })

  it('Should give a release its description from release.json, when it has one', () => {
    const report = reportOf([
      walkthroughSuite('Working release (plants-working)', [
        spec('id-1', 'Submitted', 'plants-working')
      ])
    ])

    const model = buildModel(report, report, {
      releases: { 'plants-working': { description: 'A trial of a new page.' } }
    })

    expect(model.sets[0].description).toBe('A trial of a new page.')
  })

  it('Should give an empty report no sets', () => {
    expect(buildModel(null)).toEqual({ sets: [] })
    expect(buildModel(reportOf([]))).toEqual({ sets: [] })
  })
})

describe('reRootedPath', () => {
  it('Should give back null for a missing path', () => {
    expect(
      reRootedPath(undefined, {
        outputDir: OUTPUT_DIR,
        resultsDir: RESULTS_DIR
      })
    ).toBeNull()
  })
})
