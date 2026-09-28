import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { setDir, walkFiles } from './repo.js'

const FEATURES = 'journeys/linear/features'
const FLOW_FILE = 'journeys/linear/flow/flow.js'
const CAPTIONS_FILE = 'journeys/linear/flow/section-captions/index.js'
const OTHER_FEATURE_COPY =
  /import\s*\{([^}]*)\}\s*from\s+'(?:\.\.\/)+([a-z0-9-]+)\/copy\/copy\.(?:en|cy)\.js'/g
const PROPERTY_CHAIN = /^((?:\s*\.\s*[A-Za-z_$][\w$]*)+)/

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** `copy as destinationEn, other` to `['destinationEn', 'other']`. */
const bindingsOf = (specifiers) =>
  specifiers
    .split(',')
    .map((specifier) => specifier.trim())
    .filter(Boolean)
    .map((specifier) =>
      specifier
        .split(/\s+as\s+/)
        .pop()
        .trim()
    )

/**
 * Every name that stands for the imported copy: the import binding, plus any
 * `const x = binding` or `const x = copyFor({ en: binding, … })` made from it.
 */
const aliasesOf = (source, binding) => {
  const names = new Set([binding])
  let grew = true
  while (grew) {
    grew = false
    for (const [, name, rhs] of source.matchAll(
      /const\s+([A-Za-z_$][\w$]*)\s*=\s*([^\n]*)/g
    )) {
      if (names.has(name)) {
        continue
      }
      const madeFrom = [...names].some((known) =>
        new RegExp(
          `^${escapeRegExp(known)}\\s*$|^[\\w$]+\\(\\{[^)]*\\b${escapeRegExp(known)}\\b`
        ).test(rhs.trim())
      )
      if (madeFrom) {
        names.add(name)
        grew = true
      }
    }
  }
  return names
}

/**
 * The key paths of the imported copy that a file reads, from every
 * `name.a.b` it writes (`destinationCopy.headings[state]` reads `headings`).
 * Null when the copy is also used whole (passed on, spread or indexed), so
 * every key counts.
 */
const keysReadIn = (source, binding) => {
  const names = aliasesOf(source, binding)
  const keys = new Set()
  for (const name of names) {
    const use = new RegExp(`(?<![\\w$.])${escapeRegExp(name)}(?![\\w$])`, 'g')
    for (const match of source.matchAll(use)) {
      const before = source.slice(
        source.lastIndexOf('\n', match.index) + 1,
        match.index
      )
      const after = source.slice(match.index + name.length)
      const chain = PROPERTY_CHAIN.exec(after)
      if (chain) {
        keys.add(chain[1].replace(/\s/g, '').slice(1))
        continue
      }
      const isImport = /^\s*import\b/.test(before)
      const isDeclaration = /const\s+$/.test(before)
      const madeAnAlias =
        /const\s+[A-Za-z_$][\w$]*\s*=\s*(?:[\w$]+\(\{[^)]*)?$/.test(before)
      if (!isImport && !isDeclaration && !madeAnAlias) {
        return null
      }
    }
  }
  return [...keys].sort()
}

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

const addKeys = (importers, importer, keys) => {
  const known = importers.get(importer)
  if (known === null || keys === null) {
    importers.set(importer, null)
    return
  }
  importers.set(importer, [...new Set([...(known ?? []), ...keys])].sort())
}

/**
 * Which features show another feature's copy, and which of its keys.
 * Check your answers imports the place-of-destination copy and reads only
 * `headings`, for example, so a change to a heading also shows on check your
 * answers, and a change to the search button does not. Tests are ignored: a
 * test importing copy is not a page showing it.
 *
 * @returns {Map<string, Array<{ feature: string, keys: string[] | null }>>}
 *   feature to the features that show its copy; `keys` null means all of it.
 */
const copyImportsOf = (featuresDir, names) => {
  const shownOn = new Map(names.map((name) => [name, new Map()]))
  for (const file of walkFiles(featuresDir)) {
    if (!file.endsWith('.js') || isTestFile(file)) {
      continue
    }
    const importer = path.relative(featuresDir, file).split(path.sep)[0]
    const source = readFileSync(file, 'utf8')
    for (const [, specifiers, imported] of source.matchAll(
      OTHER_FEATURE_COPY
    )) {
      if (imported === importer || !shownOn.has(imported)) {
        continue
      }
      for (const binding of bindingsOf(specifiers)) {
        addKeys(shownOn.get(imported), importer, keysReadIn(source, binding))
      }
    }
  }
  return new Map(
    [...shownOn].map(([name, importers]) => [
      name,
      [...importers]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([feature, keys]) => ({ feature, keys }))
    ])
  )
}

/** Whether a borrowing feature reads the copy leaf at `keyPath`. */
export const readsKey = (keys, keyPath) =>
  keys === null ||
  keys.some(
    (key) =>
      key === keyPath ||
      keyPath.startsWith(`${key}.`) ||
      key.startsWith(`${keyPath}.`)
  )

/**
 * Everything needed to say which page a copy leaf appears on, for one set.
 *
 * - `featurePages`: feature folder name to the pages it declares in `page.js`
 * - `flowOrder`: page ids in the order `flow.js` lists them
 * - `captionPages`: section caption key to the page ids that show it
 * - `shownOn`: feature to the other features that show its copy, each with
 *   the key paths it reads (`keys`, null for all)
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
