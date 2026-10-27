/**
 * Keeps a design release's own patterns out of the hand-off patch. A
 * release pattern travels to the real team as a request with its evidence,
 * never as code: its `app-<release>-` classes and its release layout stay in
 * the prototype. Pure functions over strings.
 */
import { fieldOf, hasFreshMandate } from '../lib/release-records.js'

const escaped = (text) =>
  text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)

const idsPattern = (releaseIds) =>
  [...new Set(releaseIds)].filter(Boolean).map(escaped).join('|')

const releaseLayoutExtends = (releaseIds) =>
  new RegExp(
    String.raw`({%-?\s*extends\s+)(["'])(?:${idsPattern(releaseIds)})/layout\.njk\2`,
    'g'
  )

const releaseClass = (releaseIds) =>
  new RegExp(
    String.raw`(?<![\w-])app-(?:${idsPattern(releaseIds)})-[a-z0-9_-]*`,
    'g'
  )

/**
 * A template's text with every `{% extends "<release>/layout.njk" %}` for
 * the given releases turned back into `shared/layout.njk`.
 */
export const withSharedLayout = (text, releaseIds) =>
  text.replace(
    releaseLayoutExtends(releaseIds),
    (_match, opening, quote) => `${opening}${quote}shared/layout.njk${quote}`
  )

/** Every `app-<release>-` class the text names, for the given releases. */
export const releaseClassesIn = (text, releaseIds) => [
  ...new Set(text.match(releaseClass(releaseIds)) ?? [])
]

/**
 * Every line the patch adds that still carries release code: an
 * `app-<release>-` class or a release layout.
 *
 * @param {string} patch - a unified diff.
 * @param {string[]} releaseIds - the releases whose code must not travel.
 * @returns {string[]} the added lines, without their leading `+`.
 */
export const releaseCodeAddedBy = (patch, releaseIds) => {
  const layout = new RegExp(
    String.raw`["'](?:${idsPattern(releaseIds)})/layout\.njk["']`
  )
  return patch
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1))
    .filter(
      (line) =>
        releaseClassesIn(line, releaseIds).length > 0 || layout.test(line)
    )
}

const isClosed = (entry) => /^closed\b/i.test(fieldOf(entry, 'Status'))

/**
 * What the designer must settle in `patterns.md` before a hand-off: every
 * `Option` they have not chosen yet, and every copied pattern with no
 * mandate recorded in this release.
 *
 * @param {Array<object>} patterns - the release's patterns.md entries.
 * @param {Array<object>} mandates - the release's mandates.md entries.
 * @returns {string[]} one plain sentence per entry.
 */
export const unsettledPatterns = (patterns, mandates) =>
  patterns
    .filter((entry) => !isClosed(entry))
    .flatMap((entry) => {
      if (fieldOf(entry, 'Status') === 'Option') {
        return [
          `"${entry.name}" is still an Option. Choose it (make it Open) or drop it (close it) first.`
        ]
      }
      if (
        fieldOf(entry, 'Copied from') !== '' &&
        !hasFreshMandate(entry, mandates)
      ) {
        return [
          `"${entry.name}" was copied from ${fieldOf(entry, 'Copied from')}. Confirm you still want it: record a mandate in this release and add it as a second "Asked by" line.`
        ]
      }
      return []
    })
