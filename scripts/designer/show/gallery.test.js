import * as cheerio from 'cheerio'
import { describe, expect, it } from 'vitest'

import { GOVUK_STYLESHEET, escapeHtml, renderGallery } from './gallery.js'
import { buildManifest, captureFileName } from './manifest.js'

const shot = (key, variant, state = 'page', width = 'desktop') => ({
  key,
  variant,
  state,
  width,
  file: captureFileName({ key, variant, state, width })
})

const fixtureManifest = (overrides = {}) =>
  buildManifest({
    set: 'plants-working',
    compare: 'high-risk-plants',
    createdAt: '2026-09-27T09:05:03.000Z',
    commit: 'abc1234def5678',
    branch: 'design/plants-working-hints',
    localUrl: 'http://localhost:3103/plants-working',
    options: {
      pages: 'arrival-details,dashboard',
      before: true,
      errors: true,
      mobile: true,
      video: true,
      compare: 'high-risk-plants',
      references: [{ page: 'dashboard', image: 'frame.png' }]
    },
    pages: [
      {
        key: 'arrival-details',
        title: 'Arrival details',
        path: '/plants-working/notifications/<reference>/arrival-details',
        captures: [
          shot('arrival-details', 'now'),
          shot('arrival-details', 'before'),
          shot('arrival-details', 'now', 'errors'),
          shot('arrival-details', 'now', 'page', 'mobile')
        ],
        axe: {
          'now/page': [
            {
              id: 'label',
              impact: 'serious',
              help: 'Form elements must have labels',
              helpUrl: 'https://dequeuniversity.com/rules/axe/4.11/label',
              places: 1,
              targets: ['#arrivalTime']
            }
          ],
          'now/errors': []
        },
        notes: []
      },
      {
        key: 'dashboard',
        title: 'Your notifications <b>',
        path: '/plants-working',
        captures: [
          shot('dashboard', 'now'),
          shot('dashboard', 'compare'),
          {
            ...shot('dashboard', 'reference'),
            file: 'dashboard--reference--page--desktop.png'
          }
        ],
        axe: { 'now/page': [] },
        notes: ['Sending this page empty showed no error messages.']
      }
    ],
    neverReached: ['transporter'],
    changedFiles: [
      'src/server/app/sets/plants-working/journeys/linear/features/arrival-details/copy/copy.en.js'
    ],
    notes: ['Before: plants-working is not in your last saved version.'],
    video: 'walk.webm',
    ...overrides
  })

const load = (manifest) => cheerio.load(renderGallery(manifest))

describe('renderGallery', () => {
  it('Should be a GOV.UK-styled page that links its own stylesheet', () => {
    const $ = load(fixtureManifest())
    expect($('html').attr('lang')).toBe('en')
    expect($('link[rel="stylesheet"]').attr('href')).toBe(GOVUK_STYLESHEET)
    expect($('h1').text()).toBe('How plants-working looks')
    expect($('body').hasClass('govuk-template__body')).toBe(true)
  })

  it('Should show every picture as a linked image', () => {
    const $ = load(fixtureManifest())
    const sources = $('img')
      .map((_, img) => $(img).attr('src'))
      .get()
    expect(sources).toEqual([
      'arrival-details--before--page--desktop.png',
      'arrival-details--now--page--desktop.png',
      'arrival-details--now--errors--desktop.png',
      'arrival-details--now--page--mobile.png',
      'dashboard--now--page--desktop.png',
      'dashboard--compare--page--desktop.png',
      'dashboard--reference--page--desktop.png'
    ])
  })

  it('Should pair before with now, and put the other set and the reference beside a page', () => {
    const $ = load(fixtureManifest())
    const arrivalPair = $('#page-arrival-details .app-shots').first()
    expect(arrivalPair.hasClass('app-shots--2')).toBe(true)
    expect(
      arrivalPair
        .find('figcaption')
        .map((_, caption) => $(caption).text())
        .get()
    ).toEqual(['Before: your last saved version', 'Now: your working copy'])
    expect(
      $('#page-dashboard figcaption')
        .map((_, caption) => $(caption).text())
        .get()
    ).toEqual([
      'Now: your working copy',
      'In high-risk-plants',
      'Your reference image'
    ])
  })

  it('Should head the error state and the phone width', () => {
    const $ = load(fixtureManifest())
    const headings = $('#page-arrival-details h3')
      .map((_, heading) => $(heading).text())
      .get()
    expect(headings).toEqual([
      'The page',
      'With error messages (the form sent empty)',
      'At phone width (320px)',
      'Accessibility'
    ])
  })

  it('Should explain accessibility results in plain words with a link to the fix', () => {
    const $ = load(fixtureManifest())
    const text = $('#page-arrival-details').text()
    expect(text).toContain(
      'The automatic accessibility check found 1 problem, 1 of them serious.'
    )
    expect(text).toContain('Serious: Form elements must have labels (1 place)')
    expect($('#page-arrival-details a[href*="dequeuniversity"]').text()).toBe(
      'What this means and how to fix it'
    )
  })

  it('Should list notes, pages no example reaches and changed files', () => {
    const text = load(fixtureManifest())('main').text()
    expect(text).toContain(
      'Before: plants-working is not in your last saved version.'
    )
    expect(text).toContain('Sending this page empty showed no error messages.')
    expect(text).toContain('Pages no example reaches')
    expect(text).toContain('transporter')
    expect(text).toContain('copy.en.js')
  })

  it('Should embed the walkthrough when there is one', () => {
    expect(load(fixtureManifest())('video').attr('src')).toBe('walk.webm')
    expect(load(fixtureManifest({ video: null }))('video')).toHaveLength(0)
  })

  it('Should escape page text', () => {
    const html = renderGallery(fixtureManifest())
    expect(html).toContain('Your notifications &lt;b&gt;')
    expect(html).not.toContain('Your notifications <b>')
  })

  it('Should leave out empty sections', () => {
    const text = load(
      fixtureManifest({ neverReached: [], changedFiles: [], notes: [] })
    )('main').text()
    expect(text).not.toContain('Pages no example reaches')
    expect(text).not.toContain('Files changed since your last save')
  })
})

describe('escapeHtml', () => {
  it('Should escape every HTML-special character', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;'
    )
  })

  it('Should treat nothing as an empty string', () => {
    expect(escapeHtml(null)).toBe('')
  })
})
