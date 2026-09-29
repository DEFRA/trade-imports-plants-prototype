/**
 * One designer:walkthrough run: work out which sets to walk, build the
 * prototype's styles if needed, run the walkthrough spec in Playwright on a
 * port of its own, then read the report and say what it came to.
 *
 * Everything a designer's run writes goes under .cache/designer/walkthrough/,
 * which git ignores, so `git status` is the same before and after. A --ci
 * run writes where the pull request checks collect it instead.
 *
 * The side effects (starting Playwright, building, reading files) come in as
 * `deps`, so the choices here are unit tested.
 */
import { spawn } from 'node:child_process'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync
} from 'node:fs'
import { createRequire } from 'node:module'
import { availableParallelism } from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { chromium } from '@playwright/test'

import { REAL_JOURNEY_SET, defaultSet } from '../lib/sets.js'
import { REPO_ROOT } from '../lib/repo.js'
import { buildClientAssets, needsClientBuild } from '../show/assets.js'
import { findFreePort } from '../show/server.js'
import { buildDemoSite } from '../../reports/demo/cli.js'
import { buildServiceMaps } from '../../reports/service-map/cli.js'
import { planWalkthroughs, readSets, unknownSets } from './plan.js'
import {
  exitCodeOf,
  githubWarnings,
  readVerdict,
  summaryLines
} from './verdict.js'

export const WALKTHROUGH_CACHE = path.join('.cache', 'designer', 'walkthrough')

/** Where each kind of run writes its report and pictures. */
export const OUTPUTS = Object.freeze({
  local: Object.freeze({
    // Playwright's html reporter writes straight into site/tests/, so a
    // local run needs no copy step: what designer:walkthrough builds is
    // exactly the shape CI publishes (index.html and tests/ side by side).
    html: path.join(WALKTHROUGH_CACHE, 'site', 'tests'),
    json: path.join(WALKTHROUGH_CACHE, 'report.json'),
    results: path.join(WALKTHROUGH_CACHE, 'test-results'),
    site: path.join(WALKTHROUGH_CACHE, 'site')
  }),
  ci: Object.freeze({
    blob: 'blob-report',
    json: path.join('walkthrough-results', 'report.json'),
    results: 'test-results'
  })
})

export const CI_PORT = 3054
export const REPORT_PORT = 9323
// A person's pace takes far longer than the old fixed slowMo did (see
// pace.js): a full walk of every set can run past the old 25-minute limit.
const CI_GLOBAL_TIMEOUT_MS = 40 * 60 * 1000
const CI_WORKERS = 4
// Measured on the real journey at a person's pace: a story averages about
// two minutes, and the longest (what each page says when something is
// missing, or a cancelled amendment) about three, so no run is quicker.
const SECONDS_PER_STORY_PER_WORKER = 120
const LONGEST_STORY_MINUTES = 3

/** How many workers a local run gets: Playwright's own default, half the
 * logical processors, since the config sets none. */
export const localWorkers = (processors = availableParallelism()) =>
  Math.max(1, Math.floor(processors / 2))

/** A problem the designer can fix, said in one or two plain sentences. */
export class WalkthroughProblem extends Error {}

const describeSets = (sets) =>
  `The sets it can walk are: ${planWalkthroughs({ sets })
    .map((set) => set.setId)
    .join(', ')}.`

/**
 * Which sets to walk: those named with --set; every set with --all, or with
 * --ci and no --set; otherwise the designer's working release, or the real
 * journey when they have none.
 *
 * @param {object} options - from parseWalkthroughArgs.
 * @param {{ sets: object[], workingRelease: string|null }} context
 * @returns {string[]|null} the set ids, or null for every set.
 * @throws {WalkthroughProblem} when a named set cannot be walked.
 */
export const chooseSets = (options, { sets, workingRelease }) => {
  if (options.sets.length > 0) {
    const unknown = unknownSets(sets, options.sets)
    if (unknown.length > 0) {
      throw new WalkthroughProblem(
        `There is no set called ${unknown.map((id) => `"${id}"`).join(' or ')} with examples to walk. ${describeSets(sets)}`
      )
    }
    return options.sets
  }
  if (options.all || options.ci) {
    return null
  }
  return [workingRelease ?? REAL_JOURNEY_SET]
}

/**
 * The Playwright command-line arguments for a run.
 *
 * @param {object} options - from parseWalkthroughArgs.
 * @returns {string[]}
 */
export const playwrightArgs = (options) =>
  options.ci
    ? [
        'test',
        '--project=walkthroughs',
        '--reporter=list,blob,json',
        `--output=${OUTPUTS.ci.results}`,
        `--global-timeout=${CI_GLOBAL_TIMEOUT_MS}`,
        `--workers=${CI_WORKERS}`
      ]
    : [
        'test',
        '--project=walkthroughs',
        '--reporter=list,html,json',
        `--output=${OUTPUTS.local.results}`
      ]

