/**
 * The stakeholder demo page's data, from a walkthrough Playwright JSON
 * report. Pure: no filesystem, no environment. `cli.js` reads the report
 * (and, for a merged report's test ids, a second "links" report) and passes
 * them in; `media.js` and `render.js` take this model's output onward.
 *
 * Known limit, worth saying once here rather than in every doc that repeats
 * it: Playwright records the walkthrough videos as VP8 WebM, which plays in
 * Chrome, Edge, Firefox and Safari 14.1+ on macOS. Older iOS Safari falls
 * back to the "Download the video" link and the page pictures, which is
 * judged good enough for now — transcoding to MP4 would need ffmpeg in CI,
 * which is not worth adding for that one case.
 */
import path from 'node:path'

import { REAL_JOURNEY_SET } from '../../designer/lib/sets.js'
import {
  annotationsOf,
  failedStepTitle,
  firstLine,
  specsOf,
  stoppedSentence
} from '../../designer/walkthrough/verdict.js'

const WALKTHROUGH_TAG_NAME = 'walkthrough'
const FEATURED_TAG_NAME = 'featured'
const WALKTHROUGHS_PROJECT = 'walkthroughs'
const WALKED = new Set(['expected', 'flaky'])
const PAGE_PICTURE = /^(\d{2}) (.+)$/
const NON_SET_TAGS = new Set([WALKTHROUGH_TAG_NAME, FEATURED_TAG_NAME])

export const REAL_JOURNEY_TITLE = 'How the service works today'

export const TAG = Object.freeze({
  changed: 'Changed in this pull request',
  release: 'Design release',
  frozen: 'Frozen',
  realJourney: 'Today’s service'
})

const isWalkthrough = (spec) => (spec.tags ?? []).includes(WALKTHROUGH_TAG_NAME)

// Every tag but 'walkthrough' and 'featured' is the set id — order-
// independent, so a future tag never risks being read as one.
const setIdOf = (spec) =>
  (spec.tags ?? []).find((tag) => !NON_SET_TAGS.has(tag)) ?? 'unknown'

const annotationValue = (annotations, type) =>
  annotations.find((annotation) => annotation.type === type)?.description ??
  null

/** The walkthroughs project's own `outputDir`, as the report recorded it. */
const outputDirFor = (report) =>
  (report?.config?.projects ?? []).find(
    (project) => project.name === WALKTHROUGHS_PROJECT
  )?.outputDir ?? null

/**
 * An attachment's path, moved from the folder the report was made in
 * (`outputDir`) to the `--results` folder given to this build: the same
 * relative path, joined onto wherever the files actually are now (after an
 * artifact download, or on a different machine).
 *
 * @param {string|undefined} attachmentPath
 * @param {{ outputDir: string|null, resultsDir: string }} roots
 * @returns {string|null}
 */
export const reRootedPath = (attachmentPath, { outputDir, resultsDir }) => {
  if (!attachmentPath) {
    return null
  }
  if (!outputDir) {
    return attachmentPath
  }
  return path.join(resultsDir, path.relative(outputDir, attachmentPath))
}

const attachmentPath = (attachments, name, roots) =>
  reRootedPath(
    (attachments ?? []).find((attachment) => attachment.name === name)?.path,
    roots
  )

const pagesOf = (attachments, roots) =>
  (attachments ?? [])
    .map((attachment) => ({
      attachment,
      match: PAGE_PICTURE.exec(attachment.name)
    }))
    .filter(({ match }) => match)
    .sort((a, b) => a.match[1].localeCompare(b.match[1]))
    .map(({ attachment, match }) => ({
      caption: match[2],
      url: reRootedPath(attachment.path, roots)
    }))

/**
 * Every spec that could give this story's merged test id: same set, same
 * title, tagged as a walkthrough. `spec.id` is what the html report's
 * `#?testId=` link matches against, and `merge-reports` salts it, so the
 * blob's own id never matches the merged report's — this index reads the
 * merged (or, locally, the same) report to find the right one.
 */
const linksIndex = (links) => {
  const index = new Map()
  for (const spec of specsOf(links?.suites).filter(isWalkthrough)) {
    index.set(`${setIdOf(spec)}\u0000${spec.title}`, spec.id)
  }
  return index
}

const testIdFor = (index, setId, title) => index.get(`${setId}\u0000${title}`)

