/**
 * One designer:show run from start to finish: work out the pages, start a
 * private copy of the prototype (and of the last saved version, for
 * --before), take the pictures, write the gallery, stop everything it
 * started. Writes only under .cache/designer/, which git ignores, so
 * `git status` is the same before and after.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { chromium } from '@playwright/test'

import {
  REPO_ROOT,
  changedAndUntrackedPaths,
  currentBranch,
  listSets,
  pagesForChangedPaths,
  pagesOf,
  revParse,
  setDir
} from '../lib/index.js'
import { buildClientAssets, needsClientBuild } from './assets.js'
import { DESIGNER_CACHE, prepareBaseTree } from './base-tree.js'
import {
  NOTIFICATION_PLACEHOLDER,
  captureSet,
  missingFilesNote,
  recordWalkthrough
} from './capture.js'
import { GOVUK_STYLESHEET, renderGallery } from './gallery.js'
import {
  STATES,
  VARIANTS,
  WIDTHS,
  allCaptures,
  axeReport,
  buildManifest,
  fileSafe,
  runFolderName
} from './manifest.js'
import { findFreePort, startShowServer } from './server.js'
import { readScenarios } from './steps.js'
import {
  knownKeys,
  pageKey,
  planWalk,
  resolvePageName,
  resolveWanted
} from './targets.js'

const DESIGNER_PORT_URL = 'http://localhost:3103'
const GOVUK_CSS_SOURCE =
  'node_modules/govuk-frontend/dist/govuk/govuk-frontend.min.css'

/** A problem the designer can fix, said in one or two plain sentences. */
export class ShowProblem extends Error {}

const orNull = (read) => {
  try {
    return read()
  } catch {
    return null
  }
}

const describeSets = (sets) => `The sets are: ${sets.join(', ')}.`

const checkSets = (options, sets) => {
  if (!options.set) {
    throw new ShowProblem(
      `Say which set to show, for example: npm run designer:show -- --set ${sets.find((id) => id !== 'sample-journey') ?? sets[0]}. ${describeSets(sets)}`
    )
  }
  for (const id of [options.set, options.compare].filter(Boolean)) {
    if (!sets.includes(id)) {
      throw new ShowProblem(
        `There is no set called "${id}". ${describeSets(sets)}`
      )
    }
  }
}

/**
 * Where a reference image is: relative to the folder the designer ran npm
 * from, or else to the prototype's own folder.
 */
const findImage = (image, root) => {
  const candidates = [
    path.resolve(process.env.INIT_CWD ?? process.cwd(), image),
    path.resolve(root, image)
  ]
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
}

const resolveReferences = (options, pages, scenarios, root) =>
  options.references.map(({ page, image }) => {
    const key = resolvePageName(page, pages, scenarios)
    if (!key) {
      throw new ShowProblem(
        `--reference names a page "${page}" that ${options.set} does not have. Its pages are: ${knownKeys(pages, scenarios).join(', ')}.`
      )
    }
    const file = findImage(image, root)
    if (!existsSync(file)) {
      throw new ShowProblem(
        `Cannot find the reference image ${image} (looked for ${file}).`
      )
    }
    return { key, file }
  })

const changedKeysOf = async (setId, changedFiles, root) => {
  const pages = await pagesForChangedPaths(changedFiles, { root })
  return pages.filter((page) => page.setId === setId).map(pageKey)
}

export const CHOOSER_KEY = 'chooser'

/**
 * The extra addresses to picture, `[{ key, address }]`: the chooser
 * (`--pages chooser`), each example link (`--examples`) and each `--url`.
 */
export const addressesFor = (options) => [
  ...(options.pages.keys.includes(CHOOSER_KEY)
    ? [{ key: CHOOSER_KEY, address: '/' }]
    : []),
  ...(options.exampleLinks ?? []).map((slug) => ({
    key: `example:${slug}`,
    address: `/examples/${options.set}/${slug}`
  })),
  ...(options.urls ?? []).map((address) => ({ key: address, address }))
]

const withoutChooser = (pagesChoice) => ({
  ...pagesChoice,
  keys: pagesChoice.keys.filter((key) => key !== CHOOSER_KEY)
})

