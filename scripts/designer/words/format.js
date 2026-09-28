const WELSH_LABELS = {
  translated: 'translated',
  marked: 'waiting for a translator',
  'same-as-english': 'same as the English: nobody has translated it',
  missing: 'missing: there is no Welsh for this yet'
}

const welshLine = (entry) =>
  entry.welsh === 'marked'
    ? `    Welsh:   ${entry.cy} (${WELSH_LABELS.marked})`
    : `    Welsh:   ${entry.cy ?? '(none)'} [${WELSH_LABELS[entry.welsh]}]`

const namesOf = (entry, key, fallback) => entry[key] ?? entry[fallback]

const setLabel = (info) => {
  if (info.owner === 'real-service') {
    return `${info.setId} (the real journey: it belongs to the real service)`
  }
  if (info.frozen) {
    return `${info.setId} (a frozen release: never edit it)`
  }
  if (info.kind === 'placeholder') {
    return `${info.setId} (the placeholder set, not a real journey)`
  }
  return `${info.setId} (yours)`
}

const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`

const copyLines = (entry) => [
  `  ${entry.feature} · ${entry.keyPath}`,
  `    English: ${entry.en}`,
  welshLine(entry),
  ...(entry.pages.length > 0
    ? [`    Shown on: ${namesOf(entry, 'pageNames', 'pages').join(', ')}`]
    : []),
  ...(entry.alsoOn.length > 0
    ? [
        `    Also shown on: ${namesOf(entry, 'alsoOnNames', 'alsoOn').join(', ')}`
      ]
    : []),
  `    File: ${entry.file}:${entry.line}` +
    (entry.cyLine > 0 ? `  (Welsh: ${entry.cyFile}:${entry.cyLine})` : ''),
  ...entry.flags.map((flag) => `    Note: ${flag}`)
]

const locationLines = (entries) =>
  entries.map((entry) => `  ${entry.file}:${entry.line}  ${entry.text}`)

/**
 * The find result as plain English for a designer: each set's copy first,
 * then shared chrome, then words written into templates, then pinned tests.
 */
export const formatFind = (result) => {
  const total = result.copy.length + result.templates.length
  const lines = [
    `Found "${result.text}" in ${plural(result.copy.length, 'copy string')} ` +
      `and ${plural(result.templates.length, 'template line')}.`
  ]
  if (total === 0) {
    lines.push(
      'Nothing matched. Try fewer words, or check the spelling on the page.'
    )
  }
  for (const info of result.sets) {
    const entries = result.copy.filter((entry) => entry.setId === info.setId)
    if (entries.length > 0) {
      lines.push('', setLabel(info), ...entries.flatMap(copyLines))
      const showPages = [
        ...new Set(entries.flatMap((entry) => entry.showPages ?? []))
      ]
      if (showPages.length > 0) {
        lines.push(
          `  To picture every page these words are on (${plural(showPages.length, 'page')}):`,
          `    npm run designer:show -- --set ${info.setId} --pages ${showPages.join(',')} --before`
        )
      }
    }
  }
  const shared = result.copy.filter((entry) => entry.shared)
  if (shared.length > 0) {
    lines.push(
      '',
      'Shared by every set (a real-service change: do not edit it in a design release)',
      ...shared.flatMap(copyLines)
    )
  }
  if (result.templates.length > 0) {
    lines.push(
      '',
      'Written straight into a template (should be copy)',
      ...result.templates.map(
        (entry) =>
          `  ${entry.file}:${entry.line}  ${entry.text}` +
          (entry.shared ? '  (shared by every set)' : '')
      )
    )
  }
  if ((result.comments ?? []).length > 0) {
    lines.push(
      '',
      'Comments that quote these words (update them with the words)',
      ...locationLines(result.comments)
    )
  }
  if (result.pinned.length > 0) {
    lines.push(
      '',
      'Tests and specs that pin these words (only change them when handing off)',
      ...locationLines(result.pinned)
    )
  }
  return lines.join('\n')
}

/**
 * Every string one page shows, as plain English: its own words first, then
 * the words it borrows from other pages.
 */
export const formatPage = (result) => {
  const own = result.copy.filter((entry) =>
    (entry.pageNames ?? []).includes(result.page)
  )
  const borrowed = result.copy.filter((entry) => !own.includes(entry))
  const lines = [
    `The page ${result.page} in ${result.sets[0].setId} shows ${plural(result.copy.length, 'copy string')}.`
  ]
  if (own.length > 0) {
    lines.push('', 'Its own words', ...own.flatMap(copyLines))
  }
  if (borrowed.length > 0) {
    lines.push(
      '',
      'Words it borrows from other pages (changing them changes those pages too)',
      ...borrowed.flatMap(copyLines)
    )
  }
  lines.push(
    '',
    'The header, footer and buttons such as "Save and continue" are shared by every set and are not listed.',
    'Error messages (keys under errors) show only when the page is sent with a problem.'
  )
  return lines.join('\n')
}
