/**
 * What a hand-off means for the real team, worked out from file contents:
 * strings their tests still pin, imports of prototype-only services, Welsh
 * still to translate, and the design gaps and research-mode rules a release
 * records. Pure functions over strings.
 */
import path from 'node:path'

import { copyLeaves } from './copy-table.js'

export const WELSH_MARKER = '[Welsh needed]'

const MIN_PINNED_LENGTH = 4
const QUOTED = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`([^`$\\\n]*)`/g
const NUNJUCKS_TAG = /\{[{%#][\s\S]*?[}%#]\}/g
const HTML_TAG = /<[^>]*>/g

const hasLetters = (text) => /[a-z]/i.test(text)

const unescape = (text) => text.replace(/\\(.)/g, '$1')

/**
 * The visible strings in a piece of source: quoted literals in JavaScript,
 * and text between tags in a Nunjucks template. Short or letter-free
 * fragments are dropped: they are noise in a search of the tests.
 */
export const literalsIn = (source, { template = false } = {}) => {
  const found = new Set()
  for (const match of source.matchAll(QUOTED)) {
    const text = unescape(match[1] ?? match[2] ?? match[3] ?? '')
    if (text.length >= MIN_PINNED_LENGTH && hasLetters(text)) {
      found.add(text)
    }
  }
  if (template) {
    const bare = source.replace(NUNJUCKS_TAG, '\n').replace(HTML_TAG, '\n')
    for (const line of bare.split('\n')) {
      const text = line.trim()
      if (text.length >= MIN_PINNED_LENGTH && hasLetters(text)) {
        found.add(text)
      }
    }
  }
  return found
}

/** Strings present in `before` and gone from `after`. */
export const removedLiterals = (before, after, options) => {
  const kept = literalsIn(after ?? '', options)
  return [...literalsIn(before ?? '', options)].filter(
    (text) => !kept.has(text)
  )
}

/**
 * Every place a test or browser spec still pins one of `oldStrings`, once per
 * line: when several old strings sit on one line (a whole sentence and a
 * piece of it), the longest is kept. `testFiles` maps a repo-relative path to
 * its content.
 */
export const findPinnedStrings = (oldStrings, testFiles) => {
  const byPlace = new Map()
  for (const [file, content] of Object.entries(testFiles)) {
    const fileLines = content.split('\n')
    for (const text of oldStrings) {
      fileLines.forEach((line, index) => {
        const place = `${file}:${index + 1}`
        const kept = byPlace.get(place)
        if (line.includes(text) && (!kept || text.length > kept.text.length)) {
          byPlace.set(place, { text, file, line: index + 1 })
        }
      })
    }
  }
  return [...byPlace.values()]
}

const TEST_FILE = /(\.test\.js|\.fit\.spec\.js)$|(^|\/)fit\//

/** True for a unit test, a browser spec, or a file in a `fit/` folder. */
export const isTestFile = (filePath) => TEST_FILE.test(filePath)

const PROTOTYPE_IMPORT =
  /(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]*\bprototype-(data|support)\/([^/'"]+)[^'"]*)['"]/g

/**
 * Imports of the prototype's extra data (`src/server/prototype-data/`) and its
 * stub plumbing (`src/server/prototype-support/`). The real service has
 * neither, so a file that imports them cannot ship as it is.
 */
export const findPrototypeImports = (filePath, content) =>
  [...content.matchAll(PROTOTYPE_IMPORT)].map((match) => ({
    file: filePath,
    specifier: match[1],
    kind: `prototype-${match[2]}`,
    name: match[3].replace(/\.js$/, '')
  }))

const RELATIVE_IMPORT =
  /(?:from\s+|import\s*\(\s*|import\s+)['"](\.{1,2}\/[^'"]+)['"]/g

export const SERVICES_DIR = 'src/server/app/services'

const OWNED_SERVICE_GLOB = /^src\/server\/app\/services\/([^/*]+)\/\*\*$/

/**
 * The prototype-owned services: each folder under `src/server/app/services/`
 * that `overrides.json` lists on its own line in `ours`, as
 * `src/server/app/services/<name>/**`. Every other services folder belongs to
 * the real service.
 *
 * @param {{ ours?: string[] } | null} overrides - overrides.json as data.
 * @returns {Set<string>} the service folder names.
 */
export const ownedServicesFrom = (overrides) =>
  new Set(
    (overrides?.ours ?? [])
      .map((glob) => OWNED_SERVICE_GLOB.exec(glob)?.[1])
      .filter(Boolean)
  )

/**
 * The repo-relative paths a file imports with a relative specifier
 * (`../transporter-add/controller.js`), resolved against the file's own
 * folder.
 */
export const relativeImportsOf = (filePath, content) =>
  [...content.matchAll(RELATIVE_IMPORT)].map((match) =>
    path.posix.normalize(
      path.posix.join(path.posix.dirname(filePath), match[1])
    )
  )

const SERVICE_PATH = /^src\/server\/app\/services\/([^/]+)\//

/**
 * Imports of a prototype-owned service (kind `prototype-service`): a relative
 * import that resolves into `src/server/app/services/<name>/`, where `<name>`
 * is in `owned`. Real services (countries, ports, address-book) are not
 * listed. The page travels in the patch with the service's proposed files.
 *
 * @param {string} filePath - the importing file, repo-relative.
 * @param {string} content - its source.
 * @param {Set<string>} owned - from `ownedServicesFrom`.
 * @returns {{ file: string, kind: 'prototype-service', name: string, dir: string, imports: string }[]}
 */