const needsNotification = (addresses) =>
  addresses.some(({ address }) => address.includes(NOTIFICATION_PLACEHOLDER))

/**
 * Works out which pages to show and how to reach them, without starting
 * anything.
 */
export const planShow = async (options, { root = REPO_ROOT } = {}) => {
  const sets = listSets({ root })
  checkSets(options, sets)
  const pages = await pagesOf(options.set, { root })
  const scenarios = readScenarios(setDir(options.set, { root }))
  const changedFiles = orNull(() => changedAndUntrackedPaths({ root })) ?? []
  const addresses = addressesFor(options)
  const pagesChoice = withoutChooser(options.pages)
  const changedKeys =
    pagesChoice.mode === 'changed'
      ? await changedKeysOf(options.set, changedFiles, root)
      : []
  const { keys, problems } = resolveWanted(pagesChoice, {
    pages,
    scenarios,
    changedKeys,
    setId: options.set
  })
  if (problems.length > 0) {
    throw new ShowProblem(problems.join('\n'))
  }
  const references = resolveReferences(options, pages, scenarios, root)
  const wanted = knownKeys(pages, scenarios).filter(
    (key) =>
      keys.includes(key) ||
      references.some((reference) => reference.key === key)
  )
  return {
    pages,
    scenarios,
    changedFiles,
    references,
    wanted,
    addresses,
    plan: planWalk({
      pages,
      scenarios,
      wanted,
      eachExample: options.eachExample,
      finish: needsNotification(addresses)
    })
  }
}

const planFor = async (setId, wanted, root, options, addresses) => {
  const pages = await pagesOf(setId, { root })
  const scenarios = readScenarios(setDir(setId, { root }))
  const known = knownKeys(pages, scenarios)
  return {
    scenarios,
    missing: wanted.filter((key) => !known.includes(key)),
    plan: planWalk({
      pages,
      scenarios,
      wanted: wanted.filter((key) => known.includes(key)),
      eachExample: options.eachExample,
      finish: needsNotification(addresses)
    })
  }
}

/**
 * The gallery's page names in order: each wanted page, or (with
 * --each-example) its one-per-example names where it has them, then every
 * extra address.
 */
export const galleryKeys = (wanted, runs, addresses) => {
  const taken = runs.flatMap(({ run }) => [...run.results.keys()])
  const keys = wanted.flatMap((key) => {
    const perExample = [
      ...new Set(taken.filter((name) => name.startsWith(`${key}@`)))
    ]
    return perExample.length > 0 ? perExample : [key]
  })
  return [...keys, ...addresses.map(({ key }) => key)]
}

const pointLatest = (setFolder, runName) => {
  const latest = path.join(setFolder, 'latest')
  try {
    unlinkSync(latest)
  } catch {
    // nothing to replace
  }
  try {
    symlinkSync(runName, latest, 'dir')
  } catch {
    writeFileSync(path.join(setFolder, 'latest.txt'), `${runName}\n`)
  }
}

const copyReferences = (references, outDir) =>
  references.map(({ key, file }) => {
    const name = `${fileSafe(key)}--${VARIANTS.reference}--${STATES.page}--${WIDTHS.desktop}${path.extname(file).toLowerCase()}`
    copyFileSync(file, path.join(outDir, name))
    return {
      key,
      variant: VARIANTS.reference,
      state: STATES.page,
      width: WIDTHS.desktop,
      file: name
    }
  })

const mergeResults = (wanted, runs, references) =>
  wanted.map((key) => {
    const merged = {
      key,
      title: null,
      path: null,
      captures: [],
      axe: {},
      notes: []
    }
    for (const { run, label } of runs) {
      const result = run.results.get(key)
      if (result) {
        merged.title = merged.title ?? result.title
        merged.path = merged.path ?? result.path
        merged.captures.push(...result.captures)
        Object.assign(merged.axe, result.axe)
        merged.notes.push(
          ...result.notes.map((note) => (label ? `${label}: ${note}` : note))
        )
      }
    }
    merged.captures.push(
      ...references.filter((reference) => reference.key === key)
    )
    if (!merged.captures.some((capture) => capture.variant === VARIANTS.now)) {
      merged.notes.push(
        'No picture of your working copy: no example reached this page. See the notes at the top.'
      )
    }
    return merged
  })

