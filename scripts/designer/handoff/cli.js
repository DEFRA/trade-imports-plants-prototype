/**
 * `npm run designer:handoff -- --set <release> [options]`
 *
 * Writes `handoffs/<yyyy-mm-dd>-<slug>/` for the real plants-frontend team:
 * `brief.md`, `brief.jira.txt`, `upstream.patch`, `report.json` and a
 * `screenshots/` folder (at most 2 MB). With `--dry-run` the same folder goes
 * under `.cache/designer/handoff/` instead, which git ignores.
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
 *   --title "<text>"      the brief's heading
 *   --why "<text>"        what the change is and why, for the brief
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
import { buildHandoff, HandoffError, REAL_JOURNEY } from './build.js'
import {
  briefOutline,
  isContentNote,
  renderBriefJira,
  renderBriefMarkdown
} from './brief.js'
import { ANY_PAGE, pickScreenshots } from './screenshots.js'

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
  '--dry-run': 'dryRun',
  '--json': 'json'
}

const splitList = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

/** Parses the command line. Throws HandoffError for anything it does not know. */
export const parseArgs = (argv) => {
  const options = { features: [], recipes: [] }
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
      options[key] =
        key === 'features' || key === 'recipes'
          ? [...options[key], ...splitList(value)]
          : value
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
 * Builds the report and writes the folder. Returns `{ report, dir, meta }`.
 */
export const runHandoff = (root, resolved) => {
  const report = buildHandoff({ ...resolved, root })
  const galleryDir = galleryDirFor(root, resolved)
  const shots = pickScreenshots(galleryDir, screenshotSlugs(report))
  const meta = {
    title: resolved.title,
    why: resolved.why ?? null,
    date: resolved.date,
    slug: resolved.slug,
    branch: `feat/EUDPA-XXXX-${resolved.slug}`,
    screenshots: shots.picked,
    skippedScreenshots: shots.skipped
  }
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
  writeFileSync(path.join(dir, 'upstream.patch'), report.patch)
  writeFileSync(path.join(dir, 'brief.md'), renderBriefMarkdown(blocks))
  writeFileSync(path.join(dir, 'brief.jira.txt'), renderBriefJira(blocks))
  const { patch, ...withoutPatch } = report
  writeFileSync(
    path.join(dir, 'report.json'),
    JSON.stringify(
      {
        ...withoutPatch,
        patchLines: patch.split('\n').length - 1,
        screenshots: {
          galleryFound: shots.found,
          picked: shots.picked.map((shot) => shot.fileName),
          skipped: shots.skipped.map((shot) => shot.relative)
        },
        meta: { title: meta.title, why: meta.why, date: meta.date }
      },
      null,
      2
    ) + '\n'
  )
  tidyFiles([path.join(dir, 'brief.md'), path.join(dir, 'report.json')], {
    root
  })
  return { report, dir, meta, shots }
}

const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`

/** The plain-English summary printed after a run. */
export const summaryLines = ({ report, dir, shots }, root) => {
  const relativeDir = path.relative(root, dir)
  const designGaps = report.cannotShip.designGaps.filter(
    (row) => !isContentNote(row)
  )
  const contentNotes = report.cannotShip.designGaps.length - designGaps.length
  const lines = [
    `Hand-off written to ${relativeDir}/`,
    `- ${plural(report.files.length, 'file')} in upstream.patch. ${report.applyCheck.message.split('\n')[0]}`,
    `- ${plural(report.cannotShip.welshNeeded.length, 'Welsh string')} still need translating.`,
    `- ${plural(report.testImpact.length, 'place')} in the tests still expect the old words.`,
    `- ${plural((report.specImpact ?? []).length, 'place')} in the real journey's requirement files (spec/) still quote the old words.`,
    `- ${plural(report.cannotShip.services.length, 'use')} of a service that only exists in the prototype (needs a real service), and ${plural(designGaps.length, 'design gap')}, cannot ship as they are.`,
    ...(contentNotes > 0
      ? [
          `- ${plural(contentNotes, 'content note')} for a content designer (they do not stop it shipping).`
        ]
      : []),
    `- ${plural(report.leftOut.length, 'file')} left out of the patch.`
  ]
  if (report.cannotShip.services.length > 0) {
    lines.push(
      '- The patch leaves out every file that uses a prototype-only service, and every file that imports one. It applies, but the whole change only works once the real team builds those services.'
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

export const main = (argv, root = REPO_ROOT) => {
  try {
    const resolved = resolveOptions(parseArgs(argv))
    if (resolved.set === REAL_JOURNEY && !resolved.base) {
      resolved.base = 'main'
    }
    const result = runHandoff(root, resolved)
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
  process.exitCode = main(process.argv.slice(2))
}
