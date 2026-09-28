import { containsText } from './leaf-text.js'

const NUNJUCKS_TAG = /\{#[\s\S]*?#\}|\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/g
const QUOTED = /"([^"\n]*)"|'([^'\n]*)'/g
const HTML_TAG = /<[^>\n]*>/g

const lineAt = (source, offset) => source.slice(0, offset).split('\n').length

const literalsIn = (source, tagText, tagOffset) =>
  [...tagText.matchAll(QUOTED)].map((match) => ({
    line: lineAt(source, tagOffset + match.index),
    text: match[1] ?? match[2]
  }))

const plainTextIn = (source, text, offset) => {
  const firstLine = lineAt(source, offset)
  return text.split('\n').map((lineText, index) => ({
    line: firstLine + index,
    text: lineText.replace(HTML_TAG, ' ').replace(/\s+/g, ' ').trim()
  }))
}

/**
 * The words a Nunjucks template shows that are written into the template
 * itself rather than coming from copy: text between HTML tags, and quoted
 * strings inside `{{ }}` and `{% %}` (like a macro's `text: "Continue"`).
 * Comments `{# #}` are skipped. Each fragment carries its 1-based line.
 */
export const templateFragments = (source) => {
  const fragments = []
  let cursor = 0
  for (const match of source.matchAll(NUNJUCKS_TAG)) {
    fragments.push(
      ...plainTextIn(source, source.slice(cursor, match.index), cursor)
    )
    if (!match[0].startsWith('{#')) {
      fragments.push(...literalsIn(source, match[0], match.index))
    }
    cursor = match.index + match[0].length
  }
  fragments.push(...plainTextIn(source, source.slice(cursor), cursor))
  return fragments.filter((fragment) => fragment.text !== '')
}

/**
 * Lines of a template where the text is written in the template, not in copy.
 * One hit per line, however many fragments on it match.
 *
 * @param {string} source - the template's source.
 * @param {string} text - the words to look for.
 * @returns {{ line: number, text: string }[]}
 */
export const templateHits = (source, text) => {
  const seen = new Set()
  return templateFragments(source).filter((fragment) => {
    if (seen.has(fragment.line) || !containsText(fragment.text, text)) {
      return false
    }
    seen.add(fragment.line)
    return true
  })
}

const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g
const LINE_COMMENT = /^\s*\/\/(.*)$/
const COMMENT_MARKS = /^\s*(?:\/\*+|\*+\/?|\/\/)|\*+\/\s*$/gm
const SHOWN_LENGTH = 100

const collapse = (text) =>
  text.replace(COMMENT_MARKS, ' ').replace(/\s+/g, ' ').trim()

const shorten = (text) =>
  text.length > SHOWN_LENGTH ? `${text.slice(0, SHOWN_LENGTH - 1)}…` : text

/** Runs of whole-line `//` comments, each run read as one piece of text. */
const lineCommentRuns = (source) => {
  const runs = []
  let run = null
  source.split('\n').forEach((lineText, index) => {
    const match = LINE_COMMENT.exec(lineText)
    if (!match) {
      run = null
      return
    }
    if (run) {
      run.text += `\n${match[1]}`
    } else {
      run = { line: index + 1, text: match[1] }
      runs.push(run)
    }
  })
  return runs
}

const blockComments = (source) =>
  [...source.matchAll(BLOCK_COMMENT)].map((match) => ({
    line: lineAt(source, match.index),
    text: match[0]
  }))

/**
 * Code comments that quote the words, so a wording change can update them
 * too. A comment split over several lines (`// Consignment /` then
 * `// parties`) is read as one piece of text, so words broken across the
 * line still match. Each hit carries the comment's first line.
 *
 * @param {string} source - a copy file's source.
 * @param {string} text - the words to look for.
 * @returns {{ line: number, text: string }[]}
 */
export const commentHits = (source, text) =>
  [...lineCommentRuns(source), ...blockComments(source)]
    .map((comment) => ({ line: comment.line, text: collapse(comment.text) }))
    .filter((comment) => containsText(comment.text, text))
    .map((comment) => ({ line: comment.line, text: shorten(comment.text) }))
    .sort((a, b) => a.line - b.line)

/**
 * Lines of a test or spec that pin any of the given texts as a literal. An
 * import line never counts: it names a file, not the words on a page.
 *
 * @param {string} source - the test file's source.
 * @param {string[]} texts - the words to look for (English and Welsh).
 * @returns {{ line: number, text: string }[]}
 */
export const pinnedHits = (source, texts) =>
  source
    .split('\n')
    .map((lineText, index) => ({ line: index + 1, text: lineText.trim() }))
    .filter(
      ({ text: lineText }) =>
        !lineText.startsWith('import ') &&
        texts.some((text) => text !== '' && containsText(lineText, text))
    )
