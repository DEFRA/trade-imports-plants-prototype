/**
 * Builds the service map for every set (or those named): a page per set at
 * `<site>/service-map/<set-id>/` with the diagram and the list view, the map
 * as data (`service-map.json`), which picture belongs to which page
 * (`screens.json`), one stylesheet (`service-map/service-map.css`) and an
 * index of every set's map (`service-map/index.html`).
 *
 *   node scripts/reports/service-map/cli.js --site <folder>
 *     [--report <json> --results <folder>] [--changed-files <file>]
 *     [--sets a,b]
 *
 * The pictures come from the walkthrough report when there is one; without
 * it every page gets a "No picture yet" card and the map is still built.
 * Pictures are published the way the demo page publishes them (`media.js`),
 * so a picture the technical report already holds is not copied twice.
 *
 * A set whose map cannot be built gets a page saying so, and the others are
 * built as usual. Reads SHA from the environment for the footer only; the
 * JSON never carries it.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { NodePackageImporter, compile } from 'sass'

import { pagesForChangedPaths } from '../../designer/lib/flow.js'
import { revParse } from '../../designer/lib/git.js'
import { REPO_ROOT } from '../../designer/lib/repo.js'
import { listSets } from '../../designer/lib/sets.js'
import { changedSetIdsFrom } from '../demo/cli.js'
import { publishMedia } from '../demo/media.js'
import { buildGraph, serialiseGraph } from './graph.js'
import { ServiceMapProblem } from './install-set.js'
import {
  renderIndexPage,
  renderMapPage,
  renderProblemPage,
  tagOf
} from './render.js'
import { picturesOf, publishScreens, screensFor } from './screens.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SCSS = path.join(HERE, 'service-map.scss')
export const MAPS_FOLDER = 'service-map'

/** Where a set's map is, relative to the site root. */
export const mapPath = (setId) => `${MAPS_FOLDER}/${setId}/`

const readJson = (file) => {
  try {
    return file ? JSON.parse(readFileSync(file, 'utf8')) : null
  } catch {
    return null
  }
}

