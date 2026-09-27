import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { setDir, walkFiles } from './repo.js'

const FEATURES = 'journeys/linear/features'
const FLOW_FILE = 'journeys/linear/flow/flow.js'
const CAPTIONS_FILE = 'journeys/linear/flow/section-captions/index.js'
const OTHER_FEATURE_COPY =
  /from\s+'(?:\.\.\/)+([a-z0-9-]+)\/copy\/copy\.(?:en|cy)\.js'/g

const importIfPresent = async (file) =>
  existsSync(file) ? import(pathToFileURL(file).href) : {}

const isPage = (value) =>
  value !== null &&
  typeof value === 'object' &&
  typeof value.id === 'string' &&
  typeof value.slug === 'string'

const isTestFile = (file) =>
  file.endsWith('.test.js') || file.endsWith('.spec.js')

const featureNames = (featuresDir) =>
  walkFiles(featuresDir)
    .map((file) => path.relative(featuresDir, file).split(path.sep)[0])
    .filter((name, index, all) => all.indexOf(name) === index)

const pagesOfFeatures = async (featuresDir, names) => {
  const entries = await Promise.all(
    names.map(async (name) => {
      const pageModule = await importIfPresent(
        path.join(featuresDir, name, 'page.js')
      )
      const pages = Object.values(pageModule)
        .filter(isPage)
        .map(({ id, slug }) => ({ id, slug }))
      return [name, pages]
    })
  )
  return new Map(entries)
}

/**
 * Which features show another feature's copy. Check your answers imports the
 * arrival-details copy to label its rows, for example, so a change to an
 * arrival-details label also shows on check your answers. Tests are ignored:
 * a test importing copy is not a page showing it.
 */
const copyImportsOf = (featuresDir, names) => {
  const shownOn = new Map(names.map((name) => [name, new Set()]))
  for (const file of walkFiles(featuresDir)) {
    if (!file.endsWith('.js') || isTestFile(file)) {
      continue
    }
    const importer = path.relative(featuresDir, file).split(path.sep)[0]
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(OTHER_FEATURE_COPY)) {
      const imported = match[1]
      if (imported !== importer && shownOn.has(imported)) {
        shownOn.get(imported).add(importer)
      }
    }
  }
  return new Map(
    [...shownOn].map(([name, importers]) => [name, [...importers].sort()])
  )
}

/**
 * Everything needed to say which page a copy leaf appears on, for one set.
 *
 * - `featurePages`: feature folder name to the pages it declares in `page.js`
 * - `flowOrder`: page ids in the order `flow.js` lists them
 * - `captionPages`: section caption key to the page ids that show it
 * - `shownOn`: feature to the other features that show its copy
 *
 * @param {string} root - the repo root.
 * @param {string} setId - the set.
 */
export const pageMap = async (root, setId) => {
  const base = setDir(root, setId)
  const featuresDir = path.join(base, FEATURES)
  const names = featureNames(featuresDir)
  const [featurePages, flow, captions] = await Promise.all([
    pagesOfFeatures(featuresDir, names),
    importIfPresent(path.join(base, FLOW_FILE)),
    importIfPresent(path.join(base, CAPTIONS_FILE))
  ])
  const flowOrder = (flow.sections ?? []).flatMap((section) =>
    section.pages.map((page) => page.id)
  )
  const captionPages = new Map(
    (captions.captionSections ?? []).map((section) => [
      section.id,
      section.pages.map((page) => page.id)
    ])
  )
  return {
    featurePages,
    flowOrder,
    captionPages,
    shownOn: copyImportsOf(featuresDir, names)
  }
}
