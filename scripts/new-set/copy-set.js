import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { longDate } from '../../src/server/prototype-sets/releases.js'
import { transformContent, transformPath } from './transform.js'

/** The template every other set started from. It carries no tests, so a
 * copy of it takes everything. */
export const PLACEHOLDER_TEMPLATE = 'sample-journey'

/** A release's own record. Each release writes its own, so a copy never
 * carries its template's. */
export const RELEASE_FILE = 'release.json'

/** A research release's session plan and research-mode log. They name its
 * own examples and relaxed rules, so a working copy made from it leaves them
 * behind. */
const RESEARCH_ONLY = new Set(['research-session.json', 'research-mode.md'])

const IMPORT_SPECIFIER =
  /(?:^|[\s;])(?:import|export)\s(?:[^'"]*?\sfrom\s*)?['"]([^'"]+)['"]/g

const toPosix = (path) => path.split(sep).join('/')

/** Every file under `dir`, as a `/`-separated path relative to it. */
export const listFiles = (dir, base = dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    return entry.isDirectory()
      ? listFiles(full, base)
      : [toPosix(relative(base, full))]
  })

/** The relative modules a JS file imports or re-exports, resolved to
 * absolute paths. Packages and built-ins are not followed. */
export const relativeImportsOf = (filePath) =>
  [...readFileSync(filePath, 'utf8').matchAll(IMPORT_SPECIFIER)]
    .map(([, specifier]) => specifier)
    .filter((specifier) => specifier.startsWith('.'))
    .map((specifier) => resolve(dirname(filePath), specifier))

/**
 * Every file the journey itself uses: the JS reachable from the set's
 * gateway (`routes-<id>.js`) by following relative imports. A JS file inside
 * the set that is not in here is used only by tests, or by nothing.
 */
export const reachableFrom = (entryFile) => {
  const seen = new Set()
  const queue = [resolve(entryFile)]
  while (queue.length > 0) {
    const file = queue.pop()
    if (seen.has(file) || !existsSync(file)) {
      continue
    }
    seen.add(file)
    if (file.endsWith('.js')) {
      queue.push(...relativeImportsOf(file))
    }
  }
  return seen
}

/**
 * Why a file in the template is left out of a design release, or null to
 * copy it. Only a copy of the real journey (or of a release) is trimmed: the
 * placeholder template carries no tests and is copied whole.
 */
const skipReasonFor = (
  relativePath,
  { trimmed, reachable, absolutePath, purpose }
) => {
  if (relativePath === RELEASE_FILE) {
    return 'release record'
  }
  if (purpose !== 'research' && RESEARCH_ONLY.has(relativePath)) {
    return 'research only'
  }
  const segments = relativePath.split('/')
  if (!trimmed || segments[0] === 'assets') {
    return null
  }
  const rules = [
    [segments[0] === 'spec', 'spec'],
    [segments.includes('docs'), 'docs'],
    [
      relativePath.endsWith('.fit.spec.js') || segments.includes('fit'),
      'browser test'
    ],
    [relativePath.endsWith('.test.js'), 'unit test'],
    [relativePath.endsWith('test-support.js'), 'used only by tests'],
    [
      relativePath.endsWith('.js') && !reachable.has(absolutePath),
      'used only by tests'
    ]
  ]
  return rules.find(([applies]) => applies)?.[1] ?? null
}

/**
 * Which of a template's files a new set gets, and which it leaves out and
 * why. A design release made from the real journey does not carry the
 * journey's own tests, browser specs, docs or requirement digests: copied,
 * they fail by construction (see PROTOTYPE.md). Its example data fixture
 * (`journeys/linear/flow/fixtures/happy-path.json`) is kept, and so is
 * everything in its `assets/` folder, tests included.
 *
 * @returns {{ keep: string[], skipped: Array<{ path: string, reason: string }> }}
 */
export const planCopy = (sourceDir, { fromId, routesFile, purpose }) => {
  const trimmed = fromId !== PLACEHOLDER_TEMPLATE
  const reachable = trimmed ? reachableFrom(routesFile) : new Set()
  const keep = []
  const skipped = []
  for (const path of listFiles(sourceDir).toSorted()) {
    const reason = skipReasonFor(path, {
      trimmed,
      reachable,
      absolutePath: resolve(sourceDir, path),
      purpose
    })
    if (reason) {
      skipped.push({ path, reason })
    } else {
      keep.push(path)
    }
  }
  return { keep, skipped }
}

/**
 * A release's `patterns.md` or `mandates.md` with every entry marked as
 * copied from `fromId` on `copiedOn`: a `- Copied from:` line opens each
 * entry's field list, in place of any it already had.
 *
 * @param {string} content - the file's text.
 * @param {{ fromId: string, copiedOn: string }} copy - copiedOn is an ISO date.
 * @returns {string}
 */
export const markEntriesCopied = (content, { fromId, copiedOn }) => {
  const copiedFrom = `- Copied from: ${fromId} on ${longDate(copiedOn)}`
  const lines = content
    .split('\n')
    .filter((line) => !line.startsWith('- Copied from:'))
  return lines
    .map((line, index) =>
      line.startsWith('- ') && (lines[index - 1] ?? '').trim() === ''
        ? `${copiedFrom}\n${line}`
        : line
    )
    .join('\n')
}

/**
 * Copies the planned files of a template set to the new set, transforming
 * every file's content and every path on the way — the filesystem shell
 * around `transform.js`'s pure rewrite. Hand in a shared `uuidMap` to learn
 * which obligation id became which. A `patterns.md` and a `mandates.md` are
 * also marked as copied on `copiedOn`.
 */
export const copySetFiles = (
  sourceDir,
  destDir,
  files,
  { fromId, newId, uuidMap, copiedOn }
) => {
  const copiedRecords = new Set(['patterns.md', 'mandates.md'])
  for (const path of files) {
    const destPath = join(destDir, transformPath(path, { fromId, newId }))
    mkdirSync(dirname(destPath), { recursive: true })
    const content = transformContent(
      readFileSync(join(sourceDir, path), 'utf8'),
      { fromId, newId, uuidMap }
    )
    writeFileSync(
      destPath,
      copiedRecords.has(path)
        ? markEntriesCopied(content, { fromId, copiedOn })
        : content
    )
  }
}

/**
 * Copies the template's routes file — `routes-<fromId>.js`, a sibling of
 * `sets/`, not inside it — the same way.
 */
export const copyRoutesFile = (
  sourcePath,
  destPath,
  { fromId, newId, uuidMap }
) => {
  const content = readFileSync(sourcePath, 'utf8')
  writeFileSync(destPath, transformContent(content, { fromId, newId, uuidMap }))
}
