/**
 * Works out everything a hand-off folder says, without writing it: the
 * designer's change expressed against the real journey's files, the patch
 * and whether it applies, what moved upstream since the release was made,
 * which tests pin the old words, and what cannot ship as it is.
 *
 * Two modes:
 * - release mode (the default): a design release is reversed back into
 *   high-risk-plants, file by file, and compared with the real journey as it
 *   was when the release was made.
 * - real-journey mode (`set` is high-risk-plants): the real journey's files
 *   on this branch are compared with `base` (default `main`). This is the
 *   upstream-bound route, where a `handoff/*` branch changed the real journey
 *   and its tests directly.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import {
  buildPatch,
  changedBetween,
  changedInWorkingTree,
  checkPatchApplies,
  commitThatAdded,
  filesAt,
  filesMatchingAt,
  resolveCommit,
  showFile,
  subjectsTouching
} from './git.js'
import {
  orientUuidMap,
  pairUuidsByPosition,
  reversePath,
  reversePathThroughChain,
  reverseThroughChain
} from './reverse-transform.js'
import {
  findPinnedStrings,
  findPrototypeImports,
  findWelshMarkers,
  isTestFile,
  parseDesignGaps,
  parseResearchRules,
  removedLiterals
} from './impact.js'
import { copyChanges, isCopyFile, isWelshCopyFile } from './copy-table.js'

export const REAL_JOURNEY = 'high-risk-plants'
export const PLACEHOLDER = 'sample-journey'
export const SETS_DIR = 'src/server/app/sets'
const MAX_CHAIN = 10
const UUID_GREP = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

/** The recipe names a commit message or the designer may mention. */
export const RECIPES = [
  'add-a-field',
  'add-a-page',
  'add-a-section',
  'add-a-collection',
  'journey-flow-and-gates',
  'obligation-model',
  'guidance-page',
  'move-a-page',
  'add-a-branch',
  'task-list',
  'check-answers',
  'confirmation-variant',
  'validation-rules'
]

/** Files a release keeps for itself; they never travel in the patch. */
const PROTOTYPE_ONLY = [
  /^release\.json$/,
  /^design-gaps\.md$/,
  /^research-mode\.md$/,
  /^docs\//,
  /^spec\//
]

/** A refusal with a plain-English reason, shown to the designer as it is. */
export class HandoffError extends Error {}

export const setDirOf = (setId) => `${SETS_DIR}/${setId}`

const readIfExists = (root, filePath) => {
  const full = path.join(root, filePath)
  return existsSync(full) ? readFileSync(full, 'utf8') : null
}

const walk = (dir, prefix = '') => {
  if (!existsSync(dir)) {
    return []
  }
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      files.push(...walk(path.join(dir, entry.name), relative))
    } else {
      files.push(relative)
    }
  }
  return files
}

/** A release's `release.json`, or null for a set made before it existed. */
export const readReleaseInfo = (root, setId) => {
  const content = readIfExists(root, `${setDirOf(setId)}/release.json`)
  if (content === null) {
    return null
  }
  try {
    return JSON.parse(content)
  } catch {
    throw new HandoffError(
      `${setDirOf(setId)}/release.json is not valid JSON. Fix it, or ask the maintainer.`
    )
  }
}

/**
 * The steps from a release back to the real journey: one step for a release
 * made from high-risk-plants, more for a release made from another release.
 * `fromOverride` names what the release was made from when it has no
 * `release.json`.
 */
