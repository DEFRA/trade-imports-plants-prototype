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
 *
 * Either mode can be brief only (`briefOnly`): the story, pages, services and
 * checks are worked out, but there is no patch. A release made from the
 * sample-journey placeholder is always brief only: it has no real page to
 * patch.
 *
 * A page that imports a prototype-owned service
 * (`src/server/app/services/<name>/`, its own `ours` line in overrides.json)
 * stays in the patch, and the service's `index.js` and `client.js` travel with
 * it as proposed files.
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
  messagesTouching,
  resolveCommit,
  showFile
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
  findPrototypeServiceImports,
  findWelshMarkers,
  isTestFile,
  ownedServicesFrom,
  parseDesignGaps,
  parseResearchRules,
  relativeImportsOf,
  removedLiterals
} from './impact.js'
import { copyChanges, isCopyFile, isWelshCopyFile } from './copy-table.js'
import { describeService } from './contract.js'
import { gateChangesOf, validationRowsFor } from './flow.js'
import { specCapabilitiesFor } from './story.js'

export const REAL_JOURNEY = 'high-risk-plants'
export const PLACEHOLDER = 'sample-journey'
export const SETS_DIR = 'src/server/app/sets'
const MAX_CHAIN = 10
/** The real service's main branch, once `git fetch upstream` has run. */
const UPSTREAM_MAIN = 'upstream/main'
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
 * `release.json`. A chain that ends at the sample-journey placeholder stops
 * there: its last step's `fromId` is `sample-journey`, and the hand-off is
 * brief only.
 */
