import { readFileSync, writeFileSync } from 'node:fs'

const OPENING = 'const DESCRIPTIONS = {'
const CLOSING = '\n}\n'

const quoted = (text) =>
  `'${text.replaceAll('\\', '\\\\').replaceAll("'", String.raw`\'`)}'`

const entryPattern = (setId) =>
  new RegExp(
    String.raw`\n  '${setId}':\s*(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"),?`
  )

const bodyBounds = (content) => {
  const start = content.indexOf(OPENING)
  const end = start === -1 ? -1 : content.indexOf(CLOSING, start)
  if (start === -1 || end === -1) {
    throw new Error(
      'prototype-sets/descriptions.js has moved — the description could not be written. Add it by hand.'
    )
  }
  return { start: start + OPENING.length, end }
}

/**
 * Adds a set's one-line chooser description to
 * `src/server/prototype-sets/descriptions.js`. Replaces an existing entry for
 * the same set. Run `npm run format` afterwards: the entry is written on two
 * lines, which prettier joins when it fits on one.
 */
export const addDescription = (descriptionsPath, { setId, text }) => {
  const content = readFileSync(descriptionsPath, 'utf8').replace(
    entryPattern(setId),
    ''
  )
  const { start, end } = bodyBounds(content)
  const body = content.slice(start, end).trimEnd().replace(/,$/, '')
  const separator = body ? ',' : ''
  const entry = `\n  '${setId}':\n    ${quoted(text)}`
  writeFileSync(
    descriptionsPath,
    content.slice(0, start) + body + separator + entry + content.slice(end)
  )
}

/** Whether the set has a chooser description. */
export const hasDescription = (descriptionsPath, { setId }) =>
  entryPattern(setId).test(readFileSync(descriptionsPath, 'utf8'))

/** The set ids with a chooser description. */
export const describedSetIds = (descriptionsPath) => {
  const content = readFileSync(descriptionsPath, 'utf8')
  const { start, end } = bodyBounds(content)
  return [...content.slice(start, end).matchAll(/\n {2}'([a-z0-9-]+)':/g)].map(
    (match) => match[1]
  )
}

/**
 * Takes a set's description back out, for retiring a design release.
 *
 * @returns {boolean} whether there was one to remove.
 */
export const removeDescription = (descriptionsPath, { setId }) => {
  const content = readFileSync(descriptionsPath, 'utf8')
  if (!entryPattern(setId).test(content)) {
    return false
  }
  const without = content.replace(entryPattern(setId), '')
  const { start, end } = bodyBounds(without)
  const body = without.slice(start, end).trimEnd().replace(/,$/, '')
  writeFileSync(
    descriptionsPath,
    without.slice(0, start) + body + without.slice(end)
  )
  return true
}
