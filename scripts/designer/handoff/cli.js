/**
 * `npm run designer:handoff -- --set <release> [options]`
 * `npm run designer:handoff -- status --dir <handoffs/folder> [--json]`
 *
 * Writes `handoffs/<yyyy-mm-dd>-<slug>/` for the real plants-frontend team:
 * `brief.md`, `brief.jira.txt` (a story ready to paste into Jira),
 * `ticket.json` and `ticket.description.jira.txt` (a `tim-ticket/1` manifest
 * `tim jira create --from` can raise for real), `upstream.patch`,
 * `report.json` and a `screenshots/` folder (at most 2 MB). With `--dry-run`
 * the same folder goes under `.cache/designer/handoff/` instead, which git
 * ignores. With `--brief-only` there is no patch, and `ticket.json` has no
 * `upstream.patch` attachment.
 *
 * `status` records a raised hand-off's real ticket and branch, once
 * `tim jira create --from <folder>/ticket.json --confirm <planId>` has
 * written that folder's `ticket.created.json`: `Ticket:` and `Branch:` lines
 * under the brief's own heading, and a row of `handoffs/README.md`'s
 * "Keeping track" table.
 *
 * Options:
 *   --set <id>            the design release to hand over (required). Use
 *                         high-risk-plants for a change made on a handoff/*
 *                         branch straight to the real journey.
 *   --features a,b        only these feature folders (default: everything)
 *   --since <commit>      only what changed in the release after that commit
 *                         (saved since, or not saved yet), for example the
 *                         commit that started the release
 *   --all                 everything the release changed (the default)
 *   --slug <slug>         folder name after the date (default: the set id)
 *   --title "<text>"      the story's summary and the brief's heading
 *   --why "<text>"        what the change is and why, in the designer's words
 *   --as "<text>"         who it is for, in the designer's words (the story's
 *                         "As"); left out, the story shows a placeholder
 *   --want "<text>"       what they need to do (the story's "I want")
 *   --so-that "<text>"    why they need it (the story's "So that")
 *   --criteria <file>     acceptance criteria as Given, When, Then lines, one
 *                         blank line between criteria (the agent drafts it,
 *                         the designer confirms it). A change of words only
 *                         gets its criteria written for it when this is left
 *                         out.
 *   --criteria-draft      the --criteria file is the agent's draft, not yet
 *                         confirmed by the designer: the story shows it as
 *                         "Draft acceptance criteria, to confirm" and lists
 *                         it among the placeholders
 *   --link <url>          a link to see the prototype: the design branch, the
 *                         pull request (repeat for each)
 *   --brief-only          the story, pictures, links and services, with no
 *                         patch (always so for a release made from
 *                         sample-journey)
 *   --recipe <name>       a recipe the change followed (repeat or a,b)
 *   --base <ref>          with --set high-risk-plants: compare with (main)
 *   --from <id>           what the release was made from, if it has no
 *                         release.json (default high-risk-plants)
 *   --gaps-from <id>      with --set high-risk-plants: the release whose
 *                         design gaps and research rules travel with it
 *   --gallery <dir>       a designer:show folder to take screenshots from
 *                         (default .cache/designer/show/<set>/latest)
 *   --no-screenshots      leave screenshots out
 *   --date <yyyy-mm-dd>   the date in the folder name (default today)
 *   --dry-run             write under .cache/designer/handoff/ instead
 *   --json                print the report as JSON
 *
 * `status` options:
 *   --dir <folder>        the hand-off folder, for example
 *                         handoffs/2026-09-27-arrival-time-hint (required)
 *   --json                print the result as JSON
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { tidyFiles } from '../format/cli.js'
import { readPrototypeConfig } from '../lib/prototype-config.js'
import { installCommandFor } from '../preflight/checks.js'
import { loadExamples } from '../../../src/server/prototype-seed/examples.js'
import { buildHandoff, HandoffError, REAL_JOURNEY } from './build.js'
import {
  briefOutline,
  isContentNote,
  isStoryReady,
  renderBriefJira,
  renderBriefMarkdown,
  renderTicketDescriptionJira,
  storyOf
} from './brief.js'
import { readJourneyFlow } from './flow.js'
import { gitOrNull } from './git.js'
import { ANY_PAGE, pickScreenshots } from './screenshots.js'
import {
  CriteriaError,
  parseCriteria,
  TICKET_DESCRIPTION_FILE,
  ticketManifestFor
} from './story.js'

export const REPO_ROOT = path.resolve(
  fileURLToPath(import.meta.url),
  '../../../..'
)

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const VALUE_OPTIONS = {
  '--set': 'set',
  '--features': 'features',
  '--since': 'since',
  '--slug': 'slug',
  '--title': 'title',
  '--why': 'why',
  '--as': 'as',
  '--want': 'want',
  '--so-that': 'soThat',
  '--criteria': 'criteria',
  '--link': 'links',
  '--recipe': 'recipes',
  '--base': 'base',
  '--from': 'from',
  '--gaps-from': 'gapsFrom',
  '--gallery': 'gallery',
  '--date': 'date'
}

const FLAG_OPTIONS = {
  '--all': 'all',
  '--no-screenshots': 'noScreenshots',
  '--brief-only': 'briefOnly',
  '--criteria-draft': 'criteriaDraft',
  '--dry-run': 'dryRun',
  '--json': 'json'
}

/** Options that may be given more than once, each adding to a list. */
const LIST_OPTIONS = new Set(['features', 'recipes', 'links'])

