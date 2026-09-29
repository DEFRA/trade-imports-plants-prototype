import * as cheerio from 'cheerio'
import { describe, expect, it } from 'vitest'

import {
  durationLabel,
  renderNoWalkthroughsPage,
  renderPage
} from './render.js'

const story = (overrides) => ({
  name: 'Submitted',
  headline: 'Send a notification from start to finish',
  summary: 'A trader sends a notification.',
  status: 'walked',
  warning: null,
  durationMs: 130_000,
  video: 'media/abc.webm',
  trace: 'media/abc.zip',
  pages: [
    { caption: 'Origin', url: 'media/01.jpg' },
    { caption: 'Commodities', url: 'media/02.jpg' }
  ],
  testId: 'merged-id',
  detailsPath: 'tests/#?testId=merged-id',
  ...overrides
})

const model = (sets) => ({ sets })

const basePage = (overrides) => ({
  isPullRequest: false,
  prNumber: null,
  headRef: null,
  sha: 'abc1234',
  updatedDate: '29 September 2026',
  runUrl: 'https://example.test/run/1',
  fit: { passed: 10, failed: 0, flaky: 1, skipped: 0 },
  ...overrides
})

describe('renderPage', () => {
  it('Should render the h1, the featured stories in order, then the other journeys, then the tests link, with the hash-forwarding script in <head>', () => {
    const html = renderPage(
      basePage({
        model: model([
          {
            id: 'high-risk-plants',
            title: 'The real journey (high-risk-plants)',
            description: null,
            tag: 'Today’s service',
            featured: [
              story({ name: 'Submitted', headline: 'First journey' }),
              story({ name: 'Amended', headline: 'Second journey' })
            ],
            other: [
              story({ name: 'Deleted draft', headline: 'A minor variant' })
            ]
          }
        ])
      })
    )
    const $ = cheerio.load(html)

    expect($('h1').text()).toBe('The plants prototype, walked through')

    const headings = $('h3.govuk-heading-m')
      .map((_, el) => $(el).text().trim())
      .get()
    expect(headings).toEqual([
      '1. First journey',
      '2. Second journey',
      'Other journeys in this release'
    ])

    // The featured video comes before the summary list of other journeys.
    const videoIndex = $('video').index()
    const summaryListIndex = $('.govuk-summary-list').index()
    expect(videoIndex).toBeLessThan(summaryListIndex)

    expect($('a[href="tests/"]').first().text()).toContain(
      'The technical report'
    )

    const headScript = $('head script').html()
    expect(headScript).toContain("location.hash.startsWith('#?')")
    expect(headScript).toContain("location.replace('tests/' + location.hash)")
  })

  it('Should give each featured video a resolvable src and, from its last page (the outcome), a poster', () => {
    const html = renderPage(
      basePage({
        model: model([
          {
            id: 'plants-working',
            title: 'Working release (plants-working)',
            description: null,
            tag: 'Design release',
            featured: [story({})],
            other: []
          }
        ])
      })
    )
    const $ = cheerio.load(html)
    const video = $('video').first()

    expect(video.attr('src')).toBe('media/abc.webm')
    // Every story starts on the same dashboard, so its first page would
    // make every featured video look alike.
    expect(video.attr('poster')).toBe('media/02.jpg')
  })

  it('Should open each release with its featured journeys in order, each linked to its own heading, then a link to the others', () => {
    const html = renderPage(
      basePage({
        model: model([
          {
            id: 'high-risk-plants',
            title: 'How the service works today',
            description: null,
            tag: 'Today’s service',
            featured: [
              story({ headline: 'First journey' }),
              story({ headline: 'Second journey' })
            ],
            other: [story({ headline: 'A minor variant' })]
          }
        ])
      })
    )
    const $ = cheerio.load(html)
    const nav = $('nav[aria-label="Journeys in How the service works today"]')

    expect(
      nav
        .find('ol li a')
        .map((_, el) => [[$(el).text().trim(), $(el).attr('href')]])
        .get()
    ).toEqual([
      ['First journey', '#high-risk-plants-1'],
      ['Second journey', '#high-risk-plants-2']
    ])
    expect(nav.find('p a').text()).toBe('Other journeys in this release (1)')
    expect(nav.find('p a').attr('href')).toBe('#high-risk-plants-other')
    expect($('#high-risk-plants-1').text()).toBe('1. First journey')
    expect($('#high-risk-plants-2').text()).toBe('2. Second journey')
    expect($('#high-risk-plants-other').text()).toBe(
      'Other journeys in this release'
    )
  })

  it('Should show a warning for a stopped story, and none for a walked one', () => {
    const html = renderPage(
      basePage({
        model: model([
          {
            id: 'plants-working',
            title: 'Working release (plants-working)',
            description: null,
            tag: 'Design release',
            featured: [
              story({
                name: 'Deleted draft',
                status: 'stopped',
                warning: "'Deleted draft' stopped at '2. Delete'"
              })
            ],
            other: []
          }
        ])
      })
    )
    const $ = cheerio.load(html)

    expect($('.govuk-warning-text__text').text()).toContain(
      'This walkthrough stopped before the end'
    )
    expect($('.govuk-warning-text__text').text()).toContain(
      "'Deleted draft' stopped at '2. Delete'"
    )
  })

  it('Should list each of a set’s other journeys as a summary row with Watch and Details actions', () => {
    const html = renderPage(
      basePage({
        model: model([
          {
            id: 'plants-working',
            title: 'Working release (plants-working)',
            description: null,
            tag: 'Design release',
            featured: [story({})],
            other: [
              story({
                name: 'Deleted draft',
                headline: 'Deleted draft',
                summary: 'A trader deletes a draft.'
              })
            ]
          }
        ])
      })
    )
    const $ = cheerio.load(html)
    const row = $('.govuk-summary-list__row').first()

    expect(row.find('.govuk-summary-list__key').text().trim()).toBe(
      'Deleted draft'
    )
    expect(row.find('.govuk-summary-list__value').text()).toContain(
      'A trader deletes a draft.'
    )
    // Each link's visible text is followed by a visually-hidden span naming
    // which journey it is for (govuk-frontend's own summary-list markup),
    // since a page with several rows would otherwise have many identical
    // "Watch" links.
    const actions = row.find('.govuk-summary-list__actions a')
    expect(
      actions.map((_, el) => $(el).text().trim().split(/\s+/)[0]).get()
    ).toEqual(['Watch', 'Details'])
    expect(actions.first().find('.govuk-visually-hidden').text().trim()).toBe(
      'Deleted draft'
    )
  })

  it('Should show the pull request caption and a link back to main', () => {
    const html = renderPage(
      basePage({
        isPullRequest: true,
        prNumber: '42',
        headRef: 'feat/example',
        model: model([])
      })
    )
    const $ = cheerio.load(html)

    expect($('.govuk-caption-m').text()).toBe(
      'Proposed change: pull request #42, feat/example'
    )
    expect($('.govuk-inset-text a').attr('href')).toBe('../../')
  })

  it('Should show a contents list only when there is more than one set', () => {
    const one = renderPage(
      basePage({
        model: model([
          {
            id: 'a',
            title: 'A',
            description: null,
            tag: 'x',
            featured: [story({})],
            other: []
          }
        ])
      })
    )
    const two = renderPage(
      basePage({
        model: model([
          {
            id: 'a',
            title: 'A',
            description: null,
            tag: 'x',
            featured: [story({})],
            other: []
          },
          {
            id: 'b',
            title: 'B',
            description: null,
            tag: 'x',
            featured: [story({})],
            other: []
          }
        ])
      })
    )

    expect(
      cheerio.load(one)('nav[aria-label="Releases on this page"]')
    ).toHaveLength(0)
    expect(
      cheerio.load(two)('nav[aria-label="Releases on this page"] a')
    ).toHaveLength(2)
  })
})

describe('renderNoWalkthroughsPage', () => {
  it('Should say the walkthroughs did not run this time, with a link to the technical report', () => {
    const $ = cheerio.load(renderNoWalkthroughsPage(basePage({ fit: null })))

    expect($('body').text()).toContain('The walkthroughs did not run this time')
    expect($('a[href="tests/"]').length).toBeGreaterThan(0)
  })
})

describe('durationLabel', () => {
  it.each([
    [45_000, '45 seconds'],
    [1_000, '1 second'],
    [60_000, '1 minute'],
    [130_000, '2 minutes 10 seconds'],
    [61_000, '1 minute 1 second']
  ])('Should describe %j ms as %j', (ms, label) => {
    expect(durationLabel(ms)).toBe(label)
  })
})