/**
 * The environment Playwright runs with: the walkthroughs project switched on,
 * the sets to walk, the pace, the port, and where each report goes.
 *
 * @param {object} options - from parseWalkthroughArgs.
 * @param {{ root: string, port: number, setIds: string[]|null }} context
 * @returns {Record<string, string>}
 */
export const playwrightEnv = (options, { root, port, setIds }) => {
  const outputs = options.ci ? OUTPUTS.ci : OUTPUTS.local
  return {
    PROTOTYPE_WALKTHROUGHS: 'true',
    WALKTHROUGH_PACE: options.fast ? 'fast' : 'human',
    PORT: String(port),
    PLAYWRIGHT_JSON_OUTPUT_FILE: path.join(root, outputs.json),
    ...(setIds ? { WALKTHROUGH_SETS: setIds.join(',') } : {}),
    ...(options.ci
      ? { PLAYWRIGHT_BLOB_OUTPUT_DIR: path.join(root, outputs.blob) }
      : {
          PLAYWRIGHT_HTML_OUTPUT_DIR: path.join(root, outputs.html),
          PLAYWRIGHT_HTML_OPEN: 'never',
          PLAYWRIGHT_HTML_TITLE: `Walkthrough: ${setIds ? setIds.join(', ') : 'every set'}`
        })
  }
}

/** The lines a local run ends with: where the demo page and the technical
 * report are. */
export const whereLines = () => [
  '',
  `Demo page: ${path.join(OUTPUTS.local.site, 'index.html')}`,
  `How the pages connect: ${path.join(OUTPUTS.local.site, 'service-map', 'index.html')}`,
  `Technical report (every step, trace): ${path.join(OUTPUTS.local.site, 'tests', 'index.html')}`,
  'To watch it: npm run designer:walkthrough -- --show'
]

/**
 * About how long a human-paced walk takes: roughly two minutes per story,
 * shared across however many workers ran it, and never less than the
 * longest story takes on its own.
 *
 * @param {number} storyCount
 * @param {number} workers
 * @returns {number} whole minutes.
 */
export const paceEstimateMinutes = (storyCount, workers) =>
  Math.max(
    LONGEST_STORY_MINUTES,
    Math.ceil((storyCount * SECONDS_PER_STORY_PER_WORKER) / workers / 60)
  )

/** The line said before Playwright starts walking. */
export const walkingLine = (
  setIds,
  port,
  { fast = false, ci = false, storyCount = 0, workers: local = 1 } = {}
) => {
  const workers = ci ? CI_WORKERS : local
  const timing = fast
    ? 'This is the quick check, so it should take a few minutes.'
    : `At a person's pace this takes about ${paceEstimateMinutes(storyCount, workers)} minutes.`
  return `Walking ${setIds.join(', ')} through, on port ${port}. ${timing} Your own prototype on 3103 is not touched.`
}

/** The summary for the GitHub Actions job page, as markdown. */
export const stepSummary = (lines) =>
  ['### Walkthroughs', '', ...lines.map((line) => `- ${line.trim()}`), ''].join(
    '\n'
  )

/** The Playwright command line, run with this Node (never npx). */
export const PLAYWRIGHT_CLI = createRequire(import.meta.url).resolve(
  '@playwright/test/cli'
)

const runPlaywright = (args, { cwd, env }) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [PLAYWRIGHT_CLI, ...args], {
      cwd,
      env: { ...process.env, ...env },
      stdio: 'inherit'
    })
    child.once('error', () => resolve(1))
    child.once('exit', (code) => resolve(code ?? 1))
  })

/**
 * The command that stops the computer sleeping while the walkthrough runs,
 * or null where there is none. A Mac that goes to sleep part way freezes
 * every browser and timer, and the stories it was walking run out of time.
 * `caffeinate -i -w <pid>` holds the Mac awake until this process ends.
 *
 * @param {string} platform - `process.platform`.
 * @param {number} pid - this process's id.
 * @returns {{ command: string, args: string[] }|null}
 */
export const keepAwakeCommand = (platform, pid) =>
  platform === 'darwin'
    ? { command: 'caffeinate', args: ['-i', '-w', String(pid)] }
    : null

const keepAwake = () => {
  const awake = keepAwakeCommand(process.platform, process.pid)
  if (!awake) {
    return () => {}
  }
  const child = spawn(awake.command, awake.args, { stdio: 'ignore' })
  child.once('error', () => {})
  return () => {
    child.kill()
  }
}

const readReport = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

const chromiumInstalled = () => {
  try {
    return existsSync(chromium.executablePath())
  } catch {
    return false
  }
}