export const resolveChain = (root, setId, fromOverride) => {
  const hops = []
  let current = setId
  while (current !== REAL_JOURNEY) {
    if (current === PLACEHOLDER) {
      throw new HandoffError(
        `${setId} was made from the sample-journey placeholder, not the real journey. There is no real page to patch, so hand it over as a brief and screenshots only.`
      )
    }
    if (!existsSync(path.join(root, setDirOf(current)))) {
      throw new HandoffError(
        `There is no design release called "${current}" in ${SETS_DIR}.`
      )
    }
    if (hops.length >= MAX_CHAIN) {
      throw new HandoffError(
        `${setId} is made from a chain of more than ${MAX_CHAIN} releases. Hand over a release made straight from high-risk-plants.`
      )
    }
    const info = readReleaseInfo(root, current)
    const fromId =
      (hops.length === 0 ? fromOverride : null) ?? info?.from ?? REAL_JOURNEY
    hops.push({
      releaseId: current,
      fromId,
      info,
      createdIn: commitThatAdded(root, `${setDirOf(current)}/set.js`)
    })
    current = fromId
  }
  return hops
}

const releaseTextsWithUuids = (root, releaseId) =>
  walk(path.join(root, setDirOf(releaseId)))
    .map((relative) => readIfExists(root, `${setDirOf(releaseId)}/${relative}`))
    .filter((content) => content && new RegExp(UUID_GREP, 'i').test(content))

const pairAtCommit = (root, hop) => {
  const map = {}
  const unpaired = []
  const releaseFiles = filesMatchingAt(
    root,
    hop.createdIn,
    UUID_GREP,
    setDirOf(hop.releaseId)
  )
  for (const releaseFile of releaseFiles) {
    const pairs = pairUuidsByPosition(
      showFile(root, hop.createdIn, releaseFile) ?? '',
      showFile(root, hop.createdIn, reversePath(releaseFile, hop)) ?? ''
    )
    if (pairs) {
      Object.assign(map, pairs)
    } else {
      unpaired.push(releaseFile)
    }
  }
  return { map, unpaired }
}

const pairOnDisk = (root, hop) => {
  const map = {}
  const unpaired = []
  const dir = setDirOf(hop.releaseId)
  for (const relative of walk(path.join(root, dir))) {
    const releaseFile = `${dir}/${relative}`
    const content = readIfExists(root, releaseFile) ?? ''
    if (new RegExp(UUID_GREP, 'i').test(content)) {
      const pairs = pairUuidsByPosition(
        content,
        readIfExists(root, reversePath(releaseFile, hop)) ?? ''
      )
      if (pairs) {
        Object.assign(map, pairs)
      } else {
        unpaired.push(releaseFile)
      }
    }
  }
  return { map, unpaired }
}

/**
 * How each release UUID maps back: from `release.json`'s `uuidMap` when it
 * has one, otherwise by pairing files by position as they were in the
 * commit that made the release, otherwise (a release not yet saved) as they
 * are on disk now.
 */
export const uuidMapForHop = (root, hop) => {
  if (hop.info?.uuidMap) {
    return {
      map: orientUuidMap(
        hop.info.uuidMap,
        releaseTextsWithUuids(root, hop.releaseId)
      ),
      unpaired: [],
      source: 'release.json'
    }
  }
  if (hop.createdIn) {
    return { ...pairAtCommit(root, hop), source: 'first commit' }
  }
  return { ...pairOnDisk(root, hop), source: 'files on disk' }
}

const isPrototypeOnly = (relative) =>
  PROTOTYPE_ONLY.some((pattern) => pattern.test(relative))

const featureOf = (filePath) =>
  /journeys\/linear\/features\/([^/]+)\//.exec(filePath)?.[1] ?? null

/**
 * The commit whose high-risk-plants the release family was copied from: the
 * root release's recorded `fromCommit`, else the commit that added it, else
 * HEAD (a release not saved yet, with no record).
 */
const copiedFromRef = (root, hops) => {
  const rootHop = hops.at(-1)
  return (
    resolveCommit(root, rootHop.info?.fromCommit) ??
    resolveCommit(root, rootHop.createdIn) ??
    'HEAD'
  )
}