const optionsSummary = (options, wanted) => ({
  pages: options.pages.mode === 'list' ? wanted.join(',') : options.pages.mode,
  before: options.before,
  beforeCommit: options.beforeCommit ?? null,
  errors: options.errors,
  mobile: options.mobile,
  video: options.video,
  eachExample: options.eachExample ?? false,
  examples: options.examples ?? true,
  urls: options.urls ?? [],
  compare: options.compare,
  references: options.references
})

const startBefore = async (context) => {
  const { root, options, folder, afterPort, notes } = context
  const setId = options.set
  const ref = options.beforeCommit ?? 'HEAD'
  const sha = revParse(ref, { root })
  if (!sha) {
    notes.push(
      ref === 'HEAD'
        ? 'There is no saved version (commit) yet, so there are no before pictures.'
        : `There is no saved version called "${ref}", so there are no before pictures. Use a commit id from git log, or HEAD~1 for the one before your last save.`
    )
    return null
  }
  const baseDir = await prepareBaseTree(root, sha)
  if (!existsSync(setDir(setId, { root: baseDir }))) {
    notes.push(
      `${setId} is not in the saved version ${ref}, so there are no before pictures. Save (commit) it once, then --before compares against that.`
    )
    return null
  }
  const port = await findFreePort(afterPort + 1)
  const server = await startShowServer({
    cwd: baseDir,
    port,
    logFile: path.join(folder, 'server-before.log'),
    examples: options.examples
  })
  return { ...server, baseDir }
}

const captureAll = async (context) => {
  const { root, options, planned, folder, current, before, notes } = context
  const browser = await chromium.launch()
  try {
    const shared = { outDir: folder, options, addresses: planned.addresses }
    const runs = [
      {
        run: await captureSet(browser, {
          ...shared,
          baseUrl: current.url,
          setBase: `/${options.set}`,
          scenarios: planned.scenarios,
          plan: planned.plan,
          variant: VARIANTS.now
        }),
        label: null
      }
    ]
    if (before) {
      const other = await planFor(
        options.set,
        planned.wanted,
        before.baseDir,
        options,
        planned.addresses
      )
      runs.push({
        run: await captureSet(browser, {
          ...shared,
          baseUrl: before.url,
          setBase: `/${options.set}`,
          scenarios: other.scenarios,
          plan: other.plan,
          variant: VARIANTS.before
        }),
        label: 'Before'
      })
    }
    if (options.compare) {
      const other = await planFor(
        options.compare,
        planned.wanted,
        root,
        options,
        planned.addresses
      )
      if (other.missing.length > 0) {
        notes.push(
          `${options.compare} has no page called ${other.missing.join(', ')}, so those have nothing beside them.`
        )
      }
      runs.push({
        run: await captureSet(browser, {
          ...shared,
          baseUrl: current.url,
          setBase: `/${options.compare}`,
          scenarios: other.scenarios,
          plan: other.plan,
          variant: VARIANTS.compare
        }),
        label: `In ${options.compare}`
      })
    }
    return runs
  } finally {
    await browser.close()
  }
}

const recordVideo = async (context) => {
  const { options, planned, folder, current, notes } = context
  const fullPlan = planWalk({
    pages: planned.pages,
    scenarios: planned.scenarios,
    wanted: knownKeys(planned.pages, planned.scenarios)
  })
  const recorded = await recordWalkthrough(chromium, {
    baseUrl: current.url,
    setBase: `/${options.set}`,
    scenarios: planned.scenarios,
    plan: fullPlan,
    outDir: folder
  })
  rmSync(path.join(folder, '.video'), { recursive: true, force: true })
  notes.push(...recorded.notes.map((note) => `Walkthrough: ${note}`))
  return recorded.file
}

