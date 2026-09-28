import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Two house conventions copy-shape.js does not check, because it only
 * compares an English file with its Welsh twin once both exist:
 *
 * - a template that reads `copy.<path>` has a `copy/copy.en.js` to read it
 *   from — its own, or the nearest ancestor's (a group of pages sharing one
 *   `copy/` folder, as `commodities/details` and `commodities/list` share
 *   `commodities/copy/`, is a real, working pattern: ownership is asked of
 *   the nearest copy folder, not only a direct sibling);
 * - every `copy.<path>` it reads resolves to something real in that
 *   `copy.en.js` — a renamed or removed key left it reading `undefined`
 *   silently.
 *
 * A template with no `copy.` reference at all (a placeholder page passing
 * plain strings, as `welcome/template.njk` does) needs no copy folder: there
 * is nothing here for one to answer.
 */
const ENGLISH_FILE = 'copy.en.js'
const WELSH_FILE = 'copy.cy.js'
const COPY_FOLDER = 'copy'
const TEMPLATE_EXT = '.njk'

// `copy.foo.bar`, stopping at anything that is not a dotted identifier
// (`(`, `[`, a space). Deliberately narrow to the one binding every template
// reads copy through (`copy`, the name every controller passes its view
// model under): a file that names its copy object something else is out of
// reach, the same trade-off `set-isolation` and the other structural checks
// already make for a plain-text scan.
const COPY_REFERENCE = /\bcopy\.([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)/g

const toForwardSlashes = (relativePath) =>
  relativePath.split(path.sep).join('/')

const filesUnder = (dir, predicate) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        return entry.isDirectory()
          ? filesUnder(full, predicate)
          : predicate(entry.name)
            ? [full]
            : []
      })
    : []

/** Every `.njk` template in a set, as absolute paths. */
export const templatesIn = (setFolder) =>
  filesUnder(setFolder, (name) => name.endsWith(TEMPLATE_EXT))

/** The `copy.<path>` references a template's source names, deduplicated,
 * dropping the one false match a copy file's own name invites: a literal
 * mention of `copy.en.js`/`copy.cy.js` (in a comment) reads as the dotted
 * path `en.js`/`cy.js`. */
export const copyReferencesIn = (source) => {
  const found = new Set()
  for (const match of source.matchAll(COPY_REFERENCE)) {
    const referenced = match[1]
    if (referenced !== 'en.js' && referenced !== 'cy.js') {
      found.add(referenced)
    }
  }
  return [...found].sort((first, second) => first.localeCompare(second))
}

/** The nearest `copy/copy.en.js` above (or beside) a file, walking up to
 * `setFolder`, or null when none owns it. */
export const nearestCopyFolder = (fileDir, setFolder) => {
  let dir = fileDir
  while (true) {
    const candidate = path.join(dir, COPY_FOLDER, ENGLISH_FILE)
    if (existsSync(candidate)) {
      return path.join(dir, COPY_FOLDER)
    }
    if (path.resolve(dir) === path.resolve(setFolder)) {
      return null
    }
    const parent = path.dirname(dir)
    if (parent === dir) {
      return null
    }
    dir = parent
  }
}

/**
 * The templates that read `copy.<path>` but have no `copy/copy.en.js`
 * anywhere above them, as paths relative to the set.
 */
export const templatesWithoutOwnCopy = (setFolder) =>
  templatesIn(setFolder)
    .filter((file) => copyReferencesIn(readFileSync(file, 'utf8')).length > 0)
    .filter((file) => nearestCopyFolder(path.dirname(file), setFolder) === null)
    .map((file) => toForwardSlashes(path.relative(setFolder, file)))
    .sort((first, second) => first.localeCompare(second))

/** Every dotted path a copy tree answers, leaf or not — `errors` as well as
 * `errors.name`, so a reference to a whole branch (`copy.errors`, passed to
 * a helper) is not mistaken for a missing key. */
const pathsOf = (node, prefix = []) => {
  if (typeof node !== 'object' || node === null) {
    return prefix.length > 0 ? [prefix.join('.')] : []
  }
  return Object.entries(node).flatMap(([key, value]) => [
    [...prefix, key].join('.'),
    ...pathsOf(value, [...prefix, key])
  ])
}