export const resolveChain = (root, setId, fromOverride) => {
  const hops = []
  let current = setId
  while (current !== REAL_JOURNEY && current !== PLACEHOLDER) {
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

/** Scaffolding `new:set` writes; it says nothing about the design. */
const SCAFFOLDING = /^(set\.js|journeys\/linear\/config\.js)$/

/**
 * A release made from the sample-journey placeholder has no real page to
 * compare with, so every file it has is new.
 */
const placeholderChanges = (root, setId) => {
  const dir = setDirOf(setId)
  const changes = walk(path.join(root, dir))
    .filter((relative) => !isPrototypeOnly(relative))
    .filter((relative) => !SCAFFOLDING.test(relative))
    .map((relative) => ({
      path: `${dir}/${relative}`,
      releasePath: `${dir}/${relative}`,
      before: null,
      after: readIfExists(root, `${dir}/${relative}`)
    }))
  return { changes, baseRef: null }
}

const statusOf = (change) => {
  if (change.before === null) {
    return 'added'
  }
  return change.after === null ? 'deleted' : 'changed'
}

/** overrides.json as data, or null when it is missing or unreadable. */
const readOverrides = (root) => {
  try {
    return JSON.parse(readIfExists(root, 'overrides.json') ?? 'null')
  } catch {
    return null
  }
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

const oldStringsOf = (changes) => {
  const oldStrings = new Set()
  for (const change of changes) {
    if (!isTestFile(change.path) && change.before !== null) {
      removedLiterals(change.before, change.after, {
        template: change.path.endsWith('.njk')
      }).forEach((text) => oldStrings.add(text))
    }
  }
  return [...oldStrings]
}

const testImpactOf = (root, changes) =>
  findPinnedStrings(oldStringsOf(changes), testFilesOnDisk(root))

/** The trade-imports workspace's behaviour spec for plants, as the workspace
 * lays it out (`repos/<this repo>` beside `openspec/`). */
export const WORKSPACE_PLANTS_SPEC = 'openspec/specs/plants'

/** Where the workspace's plants behaviour spec is on this computer, or null
 * when the prototype was cloned on its own. */
export const workspaceSpecDir = (root, override) => {
  const dir = override ?? path.resolve(root, '../..', WORKSPACE_PLANTS_SPEC)
  return existsSync(dir) ? dir : null
}

/** The real journey's requirement files (`spec/`): the journey spec, the
 * decisions, the panel rulings and the backlog extras. Then, when the
 * workspace is there, its plants behaviour spec (`spec.md` files), named by
 * their workspace path. */
const specFilesOnDisk = (root, openspecDir) => ({
  ...Object.fromEntries(
    walk(path.join(root, setDirOf(REAL_JOURNEY), 'spec')).map((relative) => {
      const file = `${setDirOf(REAL_JOURNEY)}/spec/${relative}`
      return [file, readIfExists(root, file) ?? '']
    })
  ),
  ...(openspecDir
    ? Object.fromEntries(
        walk(openspecDir)
          .filter((relative) => relative.endsWith('.md'))
          .map((relative) => [
            `${WORKSPACE_PLANTS_SPEC}/${relative}`,
            readFileSync(path.join(openspecDir, relative), 'utf8')
          ])
      )
    : {})
})

/**
 * Lines of the real journey's requirement files, and of the workspace's
 * plants behaviour spec, that still quote the old words: the real team
 * updates them with the patch, or the spec and the page disagree.
 */
const specImpactOf = (root, changes, openspecDir) =>
  findPinnedStrings(oldStringsOf(changes), specFilesOnDisk(root, openspecDir))

/**
 * Takes out of `shippable` every file that imports a left-out file, and every
 * file that imports one of those, and so on: shipped alone they would point
 * at a module the real service does not have, and it would not start.
 *
 * @returns {Map<string, string>} each file moved, with the left-out file it
 * imports.
 */
const leaveOutDependents = (shippable, needsService) => {
  const leftOut = new Set(needsService.map((change) => change.path))
  const dependents = new Map()
  let moved = true
  while (moved) {
    moved = false
    for (const change of [...shippable]) {
      const hit = change.after
        ? relativeImportsOf(change.path, change.after).find((file) =>
            leftOut.has(file)
          )
        : undefined
      if (hit) {
        shippable.splice(shippable.indexOf(change), 1)
        needsService.push(change)
        leftOut.add(change.path)
        dependents.set(change.path, hit)
        moved = true
      }
    }
  }
  return dependents
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
    ...messagesTouching(root, createdIn, setDirOf(setId)),
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

/**
 * What each patched file looks like where the patch is checked. A proposed
 * service file is new to plants-frontend, so the check against the
 * prototype's own copy leaves it out (the prototype has it already); the
 * check against plants-frontend reads it from there, so a service the real
 * team has since built shows up as a clash.
 */
const checkTargetFiles = (
  root,
  changes,
  ref,
  { proposedFromRef = false } = {}
) =>
  Object.fromEntries(
    changes.map((change) => [
      change.path,
      change.proposed && !proposedFromRef
        ? null
        : showFile(root, ref, change.path)
    ])
  )

const JS_SOURCE = /\.js$/
const NOT_SOURCE = /(\.test\.js|\.fit\.spec\.js|\/copy\/copy\.(en|cy)\.js)$/

/** One row per validation rule on each changed page, read from the set on
 * disk: the page's code, its English copy and its Welsh copy. */
const validationOf = (root, setId, pages) =>
  pages
    .filter((page) => page.feature)
    .flatMap((page) => {
      const dir = `${setDirOf(setId)}/journeys/linear/features/${page.feature}`
      const sources = walk(path.join(root, dir))
        .map((relative) => `${dir}/${relative}`)
        .filter((file) => JS_SOURCE.test(file) && !NOT_SOURCE.test(file))
        .map((file) => readIfExists(root, file) ?? '')
      return validationRowsFor({
        page: page.feature,
        sources,
        en: readIfExists(root, `${dir}/copy/copy.en.js`),
        cy: readIfExists(root, `${dir}/copy/copy.cy.js`)
      })
    })

/**
 * Sorts the changes in scope: files that import prototype-only code
 * (prototype-data or prototype-support) cannot ship; everything else can,
 * including pages that use a prototype-owned service, which is noted so its
 * proposed files travel with them.
 */
const sortChanges = (inScope, owned) => {
  const prototypeOnly = []
  const shippable = []
  const needsService = []
  const serviceUsers = new Map()
  for (const change of inScope) {
    const found = change.after
      ? findPrototypeImports(change.releasePath, change.after)
      : []
    if (found.length) {
      needsService.push(change)
      prototypeOnly.push(...found)
    } else {
      shippable.push(change)
    }
    const uses = change.after
      ? findPrototypeServiceImports(change.releasePath, change.after, owned)
      : []
    for (const use of uses) {
      serviceUsers.set(use.name, [
        ...(serviceUsers.get(use.name) ?? []),
        change.path
      ])
    }
  }
  return { prototypeOnly, shippable, needsService, serviceUsers }
}

const proposedChangesOf = (services) =>
  services.flatMap((service) =>
    service.proposed.map((file) => ({
      path: file.path,
      releasePath: file.path,
      before: null,
      after: file.after,
      proposed: true
    }))
  )

const withoutFileContents = ({ proposed, ...service }) => ({
  ...service,
  proposedFiles: proposed.map((file) => file.path)
})

const BRIEF_ONLY_REASONS = {
  placeholder:
    'It was made from the sample-journey placeholder, not the real journey, so there is no real page to patch.',
  asked:
    'Brief only, as asked: the story, pictures and services, with no patch.'
}

/**
 * The patch and both checks: against the real journey as the prototype has
 * it, and against plants-frontend's `upstream/main` when it has been fetched.
 * Brief only: no patch and nothing to check.
 */
const patchAndChecks = (root, patchChanges, applyRef, briefOnly) => {
  if (briefOnly) {
    return {
      patch: '',
      applyCheck: {
        ok: true,
        empty: true,
        briefOnly: true,
        message: 'Brief only: there is no patch.'
      },
      upstreamApplyCheck: null
    }
  }
  const patch = buildPatch(patchChanges)
  const applyCheck = checkPatchApplies(
    patch,
    checkTargetFiles(root, patchChanges, applyRef)
  )
  const upstreamRef = resolveCommit(root, UPSTREAM_MAIN)
  const upstreamApplyCheck = upstreamRef
    ? {
        ref: UPSTREAM_MAIN,
        ...checkPatchApplies(
          patch,
          checkTargetFiles(root, patchChanges, upstreamRef, {
            proposedFromRef: true
          })
        )
      }
    : null
  return { patch, applyCheck, upstreamApplyCheck }
}

/**
 * Builds the hand-off report for a set. Options:
 * `{ root, set, features, all, base, from, gapsFrom, recipes, briefOnly,
 * openspecDir }`. Throws HandoffError with a plain reason when it cannot.
 */
export const buildHandoff = (options) => {
  const { root, set } = options
  if (!set) {
    throw new HandoffError('Say which design release to hand over: --set <id>.')
  }
  const realMode = set === REAL_JOURNEY
  const hops = realMode ? [] : resolveChain(root, set, options.from)
  const placeholder = set === PLACEHOLDER || hops.at(-1)?.fromId === PLACEHOLDER
  const briefOnly = placeholder || Boolean(options.briefOnly)
  const uuidMaps = hops.map((hop) =>
    placeholder
      ? { map: {}, unpaired: [], source: 'none (made from the placeholder)' }
      : uuidMapForHop(root, hop)
  )
  hops.forEach((hop, index) => {
    hop.uuidMap = uuidMaps[index].map
  })
  let found
  if (placeholder) {
    found = placeholderChanges(root, set)
  } else if (realMode) {
    found = realJourneyChanges(root, options.base ?? 'main')
  } else {
    found = releaseChanges(root, set, hops)
  }
  const { changes: allChanges, baseRef } = found

  const since = changedSince(root, set, options.since)
  const { inScope, outOfScope } = splitByScope(allChanges, options, since)
  if (inScope.length === 0) {
    throw new HandoffError(nothingToHandOver(set, allChanges, options))
  }
  const owned = ownedServicesFrom(readOverrides(root))
  const { prototypeOnly, shippable, needsService, serviceUsers } = sortChanges(
    inScope,
    owned
  )
  const dependents = leaveOutDependents(shippable, needsService)
  const services = [...serviceUsers.keys()]
    .sort()
    .map((name) =>
      describeService(
        name,
        (filePath) => readIfExists(root, filePath),
        serviceUsers.get(name)
      )
    )
  const patchChanges = [
    ...shippable,
    ...(briefOnly ? [] : proposedChangesOf(services))
  ]

  const applyRef = realMode ? baseRef : 'HEAD'
  const { patch, applyCheck, upstreamApplyCheck } = patchAndChecks(
    root,
    patchChanges,
    applyRef,
    briefOnly
  )
  const gapsSet = realMode ? options.gapsFrom : set
  const patchPaths = new Set(patchChanges.map((change) => change.path))
  const pages = groupPages(root, set, shippable)
  const openspecDir = workspaceSpecDir(root, options.openspecDir)

  return {
    set,
    mode: realMode ? 'real-journey' : 'release',
    placeholder,
    briefOnly: briefOnly
      ? {
          reason: placeholder
            ? BRIEF_ONLY_REASONS.placeholder
            : BRIEF_ONLY_REASONS.asked
        }
      : null,
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
    files: (briefOnly ? [] : patchChanges).map((change) => ({
      path: change.path,
      releasePath: change.releasePath,
      status: statusOf(change),
      ...(change.proposed ? { proposed: true } : {})
    })),
    servicesToBuild: services.map(withoutFileContents),
    gateChanges: placeholder ? [] : gateChangesOf(shippable),
    validation: validationOf(root, set, pages),
    specSources: { workspace: openspecDir !== null },
    specCapabilities: openspecDir
      ? specCapabilitiesFor(pages, (relative) =>
          existsSync(path.join(openspecDir, relative))
        )
      : [],
    leftOut: [
      ...outOfScope.map((change) => ({
        path: change.releasePath,
        reason: since
          ? `Not changed since ${options.since}.`
          : 'Not in the features you chose to hand over.'
      })),
      ...needsService.map((change) => ({
        path: change.releasePath,
        reason: dependents.has(change.path)
          ? `Imports ${dependents.get(change.path)}, which is left out because it uses code that only exists in the prototype. Shipped without it, the real service would not start.`
          : 'Uses code that only exists in the prototype (its example data or its stub plumbing). The real team needs a real source for that data first.'
      }))
    ],
    pages,
    patch,
    applyCheck,
    upstreamApplyCheck,
    wordsOnly:
      !placeholder &&
      shippable.length > 0 &&
      shippable.every((change) => isCopyFile(change.path)),
    drift:
      realMode || placeholder
        ? { ref: null, overlapping: [], elsewhere: [] }
        : driftOf(root, hops, patchPaths, baseRef),
    testImpact: testImpactOf(root, shippable),
    specImpact: specImpactOf(root, shippable, openspecDir),
    cannotShip: {
      services: prototypeOnly,
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
