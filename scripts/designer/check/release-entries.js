/**
 * The checks on a design release's patterns.md and mandates.md: every entry
 * complete for its kind, every custom pattern naming the GOV.UK and MoJ
 * components it was checked against, every quote tracing to a recorded
 * mandate, and no recorded mandate changed.
 */
import {
  fieldOf,
  MANDATES_FILE,
  parseEntries,
  PATTERNS_FILE
} from '../lib/release-records.js'

const normalised = (text) => text.replaceAll(/\s+/g, ' ').trim()

const problem = (file, message) => ({ file, message })

const missingFields = (entry) => {
  const fieldsByKind = {
    Custom: [
      'Pages',
      'Classes',
      'Files',
      'Why not GOV.UK or MoJ',
      'Need or hypothesis',
      'Research round',
      'Findings',
      'Asked by',
      'Status'
    ],
    'Switch on': ['Components', 'Pages', 'Files', 'Asked by', 'Status']
  }
  const required = fieldsByKind[fieldOf(entry, 'Kind')]
  if (!required) {
    return [
      `"${entry.name}" needs a Kind line: "- Kind: Switch on" or "- Kind: Custom".`
    ]
  }
  return required
    .filter(
      (field) =>
        fieldOf(entry, field) === '' && (entry.lists[field] ?? []).length === 0
    )
    .map((field) => `Add a "${field}" line to "${entry.name}".`)
}

const statusProblems = (entry) => {
  const status = fieldOf(entry, 'Status')
  return status === '' || /^(?:Option|Open|Closed: \S.*)$/.test(status)
    ? []
    : [
        `"${entry.name}" has the status "${status}". Use Option, Open, or "Closed: " and how it closed.`
      ]
}

const rungLine = (entry, library) =>
  (entry.lists['Why not GOV.UK or MoJ'] ?? []).find((item) =>
    item.startsWith(`${library}:`)
  )

const rungProblems = (entry) => {
  if (fieldOf(entry, 'Kind') !== 'Custom') {
    return []
  }
  const emptyRung = /^(?:none|n\/a|-|tbc)?\.?$/i
  const unnamed = ['GOV.UK', 'MoJ'].filter((library) => {
    const line = rungLine(entry, library)
    return !line || emptyRung.test(line.slice(library.length + 1).trim())
  })
  return unnamed.length === 0
    ? []
    : [
        `"${entry.name}" does not say which ${unnamed.join(' and which ')} component was checked. Say which GOV.UK and which MoJ component you checked, and why each did not fit, as "  - GOV.UK: …" and "  - MoJ: …" lines under "Why not GOV.UK or MoJ".`
      ]
}

const quoteProblems = (entry, mandates) => {
  const tracedStatuses = new Set(['Open', 'Option'])
  if (
    !tracedStatuses.has(fieldOf(entry, 'Status')) ||
    fieldOf(entry, 'Copied from') !== ''
  ) {
    return []
  }
  const wordsById = new Map(
    mandates.map((mandate) => [mandate.name, fieldOf(mandate, 'Words')])
  )
  const traces = (askedBy) => {
    const quoted = /^["“](.+)["”]\s*\(([^)]+)\)$/.exec(askedBy)
    const words = quoted ? (wordsById.get(quoted[2]) ?? '') : ''
    return words !== '' && normalised(words).includes(normalised(quoted[1]))
  }
  return (entry.fields['Asked by'] ?? [])
    .filter((askedBy) => askedBy !== '' && !traces(askedBy))
    .map(
      (askedBy) =>
        `"${entry.name}" is asked for by ${askedBy}, which is not word for word in a mandate in ${MANDATES_FILE}. Asked by must quote a recorded mandate, then its id in brackets. Ask the designer, then run designer:mandate record.`
    )
}

/**
 * @param {Array<object>} patterns - the release's patterns.md entries.
 * @param {Array<object>} mandates - the release's mandates.md entries.
 * @param {{ setRepoDir: string }} options - the release's folder, repo-relative.
 * @returns {Array<{ file: string, message: string }>}
 */
export const patternEntryProblems = (patterns, mandates, { setRepoDir }) => {
  const file = `${setRepoDir}/${PATTERNS_FILE}`
  return patterns.flatMap((entry) =>
    [
      ...missingFields(entry),
      ...statusProblems(entry),
      ...rungProblems(entry),
      ...quoteProblems(entry, mandates)
    ].map((message) => problem(file, message))
  )
}

/**
 * Every mandate the earlier version of mandates.md held that is now missing
 * or changed.
 *
 * @param {string|null} earlier - mandates.md at the commit compared with,
 * or null when it did not exist then.
 * @param {Array<object>} mandates - the entries now.
 * @param {{ setRepoDir: string }} options - the release's folder, repo-relative.
 * @returns {Array<{ file: string, message: string }>}
 */
export const mandateHistoryProblems = (earlier, mandates, { setRepoDir }) => {
  if (earlier === null) {
    return []
  }
  const now = new Map(
    mandates.map((mandate) => [mandate.name, mandate.text.join('\n')])
  )
  return parseEntries(earlier)
    .filter((mandate) => now.get(mandate.name) !== mandate.text.join('\n'))
    .map((mandate) =>
      problem(
        `${setRepoDir}/${MANDATES_FILE}`,
        `The mandate ${mandate.name} was changed or removed. ${MANDATES_FILE} only gains entries. Put the old entry back.`
      )
    )
}
