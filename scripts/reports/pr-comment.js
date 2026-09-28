/**
 * The pull request comment (and job summary) for the published Playwright
 * report: a link to the walkthroughs, a row per release saying how many of
 * its stories walked to the end, and the FIT test counts.
 *
 *   node scripts/reports/pr-comment.js merged/report.json > comment.md
 *
 * Reads REPORT_URL (the published report ending in `/`, or empty when GitHub
 * Pages is not on), RUN_URL and HEAD_SHA from the environment. Node
 * built-ins only, so CI can run it without installing anything.
 */
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  stoppedSentence,
  walkthroughSets
} from '../designer/walkthrough/verdict.js'

/** The first line of every comment this script writes, to find it again. */
export const COMMENT_MARKER = '<!-- prototype-playwright-report -->'

const FIT_PROJECTS = new Set(['journeys', 'features'])
const SHORT_SHA = 7

const specsOf = (suites) =>
  (suites ?? []).flatMap((suite) => [
    ...(suite.specs ?? []),
    ...specsOf(suite.suites)
  ])

/**
 * How the FIT tests went: passed, failed, flaky and skipped, from the
 * journeys and features projects only. Null when none ran.
 */
export const fitCounts = (report) => {
  const tests = specsOf(report?.suites)
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

const tableCell = (text) =>
  String(text).replaceAll('|', '\\|').replaceAll('\n', ' ')

const filtered = (reportUrl, tag) => `${reportUrl}#?q=@${tag}`

const setCell = (set, reportUrl) =>
  reportUrl
    ? `[${tableCell(set.title)}](${filtered(reportUrl, set.setId)})`
    : tableCell(set.title)

const walkedCell = (set) => {
  const walked = set.stories.filter((story) => story.status === 'walked')
  const red = set.stories.filter((story) => story.status === 'stopped')
  if (red.length === 0) {
    return String(walked.length)
  }
  const more = red.length > 1 ? ` (and ${red.length - 1} more)` : ''
  return tableCell(`${walked.length}: ${stoppedSentence(red[0])}${more}`)
}

const counted = (set) =>
  set.stories.filter((story) => story.status !== 'skipped')

const walkthroughTable = (sets, reportUrl) => [
  '| Release | Stories | Walked to the end |',
  '| --- | --- | --- |',
  ...sets.map(
    (set) =>
      `| ${setCell(set, reportUrl)} | ${counted(set).length} | ${walkedCell(set)} |`
  )
]

const opening = ({ reportUrl, runUrl }) =>
  reportUrl
    ? `**[Watch the walkthroughs](${filtered(reportUrl, 'walkthrough')})**: every release on this branch, page by page, with a picture of each page, a video and a trace.`
    : `The report could not be published as a web page (GitHub Pages is not turned on for this repository yet). Download **prototype-playwright-report** from [this run](${runUrl}), unzip it and open \`playwright-report/index.html\`.`

const fitLine = (fit, reportUrl) => {
  const whole = reportUrl ? ` [The whole report](${reportUrl})` : ''
  return fit
    ? `FIT tests: ${fit.passed} passed, ${fit.failed} failed, ${fit.flaky} flaky.${whole}`
    : `The FIT tests did not run: see the FIT Tests check.${whole}`
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
 * @param {string} [context.reportUrl] - the published report, ending in `/`;
 *   empty when it could not be published.
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
      ? walkthroughTable(sets, reportUrl)
      : ['The walkthroughs did not run: see the Walkthroughs check.']
  return [
    COMMENT_MARKER,
    '### The prototype, walked through',
    '',
    opening({ reportUrl, runUrl }),
    '',
    ...walkthroughs,
    '',
    fitLine(fitCounts(report), reportUrl),
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