const writeGallery = (root, folder, manifest) => {
  writeFileSync(
    path.join(folder, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`
  )
  writeFileSync(
    path.join(folder, 'axe.json'),
    `${JSON.stringify(axeReport(manifest), null, 2)}\n`
  )
  writeFileSync(path.join(folder, 'index.html'), renderGallery(manifest))
  const css = path.join(root, GOVUK_CSS_SOURCE)
  if (existsSync(css)) {
    copyFileSync(css, path.join(folder, GOVUK_STYLESHEET))
  }
}

const statusSnapshot = (root) =>
  (orNull(() => changedAndUntrackedPaths({ root })) ?? []).sort().join('\n')

/**
 * Runs designer:show.
 *
 * @param {object} options - from parseShowArgs.
 * @param {object} [settings] - `{ root, say }`; `say` prints progress.
 * @returns {Promise<{ folder: string|null, manifest: object|null, message: string|null }>}
 */
export const runShow = async (
  options,
  { root = REPO_ROOT, say = () => {} } = {}
) => {
  const planned = await planShow(options, { root })
  if (
    planned.wanted.length === 0 &&
    planned.addresses.length === 0 &&
    !options.video
  ) {
    return {
      folder: null,
      manifest: null,
      message: `None of your changes show on a page in ${options.set}, so there is nothing new to show. Try --pages all, or name the pages, for example --pages arrival-details.`
    }
  }
  const statusBefore = statusSnapshot(root)
  const createdAt = new Date()
  const setFolder = path.join(root, DESIGNER_CACHE, 'show', options.set)
  const runName = runFolderName(createdAt)
  const folder = path.join(setFolder, runName)
  mkdirSync(folder, { recursive: true })
  const notes = []

  if (needsClientBuild(root)) {
    say(
      'Building the prototype styles and scripts first. This can take a minute.'
    )
    await buildClientAssets(root, path.join(folder, 'build.log'))
  }

  const stops = []
  let runs
  let video = null
  try {
    const port = await findFreePort()
    say(
      `Starting a private copy of the prototype on port ${port}. Yours on 3103 is not touched.`
    )
    const current = await startShowServer({
      cwd: root,
      port,
      logFile: path.join(folder, 'server.log'),
      examples: options.examples
    })
    stops.push(current.stop)
    const before = options.before
      ? await startBefore({ root, options, folder, afterPort: port, notes })
      : null
    if (before) {
      stops.push(before.stop)
    }
    const context = { root, options, planned, folder, current, before, notes }
    say(
      `Taking pictures of ${planned.wanted.length + planned.addresses.length} page(s) in ${options.set}.`
    )
    runs = await captureAll(context)
    if (options.video) {
      say('Recording the walkthrough. This takes a minute or two.')
      video = await recordVideo(context)
    }
  } finally {
    for (const stop of stops.reverse()) {
      await stop()
    }
  }

  for (const { run, label } of runs) {
    notes.push(...run.notes.map((note) => (label ? `${label}: ${note}` : note)))
  }
  const filesNote = missingFilesNote(
    new Set(runs.flatMap(({ run }) => [...run.missingFiles]))
  )
  if (filesNote) {
    notes.push(filesNote)
  }
  const manifest = buildManifest({
    set: options.set,
    compare: options.compare,
    createdAt: createdAt.toISOString(),
    commit: orNull(() => revParse('HEAD', { root })),
    branch: orNull(() => currentBranch({ root })),
    localUrl: `${DESIGNER_PORT_URL}/${options.set}`,
    options: optionsSummary(options, planned.wanted),
    pages: mergeResults(
      galleryKeys(planned.wanted, runs, planned.addresses),
      runs,
      copyReferences(planned.references, folder)
    ),
    unreached: planned.plan.unreached,
    neverReached: planned.plan.neverReached,
    changedFiles: planned.changedFiles,
    notes,
    video
  })
  if (statusSnapshot(root) !== statusBefore) {
    manifest.notes.push(
      'The list of changed files moved while the pictures were being taken: something else changed files at the same time.'
    )
  }
  writeGallery(root, folder, manifest)
  pointLatest(setFolder, runName)
  return { folder, manifest, message: null }
}

/** How many pictures of the working copy a manifest holds. */
export const countPictures = (manifest) =>
  allCaptures(manifest).filter(
    (capture) => capture.variant !== VARIANTS.reference
  ).length
