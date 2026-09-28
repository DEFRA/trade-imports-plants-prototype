/**
 * What a hand-off means for the real team, worked out from file contents:
 * strings their tests still pin, imports of prototype-only services, Welsh
 * still to translate, and the design gaps and research-mode rules a release
 * records. Pure functions over strings.
 */

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
  /(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]*\bprototype-(services|data)\/([^/'"]+)[^'"]*)['"]/g

/**
 * Imports of the prototype's fake services and extra data. The real service
 * has neither, so a file that imports them cannot ship as it is.
 */
export const findPrototypeImports = (filePath, content) =>
  [...content.matchAll(PROTOTYPE_IMPORT)].map((match) => ({
    file: filePath,
    specifier: match[1],
    kind: match[2] === 'services' ? 'prototype-services' : 'prototype-data',
    name: match[3].replace(/\.js$/, '')
  }))

/** Every `[Welsh needed]` marker in a file, with the English after it. */
export const findWelshMarkers = (filePath, content) => {
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
