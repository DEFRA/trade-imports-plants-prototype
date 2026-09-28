import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { isCopyLeaf, leaves } from '../app/shared/copy-leaves.js'

/**
 * The copy-shape rules a design release must keep, so its English and Welsh
 * copy files stay the same shape and nothing is left blank:
 *
 * - every English key has a Welsh key, and the other way round
 * - a key is words in both languages, or a function in both, with the same
 *   number of inputs
 * - no piece of text is empty
 * - a Welsh piece of text is never a straight copy of the English: until the
 *   Welsh is known it reads `[Welsh needed] <English>`
 *
 * The markers are counted and listed, so a designer can see how much Welsh is
 * still to come. high-risk-plants keeps its own, stricter upstream tests
 * (copy-parity.test.js), so this is aimed at design releases.
 */
export const WELSH_NEEDED = '[Welsh needed]'

const COPY_FOLDER = 'copy'
const ENGLISH_FILE = 'copy.en.js'
const WELSH_FILE = 'copy.cy.js'
const PREVIEW_LENGTH = 60

const kindOf = (value) => (typeof value === 'function' ? 'function' : 'words')

/**
 * What a function leaf says when it is given placeholder inputs. A copy
 * function that cannot run without real inputs answers with its source.
 */
const sampleOutput = (copyFunction) => {
  try {
    return String(copyFunction(...Array(copyFunction.length).fill('…')))
  } catch {
    return String(copyFunction)
  }
}

const carriesMarker = (value) =>
  typeof value === 'function'
    ? String(value).includes(WELSH_NEEDED) ||
      sampleOutput(value).includes(WELSH_NEEDED)
    : String(value).includes(WELSH_NEEDED)

const preview = (value) => {
  const text = typeof value === 'function' ? '…' : String(value)
  return text.length > PREVIEW_LENGTH
    ? `${text.slice(0, PREVIEW_LENGTH)}…`
    : text
}

const LINK_VALUE = /^(?:https?:\/\/|mailto:|tel:|\/)\S*$/
const LINK_KEY = /(?:href|url)$/i

/**
 * A link address is the same in English and Welsh, so it may be copied
 * straight across: a value that is one address with no spaces (starting
 * https://, http://, mailto:, tel: or /), or any value of a key whose name
 * ends in Href or Url.
 */
export const isLinkAddress = (keyPath, value) =>
  LINK_KEY.test(keyPath) || LINK_VALUE.test(String(value).trim())

const inputsLabel = (count) => (count === 1 ? '1 input' : `${count} inputs`)

const problem = (rule, keyPath, message) => ({ rule, keyPath, message })

const missingProblems = (englishKeys, welshKeys, english) => {
  const missing = [...englishKeys]
    .filter((key) => !welshKeys.has(key))
    .map((key) =>
      problem(
        'missing-welsh',
        key,
        `The Welsh file has no \`${key}\`. Add it to ${WELSH_FILE}. If you do not have the Welsh yet, write '${WELSH_NEEDED} ${preview(english.get(key))}'.`
      )
    )
  const extra = [...welshKeys]
    .filter((key) => !englishKeys.has(key))
    .map((key) =>
      problem(
        'extra-welsh',
        key,
        `The Welsh file has \`${key}\` but the English file does not. Remove it from ${WELSH_FILE}, or add the English to ${ENGLISH_FILE}.`
      )
    )
  return [...missing, ...extra]
}

const emptyProblems = (entries, language, file) =>
  [...entries]
    .filter(([, value]) => !isCopyLeaf(value))
    .map(([key]) =>
      problem(
        'empty',
        key,
        `\`${key}\` is empty in the ${language} file (${file}). Every piece of text needs words.`
      )
    )

const pairProblem = (key, englishValue, welshValue) => {
  if (kindOf(englishValue) !== kindOf(welshValue)) {
    return problem(
      'kind',
      key,
      `\`${key}\` is ${kindOf(englishValue)} in English but ${kindOf(welshValue)} in Welsh. Make both the same.`
    )
  }
  if (
    typeof englishValue === 'function' &&
    englishValue.length !== welshValue.length
  ) {
    return problem(
      'inputs',
      key,
      `\`${key}\` takes ${inputsLabel(englishValue.length)} in English but ${inputsLabel(welshValue.length)} in Welsh. Give both the same inputs.`
    )
  }
  if (
    typeof englishValue === 'string' &&
    englishValue.trim() !== '' &&
    welshValue === englishValue &&
    !isLinkAddress(key, englishValue)
  ) {
    return problem(
      'same-as-english',
      key,
      `The Welsh for \`${key}\` is the same as the English. Add the Welsh, or write '${WELSH_NEEDED} ${preview(englishValue)}'.`
    )
  }
  return undefined
}

const markerInEnglishProblems = (english) =>
  [...english]
    .filter(([, value]) => carriesMarker(value))
    .map(([key]) =>
      problem(
        'marker-in-english',
        key,
        `\`${key}\` has the ${WELSH_NEEDED} marker in the English file. The marker only goes in ${WELSH_FILE}.`
      )
    )

