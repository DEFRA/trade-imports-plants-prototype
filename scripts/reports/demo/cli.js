/**
 * Builds the stakeholder demo page: the site `check-pull-request.yml`
 * publishes to gh-pages, and what `designer:walkthrough` opens locally.
 * Ties together `model.js` (reads the walkthrough report), `media.js`
 * (publishes videos and pictures) and `render.js` (nunjucks + the real
 * govuk-frontend macros), then compiles `demo.scss` once with Sass.
 *
 *   node scripts/reports/demo/cli.js --report <json> --results <folder>
 *     --site <folder> [--links <json>] [--changed-files <file>]
 *
 * Reads REPORT_TITLE (unused here, kept for parity with merge.config.js),
 * PR_NUMBER, HEAD_REF, SHA and RUN_URL from the environment, the same
 * contract `scripts/reports/merge.config.js` and `pr-comment.js` use.
 *
 * `buildDemoSite` is the library `designer:walkthrough`
 * (`scripts/designer/walkthrough/run.js`) calls directly after Playwright,
 * with the walkthrough report as both the report and the links report.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { NodePackageImporter, compile } from 'sass'

import { revParse } from '../../designer/lib/git.js'
import { REPO_ROOT } from '../../designer/lib/repo.js'
import { listSets, releaseInfo, setOfPath } from '../../designer/lib/sets.js'
import { fitCounts } from '../pr-comment.js'
import { buildModel } from './model.js'
import { publishModelMedia } from './media.js'
import { renderNoWalkthroughsPage, renderPage } from './render.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DEMO_SCSS = path.join(HERE, 'demo.scss')

/** A problem a designer or CI can fix, in one plain sentence. */
export class DemoBuildProblem extends Error {}

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

// The changed-files listing is best effort (CI may fail to write it): with
// none, no set is put first, and the page is built in the usual order.
const readTextOrEmpty = (file) => {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return ''
  }
}

const SCENARIO_FILE =
  /^src\/server\/prototype-seed\/scenarios\/([a-z0-9-]+)\.js$/

/** The set id a changed file belongs to, from either its own folder or its
 * scenario file, or null for a file that names no set. */
const setIdOfChangedPath = (filePath, { root }) =>
  setOfPath(filePath, { root }) ?? SCENARIO_FILE.exec(filePath)?.[1] ?? null

/**
 * The set ids named in a `--changed-files` file: one path per line, the
 * shape `gh api …/files --jq '.[].filename'` writes.
 */
export const changedSetIdsFrom = (text, { root = REPO_ROOT } = {}) => {
  const ids = String(text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((filePath) => setIdOfChangedPath(filePath, { root }))
    .filter((id) => id !== null)
  return [...new Set(ids)]
}

/** Every set's release facts (`frozen`, `description`), read from this
 * checkout at build time. */
export const releasesContext = ({ root = REPO_ROOT } = {}) => {
  const releases = {}
  for (const id of listSets({ root })) {
    const info = releaseInfo(id, { root })
    releases[id] = {
      frozen: info?.frozen === true,
      description: info?.description ?? null
    }
  }
  return releases
}

const shortSha = (sha) => (sha ? String(sha).slice(0, 7) : '')

const today = () =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date())

/** Compiles `demo.scss` with the real govuk-frontend package, resolving
 * `pkg:govuk-frontend` the same way the prototype's own webpack build does. */
const compileCss = () =>
  compile(DEMO_SCSS, {
    importers: [new NodePackageImporter()],
    style: 'compressed',
    quietDeps: true
  }).css

/**
 * Builds the demo page and its stylesheet into `siteDir`. Never throws for
 * a report that could not be read or has no walkthroughs in it: it writes
 * the "did not run" page instead, so a crashed walkthroughs job still gets a
 * usable site.
 *
 * @param {object} options
 * @param {string} [options.root]
 * @param {string} options.reportFile - the walkthrough JSON report.
 * @param {string} options.resultsDir - where its attachments actually are.
 * @param {string} options.siteDir - where to write `index.html`/`demo.css`.
 * @param {string} [options.linksFile] - the merged report, for real test
 *   ids; defaults to `reportFile` (a local run has no merge).
 * @param {string} [options.changedFilesFile] - a `--changed-files` file.
 * @param {Record<string, string>} [options.env]
 * @returns {Promise<{ wrote: string[], setCount: number }>}
 */