const releaseChanges = (root, setId, hops) => {
  const setDir = setDirOf(setId)
  const baseRef = copiedFromRef(root, hops)
  const present = new Set(walk(path.join(root, setDir)))
  const changes = []
  for (const relative of present) {
    if (!isPrototypeOnly(relative)) {
      const releasePath = `${setDir}/${relative}`
      const realPath = reversePathThroughChain(releasePath, hops)
      const after = reverseThroughChain(
        readIfExists(root, releasePath) ?? '',
        hops
      )
      const before = showFile(root, baseRef, realPath)
      if (before !== after) {
        changes.push({ path: realPath, releasePath, before, after })
      }
    }
  }
  const createdIn = hops[0].createdIn
  const removed = createdIn
    ? filesAt(root, createdIn, setDir)
        .map((releasePath) => releasePath.slice(setDir.length + 1))
        .filter((relative) => !present.has(relative))
        .filter((relative) => !isPrototypeOnly(relative))
    : []
  for (const relative of removed) {
    const releasePath = `${setDir}/${relative}`
    const realPath = reversePathThroughChain(releasePath, hops)
    const before = showFile(root, baseRef, realPath)
    if (before !== null) {
      changes.push({ path: realPath, releasePath, before, after: null })
    }
  }
  return { changes, baseRef }
}

const realJourneyChanges = (root, base) => {
  const baseRef = resolveCommit(root, base)
  if (!baseRef) {
    throw new HandoffError(
      `Cannot find "${base}" to compare the real journey with. Name a branch or commit with --base.`
    )
  }
  const changes = changedInWorkingTree(root, baseRef, setDirOf(REAL_JOURNEY))
    .map((realPath) => ({
      path: realPath,
      releasePath: realPath,
      before: showFile(root, baseRef, realPath),
      after: readIfExists(root, realPath)
    }))
    .filter((change) => change.before !== change.after)
  return { changes, baseRef }
}

const statusOf = (change) => {
  if (change.before === null) {
    return 'added'
  }
  return change.after === null ? 'deleted' : 'changed'
}

const NEEDS_A_REAL_SERVICE =
  /needsARealService:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/

/** The fake's own "needs a real service" sentence from its index.js, or null. */
const needsARealServiceOf = (root, found) => {
  const source = readIfExists(
    root,
    `src/server/${found.kind}/${found.name}/index.js`
  )
  const match = source ? NEEDS_A_REAL_SERVICE.exec(source) : null
  return match ? (match[1] ?? match[2]) : null
}

const serviceShape = (root, found) => {
  const needs = needsARealServiceOf(root, found)
  const candidates = [
    `src/server/${found.kind}/${found.name}/data.json`,
    `src/server/app/${found.kind}/${found.name}/data.json`
  ]
  for (const candidate of candidates) {
    const content = readIfExists(root, candidate)
    if (content !== null) {
      try {
        const data = JSON.parse(content)
        const rows = Array.isArray(data) ? data : (data.results ?? [data])
        return { file: candidate, example: rows[0] ?? null, needs }
      } catch {
        return { file: candidate, example: null, needs }
      }
    }
  }
  return needs ? { file: null, example: null, needs } : null
}

/**
 * The release files changed since `since` (a commit): saved after it, or not
 * saved yet. Null when no `since` was given.
 */
const changedSince = (root, set, since) => {
  if (!since) {
    return null
  }
  const ref = resolveCommit(root, since)
  if (!ref) {
    throw new HandoffError(
      `Cannot find the saved change "${since}". Give a commit id from git log with --since.`
    )
  }
  return new Set(changedInWorkingTree(root, ref, setDirOf(set)))
}

const splitByScope = (changes, { features, all }, since) => {
  if (since) {
    return {
      inScope: changes.filter((change) => since.has(change.releasePath)),
      outOfScope: changes.filter((change) => !since.has(change.releasePath))
    }
  }
  if (all || !features?.length) {
    return { inScope: changes, outOfScope: [] }
  }
  const inScope = []
  const outOfScope = []
  for (const change of changes) {
    if (features.includes(featureOf(change.path))) {
      inScope.push(change)
    } else {
      outOfScope.push(change)
    }
  }
  return { inScope, outOfScope }
}