const splitList = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

/** Parses the command line. Throws HandoffError for anything it does not know. */
export const parseArgs = (argv) => {
  const options = { features: [], recipes: [], links: [] }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const [name, inlineValue] = arg.includes('=') ? arg.split(/=(.*)/s) : [arg]
    if (FLAG_OPTIONS[name]) {
      options[FLAG_OPTIONS[name]] = true
    } else if (VALUE_OPTIONS[name]) {
      const value = inlineValue ?? argv[++index]
      if (value === undefined || value.startsWith('--')) {
        throw new HandoffError(`${name} needs a value.`)
      }
      const key = VALUE_OPTIONS[name]
      if (key === 'links') {
        options.links = [...options.links, value.trim()]
      } else {
        options[key] = LIST_OPTIONS.has(key)
          ? [...options[key], ...splitList(value)]
          : value
      }
    } else {
      throw new HandoffError(
        `I do not know "${arg}". See the top of scripts/designer/handoff/cli.js for the options.`
      )
    }
  }
  if (options.all && options.features.length) {
    throw new HandoffError('Use --features or --all, not both.')
  }
  if (options.since && options.features.length) {
    throw new HandoffError('Use --features or --since, not both.')
  }
  if (options.criteriaDraft && !options.criteria) {
    throw new HandoffError('--criteria-draft needs --criteria <file> too.')
  }
  return options
}

const today = () => new Date().toLocaleDateString('en-CA')