const readLines = (file) => {
  try {
    return readFileSync(file, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

const compileCss = () =>
  compile(SCSS, {
    importers: [new NodePackageImporter()],
    style: 'compressed',
    quietDeps: true
  }).css

const shortSha = (sha) => (sha ? String(sha).slice(0, 7) : '')

const serialiseScreens = (screens) => `${JSON.stringify(screens, null, 2)}\n`

/** A picture published onto the site, addressed from a map page. */
const publisherFor = (siteDir) => (file) => {
  try {
    return `../../${publishMedia(file, siteDir).url}`
  } catch {
    return null
  }
}

/**
 * Builds the maps into `siteDir`.
 *
 * @param {object} options
 * @param {string} [options.root]
 * @param {string[]|null} [options.setIds] - the sets to map; every set when
 *   null.
 * @param {string|null} [options.reportFile] - the walkthrough JSON report.
 * @param {string} [options.resultsDir] - where its attachments are now.
 * @param {string} options.siteDir
 * @param {string|null} [options.changedFilesFile]
 * @param {Record<string, string>} [options.env]
 * @returns {Promise<{ built: string[], failed: Array<{ setId: string,
 *   message: string }>, lines: string[] }>}
 */
export const buildServiceMaps = async ({
  root = REPO_ROOT,
  setIds = null,
  reportFile = null,
  resultsDir = '',
  siteDir,
  changedFilesFile = null,
  env = process.env
}) => {
  const mapsDir = path.join(siteDir, MAPS_FOLDER)
  await mkdir(mapsDir, { recursive: true })
  writeFileSync(path.join(mapsDir, 'service-map.css'), compileCss())

  const sha = shortSha(env.SHA || revParse('HEAD', { root }) || '')
  const report = readJson(reportFile)
  const changedFiles = changedFilesFile ? readLines(changedFilesFile) : []
  const changedSets = changedSetIdsFrom(changedFiles.join('\n'), { root })
  const changedPages = changedFiles.length
    ? await pagesForChangedPaths(changedFiles, { root })
    : []
  const publish = publisherFor(siteDir)

  const built = []
  const failed = []
  const index = []
  for (const setId of setIds ?? listSets({ root })) {
    const folder = path.join(mapsDir, setId)
    await mkdir(folder, { recursive: true })
    try {
      const graph = await buildGraph(setId, { root })
      const screens = publishScreens(
        screensFor(graph.pages, picturesOf(report, { setId, resultsDir })),
        publish
      )
      const changed = changedSets.includes(setId)
      writeFileSync(
        path.join(folder, 'service-map.json'),
        serialiseGraph(graph)
      )
      writeFileSync(
        path.join(folder, 'screens.json'),
        serialiseScreens(screens)
      )
      writeFileSync(
        path.join(folder, 'index.html'),
        renderMapPage({
          graph,
          screens,
          changed,
          changedPages: changedPages
            .filter((page) => page.setId === setId)
            .map((page) => page.id),
          sha
        })
      )
      built.push(setId)
      index.push({
        id: setId,
        title: graph.set.title,
        tag: tagOf(graph.set, { changed }),
        problem: null
      })
    } catch (error) {
      const message =
        error instanceof ServiceMapProblem
          ? error.message
          : `the journey could not be read (${String(error?.message ?? error).split('\n')[0]}).`
      failed.push({ setId, message })
      writeFileSync(
        path.join(folder, 'index.html'),
        renderProblemPage({ setId, message, sha })
      )
      index.push({
        id: setId,
        title: setId,
        tag: 'Could not be drawn',
        problem: message
      })
    }
  }
  writeFileSync(
    path.join(mapsDir, 'index.html'),
    renderIndexPage({ maps: index, sha })
  )
  return {
    built,
    failed,
    lines: [
      `Service maps: ${built.length} built${failed.length ? `, ${failed.length} could not be drawn` : ''}.`,
      ...failed.map(({ setId, message }) => `${setId}: ${message}`)
    ]
  }
}

const readArg = (argv, flag) => {
  const index = argv.indexOf(flag)
  return index === -1 ? null : (argv[index + 1] ?? null)
}

export const USAGE =
  'Usage: node scripts/reports/service-map/cli.js --site <folder> [--report <json> --results <folder>] [--changed-files <file>] [--sets a,b]'

/**
 * Reads the command line. `--site` is required.
 *
 * @param {string[]} argv
 * @throws {ServiceMapProblem}
 */
export const parseArgs = (argv) => {
  const site = readArg(argv, '--site')
  if (!site) {
    throw new ServiceMapProblem(
      `Missing --site <folder> (where to write the maps).\n${USAGE}`
    )
  }
  const sets = readArg(argv, '--sets')
  return {
    siteDir: site,
    reportFile: readArg(argv, '--report'),
    resultsDir: readArg(argv, '--results') ?? '',
    changedFilesFile: readArg(argv, '--changed-files'),
    setIds: sets
      ? sets
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : null
  }
}

/** GitHub Actions warning lines for the sets that could not be drawn. */
export const githubWarnings = (failed) =>
  failed.map(
    ({ setId, message }) =>
      `::warning title=Service map::${setId}: ${message.replaceAll('\n', ' ')}`
  )

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2))
    const result = await buildServiceMaps(options)
    process.stdout.write(`${result.lines.join('\n')}\n`)
    if (process.env.GITHUB_ACTIONS) {
      process.stdout.write(
        githubWarnings(result.failed)
          .map((line) => `${line}\n`)
          .join('')
      )
    }
  } catch (error) {
    if (error instanceof ServiceMapProblem) {
      process.stderr.write(`${error.message}\n`)
      process.exitCode = 1
    } else {
      throw error
    }
  }
}
