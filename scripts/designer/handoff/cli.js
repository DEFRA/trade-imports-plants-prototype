/**
 * `npm run designer:handoff -- --set <release> [options]`
 *
 * Writes `handoffs/<yyyy-mm-dd>-<slug>/` for the real plants-frontend team:
 * `brief.md`, `brief.jira.txt` (a story ready to paste into Jira),
 * `upstream.patch`, `report.json` and a `screenshots/` folder (at most 2 MB).
 * With `--dry-run` the same folder goes under `.cache/designer/handoff/`
 * instead, which git ignores. With `--brief-only` there is no patch.
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
  renderBriefJira,
  renderBriefMarkdown,
  storyOf
} from './brief.js'
import { readJourneyFlow } from './flow.js'
import { gitOrNull } from './git.js'
import { ANY_PAGE, pickScreenshots } from './screenshots.js'
import { CriteriaError, parseCriteria } from './story.js'

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
 * The things the brief reads that live outside the report: the set's
 * examples, the page orders, the prototype's settings, the branch and the
 * install command. Tests replace them.
 */
export const DEFAULT_SOURCES = Object.freeze({
  examples: (_root, setId) => examplesOf(setId),
  journeyFlow: (root, report) => readJourneyFlow(root, report),
  prototype: (root) => readPrototypeConfig({ root }),
  branch: currentBranchOf,
  installCommand: installCommandOf
})

/**
 * Builds the report and writes the folder. Returns
 * `{ report, dir, meta, shots, story }`.
 */
export const runHandoff = async (root, resolved, sources = DEFAULT_SOURCES) => {
  const use = { ...DEFAULT_SOURCES, ...sources }
  const criteria = readCriteria(root, resolved.criteria)
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
    links: resolved.links ?? [],
    date: resolved.date,
    slug: resolved.slug,
    branch: `feat/EUDPA-XXXX-${resolved.slug}`,
    designBranch: use.branch(root),
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
          designBranch: meta.designBranch
        },
        story: {
          criteriaFrom: story.criteriaSource,
          criteria: story.scenarios.length,
          placeholders: story.placeholders
        }
      },
      null,
      2
    ) + '\n'
  )
  tidyFiles([path.join(dir, 'brief.md'), path.join(dir, 'report.json')], {
    root
  })
  return { report, dir, meta, shots, story }
}

const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`

const patchLine = (report) =>
  report.briefOnly
    ? `- Brief only, no upstream.patch. ${report.briefOnly.reason}`
    : `- ${plural(report.files.length, 'file')} in upstream.patch. ${report.applyCheck.message.split('\n')[0]}`

const storyLines = (story) => [
  `- The story's acceptance criteria: ${plural(story.scenarios.length, 'criterion')}, ${story.criteriaSource === 'placeholder' ? 'still a placeholder' : `from ${story.criteriaSource}`}.`,
  story.placeholders.length
    ? `- Still to fill in with the designer's own words: ${story.placeholders.join('; ')}.`
    : '- The story has no placeholders left.'
]

/** The plain-English summary printed after a run. */
export const summaryLines = ({ report, dir, shots, story }, root) => {
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
  lines.push(`Read ${relativeDir}/brief.md next.`)
  return lines
}

export const main = async (
  argv,
  root = REPO_ROOT,
  sources = DEFAULT_SOURCES
) => {
  try {
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