/**
 * Compares one English copy object with its Welsh twin.
 *
 * @param {object} english - the `copy` export of copy.en.js.
 * @param {object} welsh - the `copy` export of copy.cy.js.
 * @returns {{problems: {rule: string, keyPath: string, message: string}[], markers: {keyPath: string, text: string}[]}}
 */
export const compareCopy = (english, welsh) => {
  const englishLeaves = new Map(
    leaves(english).map((leaf) => [leaf.path, leaf.value])
  )
  const welshLeaves = new Map(
    leaves(welsh).map((leaf) => [leaf.path, leaf.value])
  )
  const englishKeys = new Set(englishLeaves.keys())
  const welshKeys = new Set(welshLeaves.keys())

  const pairProblems = [...englishKeys]
    .filter((key) => welshKeys.has(key))
    .map((key) =>
      pairProblem(key, englishLeaves.get(key), welshLeaves.get(key))
    )
    .filter(Boolean)

  const markers = [...welshLeaves]
    .filter(([, value]) => carriesMarker(value))
    .map(([keyPath, value]) => ({ keyPath, text: preview(value) }))

  return {
    problems: [
      ...missingProblems(englishKeys, welshKeys, englishLeaves),
      ...emptyProblems(englishLeaves, 'English', ENGLISH_FILE),
      ...emptyProblems(welshLeaves, 'Welsh', WELSH_FILE),
      ...pairProblems,
      ...markerInEnglishProblems(englishLeaves)
    ],
    markers
  }
}

const toForwardSlashes = (relativePath) =>
  relativePath.split(path.sep).join('/')

/**
 * Every `copy/` folder in a set that holds an English copy file, as paths
 * relative to the set folder, sorted.
 */
export const copyFoldersOf = (setFolder) =>
  readdirSync(setFolder, { recursive: true, withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name === ENGLISH_FILE &&
        path.basename(entry.parentPath) === COPY_FOLDER
    )
    .map((entry) =>
      toForwardSlashes(path.relative(setFolder, entry.parentPath))
    )
    .sort((first, second) => first.localeCompare(second))

/**
 * A short, designer-facing name for a copy folder: the part after
 * `features/` for a feature (`arrival-details`, `commodities/details`), or
 * the folder the copy sits in otherwise (`section-captions`).
 */
export const copyNameOf = (copyFolder) => {
  const owner = copyFolder.replace(/\/?copy$/, '')
  const featuresAt = owner.indexOf('features/')
  if (featuresAt !== -1) {
    return owner.slice(featuresAt + 'features/'.length)
  }
  return owner.split('/').pop() || owner
}

const importCopy = async (file) => {
  const loaded = await import(pathToFileURL(file).href)
  return loaded.copy
}

const checkCopyFolder = async (setFolder, copyFolder) => {
  const name = copyNameOf(copyFolder)
  const folder = path.join(setFolder, copyFolder)
  const englishFile = path.join(folder, ENGLISH_FILE)
  const welshFile = path.join(folder, WELSH_FILE)
  const where = { copy: name, folder: copyFolder }

  if (!existsSync(welshFile)) {
    return {
      problems: [
        {
          ...where,
          ...problem(
            'no-welsh-file',
            '',
            `There is no ${WELSH_FILE} beside ${ENGLISH_FILE}. Copy the English file to ${WELSH_FILE} and put '${WELSH_NEEDED} ' before every piece of text.`
          )
        }
      ],
      markers: []
    }
  }

  try {
    const result = compareCopy(
      await importCopy(englishFile),
      await importCopy(welshFile)
    )
    return {
      problems: result.problems.map((found) => ({ ...where, ...found })),
      markers: result.markers.map((found) => ({ ...where, ...found }))
    }
  } catch (error) {
    return {
      problems: [
        {
          ...where,
          ...problem(
            'unreadable',
            '',
            `The copy files could not be read. A quote, comma or bracket is probably missing. The error was: ${error.message}`
          )
        }
      ],
      markers: []
    }
  }
}

/**
 * Runs the copy-shape rules over every copy folder in one set.
 *
 * @param {string} setFolder - the absolute folder of the set.
 * @returns {Promise<{copyFolders: number, problems: object[], markers: object[]}>}
 * each problem and marker names its `copy` (a short name) and `folder`.
 */
export const checkSetCopy = async (setFolder) => {
  const folders = copyFoldersOf(setFolder)
  const results = []
  for (const copyFolder of folders) {
    results.push(await checkCopyFolder(setFolder, copyFolder))
  }
  return {
    copyFolders: folders.length,
    problems: results.flatMap((result) => result.problems),
    markers: results.flatMap((result) => result.markers)
  }
}

/** One problem as a single plain line: `arrival-details: <message>`. */
export const describeCopyProblem = (found) => `${found.copy}: ${found.message}`