const sentenceCaseSlug = (slug) => {
  const words = slug.split('-').join(' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Fills in defaults and checks the slug and date are safe for a folder name. */
export const resolveOptions = (options) => {
  if (!options.set) {
    throw new HandoffError(
      'Say which design release to hand over, for example: npm run designer:handoff -- --set plants-working'
    )
  }
  const slug = options.slug ?? options.set
  const date = options.date ?? today()
  if (!KEBAB.test(slug)) {
    throw new HandoffError(
      `"${slug}" cannot be a folder name. Use lower-case words joined by hyphens, like "consignment-addresses".`
    )
  }
  if (!ISO_DATE.test(date)) {
    throw new HandoffError(`--date must look like 2026-09-27, not "${date}".`)
  }
  return {
    ...options,
    slug,
    date,
    title:
      options.title ??
      `${sentenceCaseSlug(slug)}: hand-off from the plants prototype`,
    folderName: `${date}-${slug}`
  }
}

/** Where the folder goes: committed `handoffs/`, or ignored `.cache/` for a dry run. */
export const outputDir = (root, resolved) =>
  resolved.dryRun
    ? path.join(root, '.cache/designer/handoff', resolved.folderName)
    : path.join(root, 'handoffs', resolved.folderName)

/**
 * The pages to take screenshots of. A change across the journey (flow,
 * captions, shared copy) shows on pages it has no folder for, so it takes
 * every page in the gallery.
 */
const screenshotSlugs = (report) => [
  ...new Set(report.pages.flatMap((page) => page.slugs)),
  ...(report.pages.some((page) => !page.feature) ? [ANY_PAGE] : [])
]

/**
 * The designer:show folder to take screenshots from: the one named, or the
 * set's newest run (`latest`, a link; `latest.txt` where links are not
 * allowed). Null with --no-screenshots.
 */
export const galleryDirFor = (root, resolved) => {
  if (resolved.noScreenshots) {
    return null
  }
  if (resolved.gallery) {
    return path.resolve(root, resolved.gallery)
  }
  const setFolder = path.join(root, '.cache/designer/show', resolved.set)
  const latest = path.join(setFolder, 'latest')
  const latestTxt = path.join(setFolder, 'latest.txt')
  if (!existsSync(latest) && existsSync(latestTxt)) {
    return path.join(setFolder, readFileSync(latestTxt, 'utf8').trim())
  }
  return latest
}

/**
 * The acceptance criteria from `--criteria`, or null when none was named.
 * The file is read from the repo root when the path is relative.
 */
export const readCriteria = (root, criteriaPath) => {
  if (!criteriaPath) {
    return null
  }
  const full = path.resolve(root, criteriaPath)
  if (!existsSync(full)) {
    throw new HandoffError(
      `There is no criteria file at ${criteriaPath}. Write the acceptance criteria there first, as Given, When and Then lines.`
    )
  }
  try {
    return parseCriteria(readFileSync(full, 'utf8'))
  } catch (error) {
    if (error instanceof CriteriaError) {
      throw new HandoffError(error.message)
    }
    throw error
  }
}

/** The set's example notifications, or none when they cannot be loaded. */
const examplesOf = (setId) => {
  try {
    return loadExamples(setId)
  } catch {
    return []
  }
}

/** The install command `designer:preflight` prints, from package.json. */
const installCommandOf = (root) => {
  try {
    const { packageManager } = JSON.parse(
      readFileSync(path.join(root, 'package.json'), 'utf8')
    )
    return installCommandFor(packageManager)
  } catch {
    return installCommandFor(null)
  }
}

const currentBranchOf = (root) =>
  gitOrNull(['branch', '--show-current'], { cwd: root })?.trim() || null

/**
 * Whether this computer has seen the branch on GitHub (`origin`): true or
 * false, or null when there is no branch to ask about.
 */
const branchOnGitHubOf = (root, branch) =>
  branch
    ? gitOrNull(
        ['rev-parse', '--verify', '--quiet', `refs/remotes/origin/${branch}`],
        { cwd: root }
      ) !== null
    : null

/**
 * The things the brief reads that live outside the report: the set's
 * examples, the page orders, the prototype's settings, the branch and the
 * install command. Tests replace them.
 */
export const DEFAULT_SOURCES = Object.freeze({
  examples: (_root, setId) => examplesOf(setId),
  journeyFlow: (root, report) => readJourneyFlow(root, report),
  prototype: (root) => readPrototypeConfig({ root }),
  branch: currentBranchOf,
  branchOnGitHub: branchOnGitHubOf,
  installCommand: installCommandOf
})

/**
 * Builds the report and writes the folder. Returns
 * `{ report, dir, meta, shots, story }`.
 */
export const runHandoff = async (root, resolved, sources = DEFAULT_SOURCES) => {
  const use = { ...DEFAULT_SOURCES, ...sources }
  const criteria = readCriteria(root, resolved.criteria)
  const designBranch = use.branch(root)
  const built = buildHandoff({ ...resolved, root })
  const report = { ...built, journeyFlow: await use.journeyFlow(root, built) }
  const galleryDir = galleryDirFor(root, resolved)
  const shots = pickScreenshots(galleryDir, screenshotSlugs(report))
  const meta = {
    title: resolved.title,
    why: resolved.why ?? null,
    as: resolved.as ?? null,
    want: resolved.want ?? null,
    soThat: resolved.soThat ?? null,
    criteria,
    criteriaDraft: Boolean(resolved.criteriaDraft),
    links: resolved.links ?? [],
    date: resolved.date,
    slug: resolved.slug,
    branch: resolved.ticketKey
      ? `feat/${resolved.ticketKey}-${resolved.slug}`
      : `feat/<story key>-${resolved.slug}`,
    designBranch,
    designBranchOnGitHub: use.branchOnGitHub(root, designBranch),
    installCommand: use.installCommand(root),
    prototype: use.prototype(root),
    examples: use.examples(root, report.set),
    screenshots: shots.picked,
    skippedScreenshots: shots.skipped
  }
  const story = storyOf(report, meta)
  const blocks = briefOutline(report, meta)
  const dir = outputDir(root, resolved)
  mkdirSync(dir, { recursive: true })
  const shotsDir = path.join(dir, 'screenshots')
  rmSync(shotsDir, { recursive: true, force: true })
  if (shots.picked.length) {
    mkdirSync(shotsDir, { recursive: true })
    for (const shot of shots.picked) {
      copyFileSync(shot.full, path.join(shotsDir, shot.fileName))
    }
  }
  const patchFile = path.join(dir, 'upstream.patch')
  if (report.briefOnly) {
    rmSync(patchFile, { force: true })
  } else {
    writeFileSync(patchFile, report.patch)
  }
  writeFileSync(path.join(dir, 'brief.md'), renderBriefMarkdown(blocks))
  writeFileSync(path.join(dir, 'brief.jira.txt'), renderBriefJira(blocks))
  writeFileSync(
    path.join(dir, TICKET_DESCRIPTION_FILE),
    renderTicketDescriptionJira(blocks)
  )
  const ticketManifest = ticketManifestFor(report, meta)
  writeFileSync(
    path.join(dir, 'ticket.json'),
    JSON.stringify(ticketManifest, null, 2) + '\n'
  )
  const { patch, ...withoutPatch } = report
  writeFileSync(
    path.join(dir, 'report.json'),
    JSON.stringify(
      {
        ...withoutPatch,
        patchLines: patch ? patch.split('\n').length - 1 : 0,
        screenshots: {
          galleryFound: shots.found,
          picked: shots.picked.map((shot) => shot.fileName),
          skipped: shots.skipped.map((shot) => shot.relative)
        },
        meta: {
          title: meta.title,
          why: meta.why,
          as: meta.as,
          want: meta.want,
          soThat: meta.soThat,
          links: meta.links,
          date: meta.date,
          designBranch: meta.designBranch,
          designBranchOnGitHub: meta.designBranchOnGitHub
        },
        story: {
          criteriaFrom: story.criteriaSource,
          criteria: story.scenarios.length,
          placeholders: story.placeholders,
          ready: isStoryReady(story)
        }
      },
      null,
      2
    ) + '\n'
  )
  tidyFiles(
    [
      path.join(dir, 'brief.md'),
      path.join(dir, 'ticket.json'),
      path.join(dir, 'report.json')
    ],
    { root }
  )
  return { report, dir, meta, shots, story, ticketManifest }
}

/** The status lines a hand-off keeps directly under its brief's `# ` title,
 * in this order, as `handoffs/README.md`'s "Keeping track" describes. */
export const STATUS_LABELS = Object.freeze([
  'Status',
  'Sent on',
  'Ticket',
  'Branch',
  'Merged in plants-frontend'
])

const labelOf = (line) => {
  const at = line.indexOf(': ')
  return at === -1 ? null : line.slice(0, at)
}

/**
 * Inserts or updates a brief's status lines, directly under its `# ` title:
 * `Status:`, `Sent on:`, `Ticket:`, `Branch:` and `Merged in
 * plants-frontend:`. A block already there is merged into, field by field,
 * never duplicated.
 *
 * @param {string} markdown - the brief, as written by `runHandoff`.
 * @param {Object<string, string>} updates - one or more of `STATUS_LABELS`
 * mapped to its new value.
 */
export const setStatusLines = (markdown, updates) => {
  const lines = markdown.split('\n')
  const titleIndex = lines.findIndex((line) => line.startsWith('# '))
  if (titleIndex === -1) {
    return markdown
  }
  let cursor = titleIndex + 1
  while (lines[cursor] === '') {
    cursor += 1
  }
  const blockStart = cursor
  while (
    cursor < lines.length &&
    STATUS_LABELS.includes(labelOf(lines[cursor]))
  ) {
    cursor += 1
  }
  const existing = Object.fromEntries(
    lines.slice(blockStart, cursor).map((line) => {
      const label = labelOf(line)
      return [label, line.slice(label.length + 2)]
    })
  )
  const merged = { ...existing, ...updates }
  const blockLines = STATUS_LABELS.filter(
    (label) => merged[label] !== undefined
  ).map((label) => `${label}: ${merged[label]}`)
  let rest = lines.slice(cursor)
  while (rest[0] === '') {
    rest = rest.slice(1)
  }
  return [
    ...lines.slice(0, titleIndex + 1),
    '',
    ...blockLines,
    ...(rest.length ? ['', ...rest] : [])
  ].join('\n')
}

const HANDOFFS_TABLE_HEADER = '| Hand-off | Ticket | Branch |'
const HANDOFFS_TABLE_DIVIDER = '| --- | --- | --- |'

/**
 * Records one hand-off's ticket and branch as a row of the "Keeping track"
 * table in `handoffs/README.md`, adding the table on its first use. A
 * hand-off already in the table is updated in place, never duplicated.
 */
export const recordHandoffStatus = (readme, { folderName, ticket, branch }) => {
  const row = `| ${folderName} | ${ticket} | ${branch} |`
  const lines = readme.split('\n')
  const headerIndex = lines.indexOf(HANDOFFS_TABLE_HEADER)
  if (headerIndex === -1) {
    const withTrailingNewline = readme.endsWith('\n') ? readme : `${readme}\n`
    return `${withTrailingNewline}\n${HANDOFFS_TABLE_HEADER}\n${HANDOFFS_TABLE_DIVIDER}\n${row}\n`
  }
  const folderOf = (line) => line.split('|')[1]?.trim()
  let cursor = headerIndex + 2
  while (cursor < lines.length && lines[cursor].startsWith('|')) {
    if (folderOf(lines[cursor]) === folderName) {
      lines[cursor] = row
      return lines.join('\n')
    }
    cursor += 1
  }
  lines.splice(cursor, 0, row)
  return lines.join('\n')
}

const STATUS_VALUE_OPTIONS = { '--dir': 'dir' }
const STATUS_FLAG_OPTIONS = { '--json': 'json' }

/** Parses `status`'s own arguments (everything after the word "status"). */
export const parseStatusArgs = (argv) => {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (STATUS_FLAG_OPTIONS[arg]) {
      options[STATUS_FLAG_OPTIONS[arg]] = true
      continue
    }
    if (!STATUS_VALUE_OPTIONS[arg]) {
      throw new HandoffError(
        `I do not know "${arg}". "status" takes --dir <handoffs/folder> and --json.`
      )
    }
    const value = argv[++index]
    if (value === undefined || value.startsWith('--')) {
      throw new HandoffError(`${arg} needs a value.`)
    }
    options[STATUS_VALUE_OPTIONS[arg]] = value
  }
  if (!options.dir) {
    throw new HandoffError(
      'Say which hand-off folder: status --dir handoffs/<folder>.'
    )
  }
  return options
}

const HANDOFF_FOLDER_NAME = /^\d{4}-\d{2}-\d{2}-(.+)$/
export const TICKET_CREATED_FILE = 'ticket.created.json'
const HANDOFFS_README = 'handoffs/README.md'

/**
 * `status --dir <folder>`: reads that hand-off's `ticket.created.json`
 * (written by `tim jira create --confirm`) and records the real ticket and
 * branch in the brief's status lines and in `handoffs/README.md`'s
 * "Keeping track" table.
 */
export const runStatus = (root, options) => {
  const dir = path.resolve(root, options.dir)
  const folderName = path.basename(dir)
  const match = HANDOFF_FOLDER_NAME.exec(folderName)
  if (!match) {
    throw new HandoffError(
      `"${folderName}" does not look like a hand-off folder (<yyyy-mm-dd>-<slug>).`
    )
  }
  const createdPath = path.join(dir, TICKET_CREATED_FILE)
  if (!existsSync(createdPath)) {
    throw new HandoffError(
      `There is no ${TICKET_CREATED_FILE} in ${options.dir}. Run tim jira create --from ${options.dir}/ticket.json --confirm <planId> first.`
    )
  }
  const created = JSON.parse(readFileSync(createdPath, 'utf8'))
  const branch = `feat/${created.key}-${match[1]}`
  const briefPath = path.join(dir, 'brief.md')
  writeFileSync(
    briefPath,
    setStatusLines(readFileSync(briefPath, 'utf8'), {
      Status: 'sent',
      'Sent on': today(),
      Ticket: created.key,
      Branch: branch
    })
  )
  const readmePath = path.join(root, HANDOFFS_README)
  writeFileSync(
    readmePath,
    recordHandoffStatus(readFileSync(readmePath, 'utf8'), {
      folderName,
      ticket: created.key,
      branch
    })
  )
  tidyFiles([briefPath, readmePath], { root })
  return {
    dir,
    folderName,
    ticket: created.key,
    ticketUrl: created.url,
    branch
  }
}

const plural = (count, noun, many = `${noun}s`) =>
  `${count} ${count === 1 ? noun : many}`

const patchLine = (report) =>
  report.briefOnly
    ? `- Brief only, no upstream.patch. ${report.briefOnly.reason}`
    : `- ${plural(report.files.length, 'file')} in upstream.patch. ${report.applyCheck.message.split('\n')[0]}`

const storyLines = (story) => [
  `- The story's acceptance criteria: ${plural(story.scenarios.length, 'criterion', 'criteria')}, ${story.criteriaSource === 'placeholder' ? 'still a placeholder' : `from ${story.criteriaSource}`}.`,
  story.placeholders.length
    ? `- Still to fill in with the designer's own words: ${story.placeholders.join('; ')}.`
    : '- The story has no placeholders left.'
]

/** The plain-English summary printed after a run. */
export const summaryLines = ({ report, dir, shots, story, meta }, root) => {
  const relativeDir = path.relative(root, dir)
  const designGaps = report.cannotShip.designGaps.filter(
    (row) => !isContentNote(row)
  )
  const contentNotes = report.cannotShip.designGaps.length - designGaps.length
  const services = report.servicesToBuild ?? []
  const lines = [
    `Hand-off written to ${relativeDir}/`,
    ...(story ? storyLines(story) : []),
    patchLine(report),
    `- ${plural(report.cannotShip.welshNeeded.length, 'Welsh string')} still need translating.`,
    `- ${plural(report.testImpact.length, 'place')} in the tests still expect the old words.`,
    `- ${plural((report.specImpact ?? []).length, 'place')} in the requirement files (the real journey's spec/ folder and the workspace's openspec/specs/plants) still quote the old words.`,
    `- ${plural(services.length, 'new service')} to build${services.length ? ` (${services.map((service) => service.name).join(', ')}: index.js and client.js${report.briefOnly ? ' are described in the brief' : ' travel in the patch as proposed files'})` : ''}.`,
    `- ${plural(report.cannotShip.services.length, 'use')} of the prototype's own example data or stub plumbing, and ${plural(designGaps.length, 'design gap')}, cannot ship as they are.`,
    ...(contentNotes > 0
      ? [
          `- ${plural(contentNotes, 'content note')} for a content designer (they do not stop it shipping).`
        ]
      : []),
    `- ${plural(report.leftOut.length, 'file')} left out of the patch.`
  ]
  if (report.cannotShip.services.length > 0) {
    lines.push(
      "- The patch leaves out every file that uses the prototype's own example data or stub plumbing, and every file that imports one. It applies, but the whole change only works once the real team has a real source for that data."
    )
  }
  if (report.upstreamApplyCheck && !report.upstreamApplyCheck.ok) {
    lines.push(
      `- It does not apply cleanly to plants-frontend's ${report.upstreamApplyCheck.ref}: the real service has moved on since the last weekly update.`
    )
  }
  if (!shots.found) {
    lines.push(
      '- No screenshots: run npm run designer:show -- --set <id> --pages changed --before first.'
    )
  } else {
    lines.push(`- ${plural(shots.picked.length, 'screenshot')} copied.`)
  }
  if (report.drift.overlapping.length) {
    lines.push(
      `- The real journey has changed in ${plural(report.drift.overlapping.length, 'file')} this change also touches.`
    )
  }
  if (!report.applyCheck.ok) {
    lines.push(`  ${report.applyCheck.message}`)
  }
  if (meta?.designBranchOnGitHub === false) {
    lines.push(
      `- ${meta.designBranch} is not on GitHub yet, so a developer cannot switch to it: push it first (ask the designer), then run this again.`
    )
  }
  lines.push(`Read ${relativeDir}/brief.md next.`)
  return lines
}

/** The plain-English summary printed after `status`. */
export const statusSummaryLines = (result, root) => [
  `Recorded Ticket: ${result.ticket} and Branch: ${result.branch} in ${path.relative(root, result.dir)}/brief.md and ${HANDOFFS_README}.`
]

export const main = async (
  argv,
  root = REPO_ROOT,
  sources = DEFAULT_SOURCES
) => {
  try {
    if (argv[0] === 'status') {
      const options = parseStatusArgs(argv.slice(1))
      const result = runStatus(root, options)
      if (options.json) {
        console.log(
          JSON.stringify(
            { ...result, dir: path.relative(root, result.dir) },
            null,
            2
          )
        )
      } else {
        console.log(statusSummaryLines(result, root).join('\n'))
      }
      return 0
    }
    const resolved = resolveOptions(parseArgs(argv))
    if (resolved.set === REAL_JOURNEY && !resolved.base) {
      resolved.base = 'main'
    }
    const result = await runHandoff(root, resolved, sources)
    if (resolved.json) {
      console.log(
        JSON.stringify(
          { dir: path.relative(root, result.dir), ...result.report },
          null,
          2
        )
      )
    } else {
      console.log(summaryLines(result, root).join('\n'))
    }
    return 0
  } catch (error) {
    if (error instanceof HandoffError) {
      console.error(error.message)
      return 1
    }
    throw error
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2))
}