const pageSlugsOf = (root, setId, feature) => {
  const pageJs = readIfExists(
    root,
    `${setDirOf(setId)}/journeys/linear/features/${feature}/page.js`
  )
  const slugs = pageJs
    ? [...pageJs.matchAll(/slug:\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
    : []
  return slugs.length ? slugs : [feature]
}

const copyRowsFor = (change) => {
  if (!isCopyFile(change.path)) {
    return []
  }
  const language = isWelshCopyFile(change.path) ? 'cy' : 'en'
  const rows = copyChanges(change.before, change.after)
  if (rows === null) {
    return [
      {
        language,
        key: '(could not read the file as data: see the patch)',
        before: null,
        after: null
      }
    ]
  }
  return rows.map((row) => ({ language, ...row }))
}

const groupPages = (root, setId, changes) => {
  const byFeature = new Map()
  for (const change of changes) {
    const feature = featureOf(change.path)
    if (!byFeature.has(feature)) {
      byFeature.set(feature, {
        feature,
        slugs: feature ? pageSlugsOf(root, setId, feature) : [],
        files: [],
        copy: []
      })
    }
    const page = byFeature.get(feature)
    page.files.push({ path: change.path, status: statusOf(change) })
    page.copy.push(...copyRowsFor(change))
  }
  return [...byFeature.values()].sort(
    (a, b) => (a.feature === null) - (b.feature === null)
  )
}

const testFilesOnDisk = (root) =>
  Object.fromEntries(
    [
      ...walk(path.join(root, setDirOf(REAL_JOURNEY))).map(
        (relative) => `${setDirOf(REAL_JOURNEY)}/${relative}`
      ),
      ...walk(path.join(root, 'fit')).map((relative) => `fit/${relative}`)
    ]
      .filter(isTestFile)
      .map((file) => [file, readIfExists(root, file) ?? ''])
  )

const testImpactOf = (root, changes) => {
  const oldStrings = new Set()
  for (const change of changes) {
    if (!isTestFile(change.path) && change.before !== null) {
      removedLiterals(change.before, change.after, {
        template: change.path.endsWith('.njk')
      }).forEach((text) => oldStrings.add(text))
    }
  }
  return findPinnedStrings([...oldStrings], testFilesOnDisk(root))
}

/**
 * What changed in high-risk-plants since the release family was copied: from
 * the recorded `upstreamCommit` (the last plants-frontend commit taken in)
 * when it resolves here, else the copied-from commit.
 */
const driftOf = (root, hops, patchPaths, baseRef) => {
  const upstream = resolveCommit(root, hops.at(-1).info?.upstreamCommit)
  const ref = upstream ?? (baseRef === 'HEAD' ? null : baseRef)
  if (!ref) {
    return { ref: null, overlapping: [], elsewhere: [] }
  }
  const moved = changedBetween(root, ref, 'HEAD', setDirOf(REAL_JOURNEY))
  return {
    ref,
    refKind: upstream ? 'upstreamCommit' : 'copied from',
    overlapping: moved.filter((file) => patchPaths.has(file)),
    elsewhere: moved.filter((file) => !patchPaths.has(file))
  }
}

const recipesUsed = (root, setId, createdIn, extra) => {
  const text = [
    ...subjectsTouching(root, createdIn, setDirOf(setId)),
    ...(extra ?? [])
  ].join('\n')
  return RECIPES.filter((recipe) => text.includes(recipe))
}

/** Why there is nothing to hand over, and what to do about it. */
const nothingToHandOver = (set, allChanges, options) => {
  if (allChanges.length === 0) {
    return `Nothing in ${set} differs from the real journey it was made from, so there is nothing to hand over. If the change you mean is not made yet, make it in ${set} first (for words, the change-the-words skill), save it, then hand it over.`
  }
  const scope = options.since
    ? `since ${options.since}`
    : `in the features you named (${options.features.join(', ')})`
  return `${set} changes ${allChanges.length} file(s), but none ${scope}. Check the name, or leave the option out to hand over everything.`
}

const checkTargetFiles = (root, changes, ref) =>
  Object.fromEntries(
    changes.map((change) => [change.path, showFile(root, ref, change.path)])
  )

/**
 * Builds the hand-off report for a set. Options:
 * `{ root, set, features, all, base, from, gapsFrom, recipes }`.
 * Throws HandoffError with a plain reason when it cannot.
 */
export const buildHandoff = (options) => {
  const { root, set } = options
  if (!set) {
    throw new HandoffError('Say which design release to hand over: --set <id>.')
  }
  const realMode = set === REAL_JOURNEY
  const hops = realMode ? [] : resolveChain(root, set, options.from)
  const uuidMaps = hops.map((hop) => uuidMapForHop(root, hop))
  hops.forEach((hop, index) => {
    hop.uuidMap = uuidMaps[index].map
  })
  const { changes: allChanges, baseRef } = realMode
    ? realJourneyChanges(root, options.base ?? 'main')
    : releaseChanges(root, set, hops)

  const since = changedSince(root, set, options.since)
  const { inScope, outOfScope } = splitByScope(allChanges, options, since)
  if (inScope.length === 0) {
    throw new HandoffError(nothingToHandOver(set, allChanges, options))
  }
  const services = []
  const shippable = []
  const needsService = []
  for (const change of inScope) {
    const found = change.after
      ? findPrototypeImports(change.releasePath, change.after)
      : []
    if (found.length) {
      needsService.push(change)
      found.forEach((item) =>
        services.push({ ...item, shape: serviceShape(root, item) })
      )
    } else {
      shippable.push(change)
    }
  }

  const patch = buildPatch(shippable)
  const applyRef = realMode ? baseRef : 'HEAD'
  const applyCheck = checkPatchApplies(
    patch,
    checkTargetFiles(root, shippable, applyRef)
  )
  const gapsSet = realMode ? options.gapsFrom : set
  const patchPaths = new Set(shippable.map((change) => change.path))

  return {
    set,
    mode: realMode ? 'real-journey' : 'release',
    chain: hops.map(({ releaseId, fromId, createdIn }, index) => ({
      releaseId,
      fromId,
      createdIn,
      uuidSource: uuidMaps[index].source,
      unpairedFiles: uuidMaps[index].unpaired
    })),
    release: hops[0]?.info ?? null,
    baseRef,
    applyRef,
    files: shippable.map((change) => ({
      path: change.path,
      releasePath: change.releasePath,
      status: statusOf(change)
    })),
    leftOut: [
      ...outOfScope.map((change) => ({
        path: change.releasePath,
        reason: since
          ? `Not changed since ${options.since}.`
          : 'Not in the features you chose to hand over.'
      })),
      ...needsService.map((change) => ({
        path: change.releasePath,
        reason:
          'Uses a service that only exists in the prototype. The real team needs to build or connect a real one first.'
      }))
    ],
    pages: groupPages(root, set, shippable),
    patch,
    applyCheck,
    drift: realMode
      ? { ref: null, overlapping: [], elsewhere: [] }
      : driftOf(root, hops, patchPaths, baseRef),
    testImpact: testImpactOf(root, shippable),
    cannotShip: {
      services,
      welshNeeded: shippable
        .filter((change) => change.after && isWelshCopyFile(change.path))
        .flatMap((change) => findWelshMarkers(change.path, change.after)),
      designGaps: gapsSet
        ? parseDesignGaps(
            readIfExists(root, `${setDirOf(gapsSet)}/design-gaps.md`)
          )
        : [],
      researchRules: gapsSet
        ? parseResearchRules(
            readIfExists(root, `${setDirOf(gapsSet)}/research-mode.md`)
          )
        : []
    },
    recipes: recipesUsed(root, set, hops[0]?.createdIn ?? null, options.recipes)
  }
}