const importCopy = async (file) => (await import(pathToFileURL(file).href)).copy

/** Every path `englishFile` answers, memoised: null when it cannot be read
 * (already reported by the copy-shape check, so this stays quiet). */
const knownPathsOf = async (englishFile, cache) => {
  if (cache.has(englishFile)) {
    return cache.get(englishFile)
  }
  try {
    const known = new Set(pathsOf(await importCopy(englishFile)))
    cache.set(englishFile, known)
    return known
  } catch {
    cache.set(englishFile, null)
    return null
  }
}

/**
 * The copy bundle a page in a shared copy folder's subfolder reads, as a
 * dotted path: `commodities/list/list.njk` under `commodities/copy/` reads
 * the `list` branch, because its controller passes `copyFor(...).list` as
 * `copy`. Null for a template beside its own copy folder.
 *
 * @param {string} file - the template's absolute path.
 * @param {string} copyFolder - the absolute `copy/` folder that owns it.
 * @returns {string|null} the bundle path, or null.
 */
const sharedCopyBundleOf = (file, copyFolder) => {
  const fromOwner = path.relative(path.dirname(copyFolder), path.dirname(file))
  return fromOwner === '' ? null : fromOwner.split(path.sep).join('.')
}

/** The unresolved `copy.<path>` references in one template, or `[]` when it
 * reads no copy, has no copy folder above it (already reported by
 * `templatesWithoutOwnCopy`), or that folder cannot be read. */
const unresolvedInTemplate = async (file, setFolder, cache) => {
  const references = copyReferencesIn(readFileSync(file, 'utf8'))
  const copyFolder =
    references.length > 0
      ? nearestCopyFolder(path.dirname(file), setFolder)
      : null
  if (!copyFolder) {
    return []
  }
  const known = await knownPathsOf(path.join(copyFolder, ENGLISH_FILE), cache)
  if (!known) {
    return []
  }
  const template = toForwardSlashes(path.relative(setFolder, file))
  const bundle = sharedCopyBundleOf(file, copyFolder)
  return references
    .filter(
      (referenced) =>
        !known.has(referenced) &&
        !(bundle && known.has(`${bundle}.${referenced}`))
    )
    .map((referenced) => ({ template, path: referenced }))
}

/**
 * Every `copy.<path>` a set's templates read that its nearest `copy.en.js`
 * does not answer.
 *
 * @param {string} setFolder - the absolute folder of the set.
 * @returns {Promise<{template: string, path: string}[]>} one entry per
 * missing reference, `template` relative to the set.
 */
export const unresolvedCopyReferences = async (setFolder) => {
  const cache = new Map()
  const perTemplate = await Promise.all(
    templatesIn(setFolder).map((file) =>
      unresolvedInTemplate(file, setFolder, cache)
    )
  )
  return perTemplate.flat()
}

/**
 * Both checks together, in the copy-shape checker's own report shape, so
 * `designer:check` can fold them into the same step.
 *
 * @param {string} setFolder - the absolute folder of the set.
 * @returns {Promise<{problems: {rule: string, message: string}[]}>}
 */
export const checkCopyUsage = async (setFolder) => {
  const ownership = templatesWithoutOwnCopy(setFolder).map((template) => ({
    rule: 'no-own-copy',
    message: `${template} reads copy.<path> but no ${COPY_FOLDER}/${ENGLISH_FILE} owns it — not its own, and none above it in the set. Give it, or a parent folder it shares with sibling pages, a ${COPY_FOLDER}/${ENGLISH_FILE} and ${COPY_FOLDER}/${WELSH_FILE}.`
  }))
  const unresolved = (await unresolvedCopyReferences(setFolder)).map(
    ({ template, path: referenced }) => ({
      rule: 'unresolved-reference',
      message: `${template} reads copy.${referenced}, which is not in its copy.en.js. Add the key, or fix the reference if it was renamed.`
    })
  )
  return { problems: [...ownership, ...unresolved] }
}
