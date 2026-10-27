/**
 * The checks on a design release's patterns.md and mandates.md: every entry
 * complete for its kind, every custom pattern naming the GOV.UK and MoJ
 * components it was checked against, every quote tracing to a recorded
 * mandate, and no recorded mandate changed.
 */
import {
  askedByOf,
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

const comparable = (text) =>
  normalised(text.replaceAll(/[‘’]/g, "'")).replace(/[.!?;,]+$/, '')

const quotesWhole = (quote, words) => {
  const sentences = normalised(words)
    .split(/(?<=[.!?;])\s+/)
    .map(comparable)
  const quoted = comparable(quote)
  return (
    quoted !== '' &&
    (quoted === comparable(words) || sentences.includes(quoted))
  )
}

const quoteProblems = (entry, mandates) => {
  const wordsById = new Map(
    mandates.map((mandate) => [mandate.name, fieldOf(mandate, 'Words')])
  )
  return askedByOf(entry)
    .filter(({ quote, id }) => !quotesWhole(quote, wordsById.get(id) ?? ''))
    .map(
      ({ line }) =>
        `"${entry.name}" is asked for by ${line}, which is not a whole mandate, or a whole sentence of one, recorded in ${MANDATES_FILE}. Asked by must quote a recorded mandate, then its id in brackets. Ask the designer, then run designer:mandate record.`
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

const newMandateProblems = (earlierMandates, mandates, mandateId) => {
  const earlierIds = new Set(earlierMandates.map((mandate) => mandate.name))
  return mandates
    .filter((mandate) => !earlierIds.has(mandate.name))
    .map(
      (mandate) =>
        `It adds the mandate ${mandate.name}. A run under the designer's mandate ${mandateId} cannot record one: only the designer's own session can. Take ${mandate.name} out.`
    )
}

const patternUnderMandateProblems = (entry, earlier, mandateId) => {
  const earlierLines = new Set(earlier?.fields['Asked by'] ?? [])
  const askedBy = askedByOf(entry)
  const found = askedBy
    .filter(({ line, id }) => !earlierLines.has(line) && id !== mandateId)
    .map(
      ({ line }) =>
        `"${entry.name}" is asked for by ${line}. This run works under the designer's mandate ${mandateId}, so cite only that one.`
    )
  if (!askedBy.some(({ id }) => id === mandateId)) {
    found.push(
      `"${entry.name}" changed but does not cite the designer's mandate ${mandateId}. Add an "Asked by" line quoting it.`
    )
  }
  if (!earlier && fieldOf(entry, 'Status') !== 'Option') {
    found.push(
      `"${entry.name}" is new, so its status is Option until the designer chooses it.`
    )
  }
  return found
}

/**
 * The problems with a run made under one designer's mandate: the mandate
 * must exist from before the run, the run must record no mandate of its
 * own, and every pattern it adds or changes must cite that mandate. A
 * pattern it adds is an Option.
 *
 * @param {{ patterns: string|null, mandates: string|null }} earlier -
 * patterns.md and mandates.md at the commit the run started from, or null
 * where a file did not exist then.
 * @param {{ patterns: Array<object>, mandates: Array<object> }} now - the
 * entries now.
 * @param {{ setRepoDir: string, mandateId: string }} options
 * @returns {Array<{ file: string, message: string }>}
 */
export const mandateRunProblems = (
  earlier,
  { patterns, mandates },
  { setRepoDir, mandateId }
) => {
  const mandatesFile = `${setRepoDir}/${MANDATES_FILE}`
  const patternsFile = `${setRepoDir}/${PATTERNS_FILE}`
  const earlierMandates = parseEntries(earlier.mandates ?? '')
  if (!earlierMandates.some((mandate) => mandate.name === mandateId)) {
    return [
      problem(
        mandatesFile,
        `There is no mandate ${mandateId} from before this run. Run with a mandate the designer recorded first.`
      )
    ]
  }
  const earlierByName = new Map(
    parseEntries(earlier.patterns ?? '').map((entry) => [entry.name, entry])
  )
  const touched = patterns.filter(
    (entry) =>
      earlierByName.get(entry.name)?.text.join('\n') !== entry.text.join('\n')
  )
  return [
    ...newMandateProblems(earlierMandates, mandates, mandateId).map((message) =>
      problem(mandatesFile, message)
    ),
    ...touched.flatMap((entry) =>
      patternUnderMandateProblems(
        entry,
        earlierByName.get(entry.name),
        mandateId
      ).map((message) => problem(patternsFile, message))
    )
  ]
}
