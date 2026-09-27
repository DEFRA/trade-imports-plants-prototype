import { readFileSync } from 'node:fs'
import path from 'node:path'
import { UUID_PATTERN, renameSetId } from '../../new-set/transform.js'
import { git, runGit, uncommittedChanges } from './git.js'
import {
  HAND_OFF_LINE,
  ReleaseRefused,
  existingSet,
  refuseNonRelease,
  relativePathsOf
} from './sets.js'

const NO_BLOB = /^0+$/
const DIFF_HEADER = /^diff --git /m
const INDEX_LINE = /^index ([0-9a-f]+)\.\.([0-9a-f]+)/m
const NEW_PATH = /^\+\+\+ b\/(.+)$/m

const rootOf = ({ setId, record }) => record?.root ?? setId

/**
 * How an obligation id in the source release becomes the matching id in the
 * target, through each release's `uuidMap` (keyed by their shared root's
 * ids). An id neither map knows is left as it is.
 *
 * @returns {(uuid: string) => string}
 */
export const uuidTranslation = (source, target) => {
  if (rootOf(source) !== rootOf(target)) {
    throw new ReleaseRefused(
      `"${source.setId}" was made from ${rootOf(source)} and "${target.setId}" from ${rootOf(target)}, so a change cannot be carried between them.`
    )
  }
  const sourceIsRoot = rootOf(source) === source.setId
  const toRoot = new Map(
    Object.entries(source.record?.uuidMap ?? {}).map(([rootId, id]) => [
      id,
      rootId
    ])
  )
  const fromRoot = new Map(Object.entries(target.record?.uuidMap ?? {}))
  return (uuid) => {
    const key = uuid.toLowerCase()
    const rootId = sourceIsRoot ? key : toRoot.get(key)
    return (rootId && fromRoot.get(rootId)) ?? uuid
  }
}

/** Text from the source release rewritten for the target: its id in every
 * shape, and its obligation ids. */
export const rewriteForTarget = (text, { fromId, toId, translate }) =>
  renameSetId(text, { fromId, newId: toId }).replace(UUID_PATTERN, translate)

/** A patch split into one block per file, each starting `diff --git`. */
export const splitPatch = (patch) =>
  patch
    .split(DIFF_HEADER)
    .slice(1)
    .map((block) => `diff --git ${block}`)

const changeFromCommit = (repoRoot, commit, paths) => {
  if (
    runGit(repoRoot, ['rev-parse', '--verify', `${commit}^{commit}`]).status
  ) {
    throw new ReleaseRefused(`"${commit}" is not a saved change in this repo.`)
  }
  return git(repoRoot, [
    'diff',
    '--full-index',
    `${commit}^`,
    commit,
    '--',
    ...paths
  ])
}

const changeFromWorkingTree = (repoRoot, paths) => {
  const tracked = git(repoRoot, [
    'diff',
    '--full-index',
    'HEAD',
    '--',
    ...paths
  ])
  const untracked = git(repoRoot, [
    'ls-files',
    '--others',
    '--exclude-standard',
    '--',
    ...paths
  ])
    .split('\n')
    .filter(Boolean)
    .map(
      (file) =>
        runGit(repoRoot, [
          'diff',
          '--no-index',
          '--full-index',
          '--',
          '/dev/null',
          file
        ]).stdout
    )
  return [tracked, ...untracked].join('')
}

/**
 * The block rewritten for the target, with its `index` line pointing at the
 * rewritten versions of the files it was made against, written into git's
 * object store so `git apply --3way` can merge when it does not apply as it
 * stands.
 */
