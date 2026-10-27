/**
 * Records and reads a designer's mandate: their own words giving permission
 * for release patterns in one design release. Each mandate is one
 * `## m-<date>-<n>` entry in the release's `mandates.md`, and the file only
 * ever gains entries.
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { fieldOf, MANDATES_FILE, readMandates } from '../lib/release-records.js'
import { releaseInfo, setDir } from '../lib/sets.js'

export const DESIGNER_NOTE_MARKER = '<!-- tim:designer-note start -->'

export class MandateError extends Error {}

/** The workspace that holds this checkout: two folders up, past `repos/`. */
export const workspaceRootOf = (root) => path.resolve(root, '..', '..')

/**
 * Whether the workspace's `CLAUDE.local.md` carries the designer note that
 * `tim prototype setup` writes.
 */
export const isMarkedDesigner = (workspaceRoot) => {
  const note = path.join(workspaceRoot, 'CLAUDE.local.md')
  return (
    existsSync(note) &&
    readFileSync(note, 'utf8').includes(DESIGNER_NOTE_MARKER)
  )
}

const workingRelease = (setId, root) => {
  const info = releaseInfo(setId, { root })
  if (!info) {
    throw new MandateError(`There is no set called "${setId}".`)
  }
  if (info.kind !== 'release') {
    throw new MandateError(
      `${setId} is not a design release, so it has no release patterns. Start a design release from it first.`
    )
  }
  if (info.frozen) {
    throw new MandateError(
      `${setId} is frozen. Start a working release from it, then record the mandate there.`
    )
  }
  return info
}

const oneLine = (text) =>
  String(text ?? '')
    .replaceAll(/\s+/g, ' ')
    .trim()

/** The next free id for a mandate recorded on `isoDate`. */
export const nextMandateId = (mandates, isoDate) => {
  const prefix = `m-${isoDate}-`
  const taken = mandates
    .map((mandate) => mandate.name)
    .filter((name) => name.startsWith(prefix))
    .map((name) => Number(name.slice(prefix.length)))
    .filter(Number.isInteger)
  return `${prefix}${Math.max(0, ...taken) + 1}`
}

const entryText = ({ id, date, words, scope }) =>
  [
    `## ${id}`,
    '',
    `- Date: ${date}`,
    `- Words: ${words}`,
    `- Scope: ${scope}`,
    ''
  ].join('\n')

const separatorBefore = (file) => {
  if (!existsSync(file)) {
    return '# Mandates\n\n'
  }
  const current = readFileSync(file, 'utf8')
  if (current === '') {
    return '# Mandates\n\n'
  }
  return current.endsWith('\n') ? '\n' : '\n\n'
}

/**
 * Appends one mandate to a working release's `mandates.md`.
 *
 * @param {string} setId - the design release.
 * @param {{ words: string, scope?: string }} given - the designer's words,
 * kept as written apart from line breaks, and what they said it covers.
 * @param {{ root: string, workspaceRoot: string, today: string }} options -
 * `today` is an ISO date (yyyy-mm-dd).
 * @returns {{ id: string, set: string, date: string, words: string, scope: string, file: string }}
 * `file` is repo-relative.
 * @throws {MandateError} when the person is not marked as a designer, the
 * set is not a working release, or no words are given.
 */
export const recordMandate = (
  setId,
  { words, scope },
  { root, workspaceRoot, today }
) => {
  if (!isMarkedDesigner(workspaceRoot)) {
    throw new MandateError(
      "Only a designer's session can record a mandate, and this workspace does not mark you as a designer. Build the nearest GOV.UK option and log a design gap instead."
    )
  }
  workingRelease(setId, root)
  const recordedWords = oneLine(words)
  if (recordedWords === '') {
    throw new MandateError(
      "Give the designer's own words with --words, exactly as they wrote them."
    )
  }
  const folder = setDir(setId, { root })
  const entry = {
    id: nextMandateId(readMandates(folder), today),
    date: today,
    words: recordedWords,
    scope: oneLine(scope) || 'the whole release (not given)'
  }
  const file = path.join(folder, MANDATES_FILE)
  appendFileSync(file, `${separatorBefore(file)}${entryText(entry)}`)
  return {
    ...entry,
    set: setId,
    file: path.relative(root, file).split(path.sep).join('/')
  }
}

/**
 * One recorded mandate, read back from the release's `mandates.md`.
 *
 * @param {string} setId - the design release.
 * @param {string} id - the mandate id, such as m-2026-10-27-1.
 * @param {{ root: string }} options
 * @returns {{ id: string, set: string, date: string, words: string, scope: string, copiedFrom: string }}
 * `copiedFrom` is '' for a mandate recorded in this release.
 * @throws {MandateError} when the set is not a design release or holds no
 * mandate with that id.
 */
export const showMandate = (setId, id, { root }) => {
  const info = releaseInfo(setId, { root })
  if (info?.kind !== 'release') {
    throw new MandateError(`${setId} is not a design release.`)
  }
  const mandate = readMandates(setDir(setId, { root })).find(
    (entry) => entry.name === id
  )
  if (!mandate) {
    throw new MandateError(
      `${setId} has no mandate ${id} in ${MANDATES_FILE}. Record it with designer:mandate record first.`
    )
  }
  return {
    id,
    set: setId,
    date: fieldOf(mandate, 'Date'),
    words: fieldOf(mandate, 'Words'),
    scope: fieldOf(mandate, 'Scope'),
    copiedFrom: fieldOf(mandate, 'Copied from')
  }
}
