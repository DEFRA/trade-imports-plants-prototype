import { describe, expect, it } from 'vitest'

import {
  EMPTY_FORM_STEP,
  picturesOf,
  publishScreens,
  screensFor,
  specFileNameOf
} from './screens.js'

const OUTPUT = '/run/test-results'
const RESULTS = '/downloaded/test-results'

/** Each story's output folder, as the walkthrough spec leaves it. */
const FOLDERS = {
  [`${RESULTS}/story-a`]: [
    '01-dashboard.jpg',
    '02-origin.jpg',
    '02-origin-errors.jpg',
    '03-task-list.jpg',
    'attachments'
  ],
  [`${RESULTS}/story-b`]: ['01-dashboard.jpg', '02-origin.jpg', 'attachments']
}
const listDir = (folder) => FOLDERS[folder] ?? []

const attachment = (folder, name) => ({
  name,
  contentType: 'image/jpeg',
  path: `${OUTPUT}/${folder}/attachments/${name.replaceAll(' ', '-')}-hash.jpg`
})

const spec = ({ title, status, featured, folder, pictures }) => ({
  title,
  tags: ['walkthrough', 'plants-working', ...(featured ? ['featured'] : [])],
  tests: [
    {
      status,
      annotations: featured
        ? [
            { type: 'Featured', description: String(featured) },
            { type: 'Headline', description: `${title} headline` }
          ]
        : [],
      results: [
        { attachments: pictures.map((name) => attachment(folder, name)) }
      ]
    }
  ]
})

const REPORT = {
  config: { projects: [{ name: 'walkthroughs', outputDir: OUTPUT }] },
  suites: [
    {
      title: 'walkthroughs.walkthrough.spec.js',
      suites: [
        {
          title: 'Working release',
          specs: [
            spec({
              title: 'Zebra story',
              status: 'expected',
              featured: null,
              folder: 'story-b',
              pictures: ['01 Your notifications', '02 Where from?']
            }),
            spec({
              title: 'Apple story',
              status: 'expected',
              featured: 1,
              folder: 'story-a',
              pictures: [
                '01 Your notifications',
                '02 Where from?',
                `2 ${EMPTY_FORM_STEP}`,
                '03 Overview'
              ]
            })
          ]
        }
      ]
    }
  ]
}

const PAGES = [
  {
    id: 'dashboard',
    slug: '',
    title: 'Your notifications',
    titleSource: 'copy'
  },
  { id: 'origin', slug: 'origin', title: 'Where from?', titleSource: 'copy' },
  {
    id: 'arrival-status',
    slug: 'arrival-status',
    title: 'Has it arrived?',
    titleSource: 'copy',
    shownWhen: { kind: 'values', when: '“Type” is “Plants”' }
  },
  { id: 'hub', slug: null, title: 'Overview', titleSource: 'copy' }
]

describe('specFileNameOf', () => {
  it('Should read the walkthrough’s own file name beside Playwright’s attachments folder', () => {
    expect(
      specFileNameOf(
        `${RESULTS}/story-a/attachments/x.jpg`,
        { number: 2, errors: true },
        listDir
      )
    ).toBe('02-origin-errors.jpg')
    expect(
      specFileNameOf('/anywhere/05-arrival-details.jpg', {
        number: 5,
        errors: false
      })
    ).toBe('05-arrival-details.jpg')
  })
})

describe('screensFor', () => {
  const pictures = picturesOf(REPORT, {
    setId: 'plants-working',
    resultsDir: RESULTS,
    listDir
  })
  const screens = screensFor(PAGES, pictures)

  it('Should prefer the featured story’s picture, and keep its empty-form picture apart', () => {
    expect(screens.origin.picture).toBe(
      `${RESULTS}/story-a/attachments/02-Where-from?-hash.jpg`
    )
    expect(screens.origin.errorPicture).toBe(
      `${RESULTS}/story-a/attachments/2-${EMPTY_FORM_STEP.replaceAll(' ', '-')}-hash.jpg`
    )
    expect(screens.origin.stories.map((story) => story.name)).toEqual([
      'Apple story',
      'Zebra story'
    ])
  })

  it('Should read the walkthrough’s task-list pictures as the hub’s', () => {
    expect(screens.hub.picture).toContain('story-a')
  })

  it('Should pass over a picture whose heading is another page’s', () => {
    const renamed = PAGES.map((page) =>
      page.id === 'origin' ? { ...page, title: 'Origin of the import' } : page
    )
    const result = screensFor(renamed, pictures).origin
    expect(result.picture).toBeNull()
    expect(result.warnings).toHaveLength(1)
  })

  it('Should list a page no example reaches, saying which answers would reach it', () => {
    expect(screens['arrival-status']).toEqual(
      expect.objectContaining({
        picture: null,
        note: 'Has it arrived? is only shown if “Type” is “Plants”: add an example that answers that way.'
      })
    )
  })

  it('Should find no pictures for a set the report does not hold', () => {
    expect(picturesOf(REPORT, { setId: 'other', listDir })).toEqual([])
    expect(picturesOf(null, { setId: 'other', listDir })).toEqual([])
  })

  it('Should publish every picture through the given publisher', () => {
    const published = publishScreens(screens, (file) => `media/${file.length}`)
    expect(published.origin.picture).toMatch(/^media\/\d+$/)
    expect(published['arrival-status'].picture).toBeNull()
  })
})