const storyFrom = (spec, setId, { roots, index }) => {
  const test = spec.tests?.[0] ?? {}
  const result = (test.results ?? []).at(-1)
  const annotations = annotationsOf(test, result)
  const featuredRaw = annotationValue(annotations, 'Featured')
  const stopped = test.status !== 'skipped' && !WALKED.has(test.status)
  const mergedTestId = testIdFor(index, setId, spec.title)
  const testId = mergedTestId ?? spec.id
  return {
    name: spec.title,
    headline: annotationValue(annotations, 'Headline') ?? spec.title,
    summary: annotationValue(annotations, 'Story'),
    featured: featuredRaw === null ? null : Number(featuredRaw),
    status: stopped
      ? 'stopped'
      : test.status === 'skipped'
        ? 'skipped'
        : 'walked',
    warning: stopped
      ? stoppedSentence({
          name: spec.title,
          timedOut: result?.status === 'timedOut',
          stoppedAt: failedStepTitle(result?.steps),
          said: firstLine(
            result?.errors?.[0]?.message ?? result?.error?.message
          )
        })
      : null,
    durationMs: result?.duration ?? 0,
    video: attachmentPath(result?.attachments, 'video', roots),
    trace: attachmentPath(result?.attachments, 'trace', roots),
    pages: pagesOf(result?.attachments, roots),
    testId: testId ?? null,
    // A merged-report match gives a real deep link; failing that, the raw
    // blob id would not resolve in the merged report the demo page links
    // into, so fall back to a tag search instead.
    detailsPath: mergedTestId
      ? `tests/#?testId=${mergedTestId}`
      : `tests/#?q=@${setId}`
  }
}

const orderFeatured = (stories) =>
  [...stories].sort((a, b) => a.featured - b.featured)

const bucketOf = (setId, { changedSetIds, frozen }) => {
  if (setId === REAL_JOURNEY_SET) {
    return 3
  }
  if (changedSetIds.includes(setId)) {
    return 0
  }
  return frozen ? 2 : 1
}

const tagFor = (setId, { changedSetIds, frozen }) => {
  if (setId === REAL_JOURNEY_SET) {
    return TAG.realJourney
  }
  if (changedSetIds.includes(setId)) {
    return TAG.changed
  }
  return frozen ? TAG.frozen : TAG.release
}

/**
 * The stakeholder demo page's data.
 *
 * @param {object|null} report - the walkthrough Playwright JSON report.
 * @param {object|null} [links] - the merged report, for real test ids; the
 *   walkthrough report itself when there is no merge (a local run).
 * @param {object} [context]
 * @param {string} [context.resultsDir] - where the `--results` files are now.
 * @param {string[]} [context.changedSetIds] - set ids touched by this pull
 *   request, from `--changed-files`.
 * @param {Record<string, { frozen?: boolean, description?: string|null }>}
 *   [context.releases] - each set's release facts, read from its
 *   `release.json` at build time.
 * @returns {{ sets: object[] }}
 */
export const buildModel = (
  report,
  links = report,
  { resultsDir = '', changedSetIds = [], releases = {} } = {}
) => {
  const roots = { outputDir: outputDirFor(report), resultsDir }
  const index = linksIndex(links)
  const bySet = new Map()
  for (const spec of specsOf(report?.suites).filter(isWalkthrough)) {
    const setId = setIdOf(spec)
    if (!bySet.has(setId)) {
      bySet.set(setId, {
        id: setId,
        title: spec.suiteTitle ?? setId,
        stories: []
      })
    }
    bySet.get(setId).stories.push(storyFrom(spec, setId, { roots, index }))
  }
  const sets = [...bySet.values()].map((set) => {
    const facts = releases[set.id] ?? {}
    const info = { changedSetIds, frozen: facts.frozen === true }
    return {
      id: set.id,
      title: set.id === REAL_JOURNEY_SET ? REAL_JOURNEY_TITLE : set.title,
      description: facts.description ?? null,
      tag: tagFor(set.id, info),
      bucket: bucketOf(set.id, info),
      featured: orderFeatured(
        set.stories.filter((story) => story.featured !== null)
      ),
      other: set.stories.filter((story) => story.featured === null)
    }
  })
  return {
    sets: sets
      .toSorted((a, b) => a.bucket - b.bucket || a.id.localeCompare(b.id))
      .map(({ bucket, ...set }) => set)
  }
}
