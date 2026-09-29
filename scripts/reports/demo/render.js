/**
 * Renders the stakeholder demo page with nunjucks, using the real
 * `govuk-frontend` macros from `node_modules/govuk-frontend/dist`, so the
 * markup is genuine GOV.UK markup. `template.njk` is the one template; this
 * file configures nunjucks the same way the prototype's own server does
 * (`src/config/nunjucks/nunjucks.js`) and turns a page's data into plain
 * display strings a template should not have to work out itself.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import nunjucks from 'nunjucks'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const GOVUK_FRONTEND_DIST = path.resolve(
  HERE,
  '../../../node_modules/govuk-frontend/dist/'
)

const SECOND_MS = 1000
const MINUTE_S = 60

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

/**
 * A duration in plain English: "2 minutes 10 seconds", or just the seconds
 * when it is under a minute.
 *
 * @param {number} ms
 * @returns {string}
 */
export const durationLabel = (ms) => {
  const totalSeconds = Math.round(ms / SECOND_MS)
  const minutes = Math.floor(totalSeconds / MINUTE_S)
  const seconds = totalSeconds % MINUTE_S
  if (minutes === 0) {
    return plural(seconds, 'second')
  }
  return seconds === 0
    ? plural(minutes, 'minute')
    : `${plural(minutes, 'minute')} ${plural(seconds, 'second')}`
}

/** A story ready for the template: display strings added, nothing removed. */
const storyForTemplate = (story) => ({
  ...story,
  durationLabel: durationLabel(story.durationMs),
  pageCountLabel: plural(story.pages.length, 'page'),
  detailsLabel: `See each page (${story.pages.length})`
})

/** A summary-list row for one of a set's non-featured journeys, in the
 * exact shape `govukSummaryList`'s `rows` param expects. */
const otherRow = (story) => ({
  key: { text: story.headline },
  value: { text: story.summary ?? '' },
  actions: {
    items: [
      ...(story.video
        ? [
            {
              href: story.video,
              text: 'Watch',
              visuallyHiddenText: story.headline
            }
          ]
        : []),
      {
        href: story.detailsPath,
        text: 'Details',
        visuallyHiddenText: story.headline
      }
    ]
  }
})

/** A set ready for the template. */
const setForTemplate = (set) => ({
  ...set,
  featured: set.featured.map(storyForTemplate),
  other: set.other.map(storyForTemplate),
  otherRows: set.other.map(otherRow)
})

let sharedEnvironment = null

/** The nunjucks environment `template.njk` renders in, built once and
 * reused: govuk-frontend's own macros, then this folder for `template.njk`
 * itself. */
const environment = () => {
  if (!sharedEnvironment) {
    sharedEnvironment = nunjucks.configure([GOVUK_FRONTEND_DIST, HERE], {
      autoescape: true,
      throwOnUndefined: false,
      trimBlocks: true,
      lstripBlocks: true
    })
  }
  return sharedEnvironment
}

/**
 * Renders the stakeholder demo page.
 *
 * @param {object} page
 * @param {boolean} page.isPullRequest
 * @param {string|null} [page.prNumber]
 * @param {string|null} [page.headRef]
 * @param {string} [page.sha]
 * @param {string} [page.updatedDate] - "29 September 2026", already formatted.
 * @param {{ sets: object[] }} page.model - from `model.js`'s `buildModel`
 *   (after `media.js` has published its videos and pictures).
 * @param {{ passed: number, failed: number, flaky: number, skipped: number
 *   }|null} [page.fit]
 * @param {string} [page.runUrl]
 * @returns {string} the rendered HTML.
 */
export const renderPage = (page) =>
  environment().render('template.njk', {
    ...page,
    sets: page.model.sets.map(setForTemplate)
  })

/** The page shown when the walkthroughs did not run this time. */
export const renderNoWalkthroughsPage = (page) =>
  environment().render('template.njk', {
    ...page,
    noWalkthroughs: true,
    sets: []
  })
