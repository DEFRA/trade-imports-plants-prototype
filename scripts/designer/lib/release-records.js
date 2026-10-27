/**
 * Reads a design release's `patterns.md` and `mandates.md`. Both are one
 * `## <name>` section per entry, each holding `- Field: value` lines. A
 * field may repeat (a copied pattern has two `Asked by` lines), and an
 * indented `- ` line under a field adds an item to that field's list (the
 * `Why not GOV.UK or MoJ` lines).
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

export const PATTERNS_FILE = 'patterns.md'
export const MANDATES_FILE = 'mandates.md'
export const ASSETS_DIR = 'assets'
export const RELEASE_LAYOUT = 'layout.njk'

const startEntry = (name, line) => ({
  name,
  line,
  fields: {},
  lists: {},
  text: []
})

const addField = (entry, name, value) => {
  entry.fields[name] = [...(entry.fields[name] ?? []), value]
  entry.lists[name] ??= []
}

/**
 * Every entry in a patterns.md or mandates.md text, in order.
 *
 * @param {string} markdown - the file's text.
 * @returns {Array<{ name: string, line: number, fields: Record<string, string[]>, lists: Record<string, string[]>, text: string[] }>}
 * `fields` holds each field's values as written, `lists` the indented items
 * under it, and `text` the entry's own lines, for comparing two versions.
 */
export const parseEntries = (markdown) => {
  const entries = []
  let entry = null
  let lastField = null
  String(markdown)
    .split('\n')
    .forEach((line, index) => {
      const heading = /^##\s+(.+?)\s*$/.exec(line)
      if (heading) {
        entry = startEntry(heading[1], index + 1)
        entries.push(entry)
        lastField = null
        return
      }
      if (!entry) {
        return
      }
      if (line.trim() !== '') {
        entry.text.push(line.trimEnd())
      }
      const item = /^\s+-\s+(.*)$/.exec(line)
      if (item && lastField) {
        entry.lists[lastField].push(item[1].trim())
        return
      }
      const field = /^-\s+([^:]+):\s*(.*)$/.exec(line)
      if (field) {
        lastField = field[1].trim()
        addField(entry, lastField, field[2].trim())
      }
    })
  return entries
}

/** The first value of a field, or '' when the entry does not have it. */
export const fieldOf = (entry, name) => entry.fields[name]?.[0] ?? ''

/** A comma-separated field's values, trimmed, with empty ones left out. */
export const listFieldOf = (entry, name) =>
  (entry.fields[name] ?? [])
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)

const readEntriesIn = (setFolder, file) => {
  const full = path.join(setFolder, file)
  return existsSync(full) ? parseEntries(readFileSync(full, 'utf8')) : []
}

/** The entries of a release's patterns.md: none when it has no file. */
export const readPatterns = (setFolder) =>
  readEntriesIn(setFolder, PATTERNS_FILE)

/** The entries of a release's mandates.md: none when it has no file. */
export const readMandates = (setFolder) =>
  readEntriesIn(setFolder, MANDATES_FILE)