export const findPrototypeServiceImports = (filePath, content, owned) =>
  relativeImportsOf(filePath, content)
    .map((resolved) => ({ resolved, name: SERVICE_PATH.exec(resolved)?.[1] }))
    .filter(({ name }) => name && owned.has(name))
    .map(({ resolved, name }) => ({
      file: filePath,
      kind: 'prototype-service',
      name,
      dir: `${SERVICES_DIR}/${name}`,
      imports: resolved
    }))

const WORDS_TO_PLACE = 20

const lineOfText = (lines, text) => {
  const at = lines.findIndex((line) => line.includes(text))
  return at === -1 ? 0 : at + 1
}

const markersByLine = (filePath, content) => {
  const markers = []
  content.split('\n').forEach((line, index) => {
    const at = line.indexOf(WELSH_MARKER)
    if (at !== -1) {
      const english = line
        .slice(at + WELSH_MARKER.length)
        .replace(/['"`],?\s*$/, '')
        .trim()
      markers.push({ file: filePath, line: index + 1, english })
    }
  })
  return markers
}

/**
 * Every `[Welsh needed]` marker in a copy file, with the English after it.
 * The file is read as data, so a string inside a nested object, or one split
 * over two lines by the formatter, gives its words and never a piece of code.
 * A file that cannot be read as data falls back to reading line by line.
 */
export const findWelshMarkers = (filePath, content) => {
  const leaves = copyLeaves(content)
  if (!leaves) {
    return markersByLine(filePath, content)
  }
  const lines = content.split('\n')
  return Object.entries(leaves)
    .filter(
      ([, value]) => typeof value === 'string' && value.includes(WELSH_MARKER)
    )
    .map(([key, value]) => {
      const english = value
        .replace(WELSH_MARKER, '')
        .replace(/\s+/g, ' ')
        .trim()
      const lastKey = key
        .split('.')
        .at(-1)
        .replace(/\[\d+\]$/, '')
      const line =
        lineOfText(
          lines,
          `${WELSH_MARKER} ${english.slice(0, WORDS_TO_PLACE)}`
        ) || lineOfText(lines, lastKey)
      return { file: filePath, key, line, english }
    })
}

const tableCells = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())

const isSeparatorRow = (cells) => cells.every((cell) => /^:?-+:?$/.test(cell))

const listItems = (markdown) =>
  markdown
    .split('\n')
    .map((line) => /^\s*[-*]\s+(.+)$/.exec(line)?.[1]?.trim())
    .filter(Boolean)

/**
 * The rows of the first Markdown table in a release's `design-gaps.md`, as
 * objects keyed by the header cells in lower case. List items (`- ...`) are
 * accepted too, as `{ gap }`, for a file written as a list.
 */
export const parseDesignGaps = (markdown) => {
  if (!markdown) {
    return []
  }
  const tableLines = markdown
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
  if (tableLines.length >= 2) {
    const header = tableCells(tableLines[0]).map((cell) => cell.toLowerCase())
    return tableLines
      .slice(1)
      .map(tableCells)
      .filter((cells) => !isSeparatorRow(cells))
      .map((cells) =>
        Object.fromEntries(
          header.map((name, index) => [name, cells[index] ?? ''])
        )
      )
  }
  return listItems(markdown).map((gap) => ({ gap }))
}

const REMOVAL_TRIGGER = /\b(removed|unused|no longer used)\b/i
const SERVICE_TOKEN_BEFORE = /([a-z][a-z/-]*)\s+services?\b/gi

/**
 * The service-name vocabulary a hand-off checks a new service against:
 * every hyphenated or slashed token that sits immediately before "service"
 * or "services" in a sentence that also says a service was removed or is no
 * longer used. Read from the real journey's or the platform's services
 * docs, and from the journey spec's own removal record — a hand-off checks
 * all three (`rulingConflictsFor` in `build.js`).
 *
 * @param {string|null} text - a services doc or the journey spec, as text.
 * @returns {string[]} lower-case vocabulary words, deduplicated.
 */
export const removalVocabularyFrom = (text) => {
  if (!text) {
    return []
  }
  const words = new Set()
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (!REMOVAL_TRIGGER.test(sentence)) {
      continue
    }
    for (const match of sentence.matchAll(SERVICE_TOKEN_BEFORE)) {
      words.add(match[1].toLowerCase())
    }
  }
  return [...words]
}

const singular = (word) => word.replace(/s$/, '')

/**
 * Whether a service name matches one of the removed-service vocabulary
 * words, loosely: the same word once trailing plurals are dropped, or one
 * contains the other — so "transporters" matches a removal recorded for
 * "transporter" or for "commercial-transporters".
 *
 * @param {string} serviceName
 * @param {string[]} vocabulary - from `removalVocabularyFrom`.
 * @returns {string|undefined} the vocabulary word it matched, or undefined.
 */
export const matchingRemovedVocabulary = (serviceName, vocabulary) => {
  const name = singular(serviceName.toLowerCase())
  return vocabulary.find((word) => {
    const term = singular(word.toLowerCase())
    return name === term || name.includes(term) || term.includes(name)
  })
}

/**
 * The rules a research release relaxed, from its `research-mode.md`: every
 * list item or table row, as plain text.
 */
export const parseResearchRules = (markdown) => {
  if (!markdown) {
    return []
  }
  const rows = parseDesignGaps(markdown)
  return rows.map(
    (row) =>
      row.gap ??
      Object.values(row)
        .filter((cell) => cell !== '')
        .join(': ')
  )
}