const rewriteBlock = (repoRoot, block, { rewrite, mode }) => {
  const [, before, after] = block.match(INDEX_LINE) ?? []
  const sourcePath = block.match(NEW_PATH)?.[1]
  const store = (content) =>
    git(repoRoot, ['hash-object', '-w', '--stdin'], {
      input: rewrite(content)
    }).trim()
  const contentOf = (blob, useWorkingTree) =>
    useWorkingTree
      ? readFileSync(path.join(repoRoot, sourcePath), 'utf8')
      : git(repoRoot, ['cat-file', '-p', blob])

  const rewritten = rewrite(block)
  if (!before) {
    return rewritten
  }
  const newBefore = NO_BLOB.test(before) ? before : store(contentOf(before))
  const newAfter = NO_BLOB.test(after)
    ? after
    : store(contentOf(after, mode === 'working'))
  return rewritten.replace(INDEX_LINE, `index ${newBefore}..${newAfter}`)
}

const changedFilesOf = (patch) =>
  splitPatch(patch).map(
    (block) => block.match(NEW_PATH)?.[1] ?? block.split('\n')[0]
  )

const applyPatch = (repoRoot, patch) => {
  if (
    runGit(repoRoot, ['apply', '--check', '-'], { input: patch }).status === 0
  ) {
    git(repoRoot, ['apply', '-'], { input: patch })
    return { how: 'clean', conflicts: [] }
  }
  const merged = runGit(repoRoot, ['apply', '--3way', '-'], { input: patch })
  const conflicts = git(repoRoot, ['diff', '--name-only', '--diff-filter=U'])
    .split('\n')
    .filter(Boolean)
  if (merged.status === 0 && conflicts.length === 0) {
    return { how: 'three-way', conflicts }
  }
  return {
    how: 'conflicts',
    conflicts,
    message: merged.stderr.trim()
  }
}

/**
 * Carries one change made in one design release into another: the change
 * inside `sets/<from>/` (a saved commit, or what is not saved yet) is
 * rewritten for `<to>` — its id, and its obligation ids through both
 * releases' `uuidMap`s — and applied with `git apply`, falling back to
 * `git apply --3way`.
 *
 * Refuses a frozen target and the real journey.
 *
 * @returns {{ files: string[], how: 'clean' | 'three-way' | 'conflicts', conflicts: string[], message?: string, mode: 'commit' | 'working' }}
 */
export const carryChange = ({ from, to, commit, working, repoRoot }) => {
  if (!from || !to) {
    throw new ReleaseRefused(
      'Say which release to carry from and to: carry --from <release> --to <release>.'
    )
  }
  if (from === to) {
    throw new ReleaseRefused('The two releases are the same.')
  }
  if (to === 'high-risk-plants') {
    throw new ReleaseRefused(
      `Changes are never carried into high-risk-plants: it is the real journey. ${HAND_OFF_LINE}`
    )
  }
  refuseNonRelease(to, 'carry a change into')
  const source = existingSet(repoRoot, from)
  const target = existingSet(repoRoot, to)
  if (target.record?.frozen) {
    throw new ReleaseRefused(
      `"${to}" is frozen, so nothing can be added to it. Carry the change into a working release instead, or make one from it: npm run designer:release -- freeze ${to} --as <new-id>.`
    )
  }

  const sourcePaths = relativePathsOf(from)
  const mode = commit ? 'commit' : 'working'
  if (
    !commit &&
    !working &&
    uncommittedChanges(repoRoot, sourcePaths).length === 0
  ) {
    throw new ReleaseRefused(
      `"${from}" has no changes that are not saved. Say which saved change to carry: --commit <commit id>.`
    )
  }
  const change =
    mode === 'commit'
      ? changeFromCommit(repoRoot, commit, sourcePaths)
      : changeFromWorkingTree(repoRoot, sourcePaths)
  if (change.trim() === '') {
    throw new ReleaseRefused(
      `There is no change inside "${from}" to carry${commit ? ` in ${commit}` : ''}.`
    )
  }

  const translate = uuidTranslation(source, target)
  const rewrite = (text) =>
    rewriteForTarget(text, { fromId: from, toId: to, translate })
  const patch = splitPatch(change)
    .map((block) => rewriteBlock(repoRoot, block, { rewrite, mode }))
    .join('')

  return { mode, files: changedFilesOf(patch), ...applyPatch(repoRoot, patch) }
}