export const buildDemoSite = async ({
  root = REPO_ROOT,
  reportFile,
  resultsDir,
  siteDir,
  linksFile = reportFile,
  changedFilesFile = null,
  env = process.env
} = {}) => {
  await mkdir(siteDir, { recursive: true })
  const css = compileCss()
  writeFileSync(path.join(siteDir, 'demo.css'), css)

  const report = readJson(reportFile)
  // A local run sets no SHA (there is no workflow to hand it one), so fall
  // back to this checkout's own HEAD: still a real, findable commit.
  const sha = env.SHA || revParse('HEAD', { root }) || ''
  const context = {
    isPullRequest: Boolean(env.PR_NUMBER),
    prNumber: env.PR_NUMBER ?? null,
    headRef: env.HEAD_REF ?? null,
    sha: shortSha(sha),
    updatedDate: today(),
    runUrl: env.RUN_URL ?? ''
  }

  if (!report) {
    writeFileSync(
      path.join(siteDir, 'index.html'),
      renderNoWalkthroughsPage(context)
    )
    return { wrote: ['index.html', 'demo.css'], setCount: 0 }
  }

  const links =
    linksFile === reportFile ? report : (readJson(linksFile) ?? report)
  const changedSetIds = changedFilesFile
    ? changedSetIdsFrom(readTextOrEmpty(changedFilesFile), { root })
    : []
  const model = buildModel(report, links, {
    resultsDir,
    changedSetIds,
    releases: releasesContext({ root })
  })
  const published = publishModelMedia(model, siteDir)

  if (published.sets.length === 0) {
    writeFileSync(
      path.join(siteDir, 'index.html'),
      renderNoWalkthroughsPage(context)
    )
    return { wrote: ['index.html', 'demo.css'], setCount: 0 }
  }

  writeFileSync(
    path.join(siteDir, 'index.html'),
    renderPage({
      ...context,
      model: published,
      fit: fitCounts(links)
    })
  )
  return { wrote: ['index.html', 'demo.css'], setCount: published.sets.length }
}

const readArg = (argv, flag) => {
  const index = argv.indexOf(flag)
  return index === -1 ? null : (argv[index + 1] ?? null)
}

const USAGE =
  'Usage: node scripts/reports/demo/cli.js --report <json> --results <folder> --site <folder> [--links <json>] [--changed-files <file>]'

/**
 * Parses the command line. Every one of `--report`, `--results` and
 * `--site` is required, each with its own plain-English error.
 *
 * @param {string[]} argv
 * @throws {DemoBuildProblem}
 */
export const parseArgs = (argv) => {
  const report = readArg(argv, '--report')
  const results = readArg(argv, '--results')
  const site = readArg(argv, '--site')
  const missing = [
    !report && '--report <json> (the walkthrough report to read)',
    !results && '--results <folder> (where its attachments actually are)',
    !site && '--site <folder> (where to write the demo page)'
  ].filter(Boolean)
  if (missing.length > 0) {
    throw new DemoBuildProblem(`Missing ${missing.join(' and ')}.\n${USAGE}`)
  }
  return {
    reportFile: report,
    resultsDir: results,
    siteDir: site,
    linksFile: readArg(argv, '--links') ?? report,
    changedFilesFile: readArg(argv, '--changed-files')
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2))
    const result = await buildDemoSite(options)
    process.stdout.write(
      `Wrote ${result.wrote.join(', ')} to ${options.siteDir}, for ${result.setCount} set(s).\n`
    )
  } catch (error) {
    if (error instanceof DemoBuildProblem) {
      process.stderr.write(`${error.message}\n`)
      process.exitCode = 1
    } else {
      throw error
    }
  }
}
