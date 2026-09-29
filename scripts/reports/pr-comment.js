/**
 * The pull request comment (and job summary) for the published site: a link
 * to the demo page (the most important journeys, most important first — the
 * link to send stakeholders), a row per release saying how many of its
 * journeys are featured there and how many walked to the end, and the FIT
 * test counts.
 *
 *   node scripts/reports/pr-comment.js merged/report.json > comment.md
 *
 * Reads REPORT_URL (the published site ending in `/`, or empty when GitHub
 * Pages is not on), RUN_URL and HEAD_SHA from the environment. Node
 * built-ins only, so CI can run it without installing anything.
 */
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  specsOf,
  stoppedSentence,
  walkthroughSets
} from '../designer/walkthrough/verdict.js'

/** The first line of every comment this script writes, to find it again. */
export const COMMENT_MARKER = '<!-- prototype-playwright-report -->'

const FIT_PROJECTS = new Set(['journeys', 'features'])
const WALKTHROUGH_TAG_NAME = 'walkthrough'
const FEATURED_TAG_NAME = 'featured'
const SHORT_SHA = 7

const fitSpecsOf = (suites) =>
  (suites ?? []).flatMap((suite) => [
    ...(suite.specs ?? []),
    ...fitSpecsOf(suite.suites)
  ])

/**
 * How the FIT tests went: passed, failed, flaky and skipped, from the
 * journeys and features projects only. Null when none ran.
 */
export const fitCounts = (report) => {
  const tests = fitSpecsOf(report?.suites)
    .flatMap((spec) => spec.tests ?? [])
    .filter((test) => FIT_PROJECTS.has(test.projectName))
  if (tests.length === 0) {
    return null
  }
  const count = (status) =>
    tests.filter((test) => test.status === status).length
  return {
    passed: count('expected'),
    failed: count('unexpected'),
    flaky: count('flaky'),
    skipped: count('skipped')
  }
}

const isWalkthroughSpec = (spec) =>
  (spec.tags ?? []).includes(WALKTHROUGH_TAG_NAME)

const setIdOfSpec = (spec) =>
  (spec.tags ?? []).find(
    (tag) => tag !== WALKTHROUGH_TAG_NAME && tag !== FEATURED_TAG_NAME
  ) ?? 'unknown'

/** How many of each set's stories carry the `@featured` tag. */
export const featuredCounts = (report) => {
  const counts = new Map()
  for (const spec of specsOf(report?.suites).filter(isWalkthroughSpec)) {
    if ((spec.tags ?? []).includes(FEATURED_TAG_NAME)) {
      const setId = setIdOfSpec(spec)
      counts.set(setId, (counts.get(setId) ?? 0) + 1)
    }
  }
  return counts
}

const tableCell = (text) =>
  String(text).replaceAll('|', '\\|').replaceAll('\n', ' ')

/** The demo page's own section for a set. */
export const demoLink = (reportUrl, setId) => `${reportUrl}#set-${setId}`

/** The technical report's specs for one set. */
export const testsLink = (reportUrl, tag) => `${reportUrl}tests/#?q=@${tag}`

const setCell = (set, reportUrl) =>
  reportUrl
    ? `[${tableCell(set.title)}](${demoLink(reportUrl, set.setId)})`
    : tableCell(set.title)

const walkedCell = (set) => {
  const walked = set.stories.filter((story) => story.status === 'walked')
  const red = set.stories.filter((story) => story.status === 'stopped')
  const counted = set.stories.filter((story) => story.status !== 'skipped')
  const total = `${walked.length} of ${counted.length}`
  if (red.length === 0) {
    return total
  }
  const more = red.length > 1 ? ` (and ${red.length - 1} more)` : ''
  return tableCell(`${total}: ${stoppedSentence(red[0])}${more}`)
}

const walkthroughTable = (sets, report, reportUrl) => {
  const featured = featuredCounts(report)
  return [
    '| Release | Featured on the demo page | Walked to the end |',
    '| --- | --- | --- |',
    ...sets.map(
      (set) =>
        `| ${setCell(set, reportUrl)} | ${featured.get(set.setId) ?? 0} | ${walkedCell(set)} |`
    )
  ]
}

const opening = ({ reportUrl, runUrl }) =>
  reportUrl
    ? `**[Watch the main journeys](${reportUrl})**: short videos of the most important journeys, most important first — the link to send stakeholders.`
    : `The report could not be published as a web page (GitHub Pages is not turned on for this repository yet). Download **prototype-playwright-report** from [this run](${runUrl}), unzip it and open \`site/index.html\`.`

const developmentTeamLine = (fit, reportUrl) => {
  const report = reportUrl
    ? `[every test and walkthrough, with traces](${reportUrl}tests/)`
    : 'every test and walkthrough, with traces (see the FIT Tests and Walkthroughs checks)'
  const counts = fit
    ? `FIT tests: ${fit.passed} passed, ${fit.failed} failed, ${fit.flaky} flaky.`
    : 'The FIT tests did not run: see the FIT Tests check.'
  return `For the development team: ${report}. ${counts}`
}

const updatedLine = (sha, reportUrl) => {
  const updated = sha ? `Updated for ${sha.slice(0, SHORT_SHA)}.` : 'Updated.'
  return reportUrl
    ? `${updated} A new link can take a minute to appear while GitHub Pages publishes it.`
    : updated
}

/**
 * The comment, as markdown.
 *
 * @param {object|null} report - the merged Playwright JSON report.
 * @param {object} context
 * @param {string} [context.reportUrl] - the published demo page, ending in
 *   `/`; empty when it could not be published.
 * @param {string} [context.runUrl] - this workflow run, for the download.
 * @param {string} [context.sha] - the commit the report is for.
 * @returns {string}
 */
export const commentFor = (
  report,
  { reportUrl = '', runUrl = '', sha = '' } = {}
) => {
  const sets = walkthroughSets(report)
  const walkthroughs =
    sets.length > 0
      ? walkthroughTable(sets, report, reportUrl)
      : ['The walkthroughs did not run: see the Walkthroughs check.']
  return [
    COMMENT_MARKER,
    '### The prototype, walked through',
    '',
    opening({ reportUrl, runUrl }),
    '',
    ...walkthroughs,
    '',
    developmentTeamLine(fitCounts(report), reportUrl),
    '',
    updatedLine(sha, reportUrl),
    ''
  ].join('\n')
}

const readReport = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [file = 'merged/report.json'] = process.argv.slice(2)
  process.stdout.write(
    commentFor(readReport(file), {
      reportUrl: process.env.REPORT_URL ?? '',
      runUrl: process.env.RUN_URL ?? '',
      sha: process.env.HEAD_SHA ?? ''
    })
  )
}
