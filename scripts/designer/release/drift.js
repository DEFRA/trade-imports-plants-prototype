/**
 * How far a design release has fallen behind the real journey: what the real
 * team changed in `sets/high-risk-plants` between the commit the release
 * family was copied at (`release.json` `fromCommit`) and HEAD. A port of the
 * hand-off's `driftOf` (scripts/designer/handoff/build.js), for a whole
 * release rather than one patch.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  REAL_JOURNEY,
  longDate
} from '../../../src/server/prototype-sets/releases.js'
import { readReleaseRecord } from '../../new-set/release-record.js'
import { runGit } from './git.js'
import { existingSet, setsDirOf } from './sets.js'

const REAL_JOURNEY_DIR = `src/server/app/sets/${REAL_JOURNEY}`
const FEATURE_FILE = /^journeys\/linear\/features\/([^/]+)\//
const SLUG = /slug:\s*['"]([^'"]+)['"]/g
const MAX_CHAIN = 10

/** The parts of the real journey that are not pages, by folder, first match
 * wins. The last one catches everything else a page can depend on. */
const OTHER_PARTS = [
  [
    /^journeys\/linear\/flow\/fixtures\//,
    'the example answers the example notifications are made from'
  ],
  [/^journeys\/linear\/flow\//, 'the order of the pages and the task list'],
  [/^obligations\//, 'which questions the journey asks, and when'],
  [/./, 'shared parts of the journey (lookups, settings and helpers)']
]

/**
 * Files nobody sees on a page: the same ones `new:set` leaves out of a
 * release (scripts/new-set/copy-set.js), namely requirement files, docs,
 * browser tests, unit tests and test helpers.
 */
const isUnseen = (relative) => {
  const segments = relative.split('/')
  return (
    segments[0] === 'spec' ||
    segments.includes('docs') ||
    segments.includes('fit') ||
    relative.endsWith('.fit.spec.js') ||
    relative.endsWith('.test.js') ||
    relative.endsWith('test-support.js')
  )
}

const gitLines = (repoRoot, args) => {
  const result = runGit(repoRoot, args)
  return result.status === 0
    ? result.stdout.split('\n').filter((line) => line.trim() !== '')
    : []
}

/** The full id of `ref`, or null when it is not a commit in this repo. */
const resolveCommit = (repoRoot, ref) =>
  ref
    ? (gitLines(repoRoot, [
        'rev-parse',
        '--verify',
        '--quiet',
        `${ref}^{commit}`
      ])[0] ?? null)
    : null

const commitThatAdded = (repoRoot, filePath) =>
  gitLines(repoRoot, [
    'log',
    '--diff-filter=A',
    '--format=%H',
    '--',
    filePath
  ])[0] ?? null

/** A release's record as it was at `commit`, for a parent retired since. */
const recordAtCommit = (repoRoot, commit, setId) => {
  if (!commit) {
    return null
  }
  const result = runGit(repoRoot, [
    'show',
    `${commit}:src/server/app/sets/${setId}/release.json`
  ])
  try {
    return result.status === 0 ? JSON.parse(result.stdout) : null
  } catch {
    return null
  }
}

/**
 * The release in the family that was copied straight from the real journey:
 * the release itself, or the one it (or its parent, and so on) was made from.
 * Null when the family did not start from the real journey.
 */
const familyStart = (repoRoot, release) => {
  let current = release
  for (let hop = 0; hop < MAX_CHAIN && current.record; hop++) {
    const { record } = current
    if ((record.root ?? record.from) !== REAL_JOURNEY) {
      return null
    }
    if (record.from === REAL_JOURNEY) {
      return current
    }
    const parentDir = path.join(setsDirOf(repoRoot), record.from)
    const parentRecord = existsSync(path.join(parentDir, 'set.js'))
      ? readReleaseRecord(parentDir)
      : recordAtCommit(repoRoot, record.fromCommit, record.from)
    if (!parentRecord) {
      return current
    }
    current = { setId: record.from, record: parentRecord }
  }
  return null
}

const baseCommitOf = (repoRoot, start) =>
  resolveCommit(repoRoot, start.record.fromCommit) ??
  commitThatAdded(repoRoot, `src/server/app/sets/${start.setId}/set.js`)

/** The page addresses a feature folder declares in its `page.js`, read now,
 * or at `base` for a feature the real team has since removed. */
const pagesOfFeature = (repoRoot, base, feature) => {
  const pageFile = `${REAL_JOURNEY_DIR}/journeys/linear/features/${feature}/page.js`
  const onDisk = path.join(repoRoot, pageFile)
  const source = existsSync(onDisk)
    ? readFileSync(onDisk, 'utf8')
    : runGit(repoRoot, ['show', `${base}:${pageFile}`]).stdout
  const slugs = [...source.matchAll(SLUG)].map(([, slug]) => slug)
  return slugs.length > 0 ? slugs : [feature]
}

const unique = (items) => [...new Set(items)]

/**
 * What changed in the real journey since a release was copied from it.
 *
 * `applies` is false for the real journey, the placeholder, a release made
 * from the placeholder, and a release whose starting commit cannot be found:
 * `reason` says why in plain English. Otherwise `count` is the number of
 * pages plus other parts a designer would see differently.
 *
 * @returns {{ release: string, applies: boolean, reason?: string, base?: string, startedFrom?: string, copiedOn?: string | null, files?: string[], pages?: string[], otherParts?: string[], unseenFiles?: string[], count?: number }}
 */
export const releaseDrift = (setId, { repoRoot }) => {
  const release = existingSet(repoRoot, setId)
  if (setId === REAL_JOURNEY) {
    return {
      release: setId,
      applies: false,
      reason: `${REAL_JOURNEY} is the real journey itself, so it is always current.`
    }
  }
  const start = familyStart(repoRoot, release)
  if (!start) {
    return {
      release: setId,
      applies: false,
      reason: `"${setId}" was not copied from the real journey, so there is nothing to compare it with.`
    }
  }
  const base = baseCommitOf(repoRoot, start)
  if (!base) {
    return {
      release: setId,
      applies: false,
      reason: `The commit "${setId}" was copied at is not in this repo, so its changes since cannot be counted.`
    }
  }
  const files = gitLines(repoRoot, [
    'diff',
    '--name-only',
    base,
    'HEAD',
    '--',
    REAL_JOURNEY_DIR
  ])
  const relative = files.map((file) => file.slice(REAL_JOURNEY_DIR.length + 1))
  const seen = relative.filter((file) => !isUnseen(file))
  const features = unique(
    seen.map((file) => FEATURE_FILE.exec(file)?.[1]).filter(Boolean)
  )
  const pages = unique(
    features.flatMap((feature) => pagesOfFeature(repoRoot, base, feature))
  ).toSorted()
  const otherParts = unique(
    seen
      .filter((file) => !FEATURE_FILE.test(file))
      .map((file) => OTHER_PARTS.find(([pattern]) => pattern.test(file))[1])
  )
  return {
    release: setId,
    applies: true,
    base,
    startedFrom: start.setId,
    copiedOn: start.record.createdAt ?? null,
    files,
    pages,
    otherParts,
    unseenFiles: files.filter((_, index) => isUnseen(relative[index])),
    count: pages.length + otherParts.length
  }
}

const copiedLine = (drift) => {
  const when = drift.copiedOn ? ` on ${longDate(drift.copiedOn)}` : ''
  return drift.startedFrom === drift.release
    ? `"${drift.release}" was copied from the real journey${when}.`
    : `"${drift.release}" was made from "${drift.startedFrom}", which was copied from the real journey${when}.`
}

/** The drift in plain English, for `designer:release drift <release>`. */
export const formatDrift = (drift) => {
  if (!drift.applies) {
    return drift.reason
  }
  if (drift.count === 0) {
    const unseen =
      drift.unseenFiles.length > 0
        ? ` (Only ${drift.unseenFiles.length} file(s) nobody sees on a page changed: tests, notes or requirement files.)`
        : ''
    return `${copiedLine(drift)} The real team has not changed any page since, so there is nothing to pick up.${unseen}`
  }
  const lines = [
    copiedLine(drift),
    `Since then the real team has changed ${drift.count} ${drift.count === 1 ? 'thing' : 'things'} you would see:`
  ]
  if (drift.pages.length > 0) {
    lines.push('', 'Pages:', ...drift.pages.map((page) => `  - ${page}`))
  }
  if (drift.otherParts.length > 0) {
    lines.push('', 'Also:', ...drift.otherParts.map((part) => `  - ${part}`))
  }
  if (drift.unseenFiles.length > 0) {
    lines.push(
      '',
      `${drift.unseenFiles.length} more file(s) changed that nobody sees on a page: tests, notes and requirement files.`
    )
  }
  lines.push(
    '',
    `To bring these into your design release, say "pick up the real team's changes".`
  )
  return lines.join('\n')
}