const serveReport = (folder, { cwd }) =>
  runPlaywright(['show-report', folder, `--port=${REPORT_PORT}`], {
    cwd,
    env: {}
  })

export const DEFAULT_DEPS = Object.freeze({
  readSets,
  workingRelease: (root) => defaultSet({ root }),
  chromiumInstalled,
  findFreePort,
  needsClientBuild,
  buildClientAssets: (root, logFile) => {
    mkdirSync(path.dirname(logFile), { recursive: true })
    return buildClientAssets(root, logFile)
  },
  runPlaywright,
  keepAwake,
  readReport,
  removeFile: (file) => rmSync(file, { force: true }),
  exists: existsSync,
  serveReport,
  appendSummary: (file, text) => appendFileSync(file, text),
  buildDemoSite,
  buildServiceMaps,
  localWorkers: () => localWorkers()
})

export const NO_BROWSER =
  'The browser designer:walkthrough uses is not installed. Run: npm run playwright:install'

const showLastReport = async ({ root, deps, say }) => {
  const folder = path.join(root, OUTPUTS.local.site)
  if (!deps.exists(path.join(folder, 'index.html'))) {
    throw new WalkthroughProblem(
      'There is no walkthrough report yet. Make one first: npm run designer:walkthrough'
    )
  }
  say(
    `Your walkthrough is open at http://localhost:${REPORT_PORT}. Press Ctrl+C here when you have finished looking.`
  )
  await deps.serveReport(folder, { cwd: root })
  return 0
}

/**
 * Runs designer:walkthrough.
 *
 * @param {object} options - from parseWalkthroughArgs.
 * @param {object} [settings] - `{ root, say, env, deps }`; `say` prints a
 *   line, `env` is the process environment (for GITHUB_STEP_SUMMARY).
 * @returns {Promise<number>} the exit code.
 */
export const runWalkthrough = async (
  options,
  {
    root = REPO_ROOT,
    say = () => {},
    env = process.env,
    deps = DEFAULT_DEPS
  } = {}
) => {
  if (options.show) {
    return showLastReport({ root, deps, say })
  }
  if (!deps.chromiumInstalled()) {
    throw new WalkthroughProblem(NO_BROWSER)
  }
  const sets = deps.readSets({ root })
  const setIds = chooseSets(options, {
    sets,
    workingRelease: deps.workingRelease(root)
  })
  const plan = planWalkthroughs({ sets, only: setIds })
  const expectedSets = plan.map((set) => set.setId)
  if (expectedSets.length === 0) {
    say('There is no set with examples to walk through.')
    return 0
  }
  if (deps.needsClientBuild(root)) {
    say(
      'Building the prototype styles and scripts first. This can take a minute.'
    )
    await deps.buildClientAssets(
      root,
      path.join(root, WALKTHROUGH_CACHE, 'build.log')
    )
  }
  const port = options.ci ? CI_PORT : await deps.findFreePort()
  const outputs = options.ci ? OUTPUTS.ci : OUTPUTS.local
  const jsonFile = path.join(root, outputs.json)
  deps.removeFile(jsonFile)
  const storyCount = plan.reduce((total, set) => total + set.stories.length, 0)
  say(
    walkingLine(expectedSets, port, {
      fast: options.fast,
      ci: options.ci,
      storyCount,
      workers: deps.localWorkers()
    })
  )
  const letSleep = deps.keepAwake()
  try {
    await deps.runPlaywright(playwrightArgs(options), {
      cwd: root,
      env: playwrightEnv(options, { root, port, setIds })
    })
  } finally {
    letSleep()
  }
  const verdict = readVerdict(deps.readReport(jsonFile), { expectedSets })
  const lines = summaryLines(verdict)
  say(['', ...lines].join('\n'))
  if (options.ci) {
    for (const warning of githubWarnings(verdict)) {
      say(warning)
    }
    if (env.GITHUB_STEP_SUMMARY) {
      deps.appendSummary(env.GITHUB_STEP_SUMMARY, stepSummary(lines))
    }
    return exitCodeOf(verdict)
  }
  await deps.buildDemoSite({
    root,
    reportFile: jsonFile,
    resultsDir: path.join(root, outputs.results),
    siteDir: path.join(root, OUTPUTS.local.site)
  })
  // The service map of each set walked, beside the demo page it links from.
  // A map that cannot be drawn says so on its own page; it never stops the
  // walkthrough.
  const maps = await deps.buildServiceMaps({
    root,
    setIds: expectedSets,
    reportFile: jsonFile,
    resultsDir: path.join(root, outputs.results),
    siteDir: path.join(root, OUTPUTS.local.site)
  })
  say(maps.lines.join('\n'))
  say(whereLines().join('\n'))
  if (options.open && !verdict.crashed) {
    await showLastReport({ root, deps, say })
  }
  return exitCodeOf(verdict)
}
