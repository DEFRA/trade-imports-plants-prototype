/**
 * The git calls the hand-off needs: reading files at a commit, and building
 * and checking a patch in a throwaway repository under the system temp
 * folder. Every call is `execFileSync` with an argument array, never a shell
 * string.
 *
 * Every call runs with the `GIT_*` variables removed from the environment.
 * The pre-commit hook runs the unit tests, and inside a hook git sets
 * `GIT_INDEX_FILE` and friends: left in place they would point the scratch
 * repositories at the prototype's own index.
 */
import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

const MAX_BUFFER = 256 * 1024 * 1024

const cleanEnv = () =>
  Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))
  )

export const git = (args, { cwd, input } = {}) =>
  execFileSync('git', args, {
    cwd,
    input,
    encoding: 'utf8',
    env: cleanEnv(),
    maxBuffer: MAX_BUFFER,
    stdio: ['pipe', 'pipe', 'pipe']
  })

export const gitOrNull = (args, options) => {
  try {
    return git(args, options)
  } catch {
    return null
  }
}

const lines = (output) =>
  (output ?? '').split('\n').filter((line) => line.trim() !== '')

/** A file's content at a commit, or null when it did not exist there. */
export const showFile = (root, ref, filePath) =>
  gitOrNull(['show', `${ref}:${filePath}`], { cwd: root })

/** Every file under `dir` at `ref`, repo-relative. */
export const filesAt = (root, ref, dir) =>
  lines(
    gitOrNull(['ls-tree', '-r', '--name-only', ref, '--', dir], { cwd: root })
  )

/** Files under `dir` at `ref` whose content matches the extended regex. */
export const filesMatchingAt = (root, ref, pattern, dir) =>
  lines(
    gitOrNull(['grep', '-l', '-i', '-E', pattern, ref, '--', dir], {
      cwd: root
    })
  ).map((entry) => entry.slice(ref.length + 1))

/** The full id of `ref`, or null when it does not resolve. */
export const resolveCommit = (root, ref) =>
  ref
    ? (gitOrNull(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], {
        cwd: root
      })?.trim() ?? null)
    : null

/** The most recent commit that added `filePath`, or null (never committed). */
export const commitThatAdded = (root, filePath) =>
  lines(
    gitOrNull(['log', '--diff-filter=A', '--format=%H', '--', filePath], {
      cwd: root
    })
  )[0] ?? null

/** Paths under `dir` that differ between `fromRef` and `toRef`. */
export const changedBetween = (root, fromRef, toRef, dir) =>
  lines(
    gitOrNull(['diff', '--name-only', fromRef, toRef, '--', dir], {
      cwd: root
    })
  )

/** Tracked paths under `dir` that differ from `ref` in the working tree,
 * plus untracked ones. */
export const changedInWorkingTree = (root, ref, dir) => [
  ...new Set([
    ...lines(gitOrNull(['diff', '--name-only', ref, '--', dir], { cwd: root })),
    ...lines(
      gitOrNull(['ls-files', '--others', '--exclude-standard', '--', dir], {
        cwd: root
      })
    )
  ])
]

/** Subjects of the commits that touched `dir` after `sinceRef` (or all). */
export const subjectsTouching = (root, sinceRef, dir) =>
  lines(
    gitOrNull(
      [
        'log',
        '--format=%s',
        sinceRef ? `${sinceRef}^..HEAD` : 'HEAD',
        '--',
        dir
      ],
      { cwd: root }
    ) ?? gitOrNull(['log', '--format=%s', 'HEAD', '--', dir], { cwd: root })
  )

const writeTree = (dir, files) => {
  for (const [filePath, content] of Object.entries(files)) {
    const target = path.join(dir, filePath)
    if (content === null) {
      rmSync(target, { force: true })
    } else {
      mkdirSync(path.dirname(target), { recursive: true })
      writeFileSync(target, content)
    }
  }
}

const withScratchRepo = (work) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'designer-handoff-'))
  try {
    git(['init', '-q'], { cwd: dir })
    return work(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const snapshot = (dir) => {
  git(['add', '-A'], { cwd: dir })
  return git(['write-tree'], { cwd: dir }).trim()
}

/**
 * A unified diff, in `git apply` format, from each change's `before` to its
 * `after` (null means the file does not exist on that side). Paths are
 * written exactly as given, so they must already be the real service's
 * paths. Returns '' when nothing differs.
 */
export const buildPatch = (changes) =>
  withScratchRepo((dir) => {
    const before = {}
    const after = {}
    for (const change of changes) {
      if (change.before !== null) {
        before[change.path] = change.before
      }
      after[change.path] = change.after
    }
    writeTree(dir, before)
    const baseTree = snapshot(dir)
    writeTree(dir, after)
    const changedTree = snapshot(dir)
    return git(
      [
        '-c',
        'core.quotepath=false',
        'diff',
        '--no-color',
        '--no-renames',
        '--no-ext-diff',
        baseTree,
        changedTree
      ],
      { cwd: dir }
    )
  })

/**
 * Checks a patch applies cleanly to the given files (path to content), the
 * way a developer would apply it in a plants-frontend clone. Nothing is
 * changed: `git apply --check` only reports.
 */
export const checkPatchApplies = (patch, files) => {
  if (patch.trim() === '') {
    return { ok: true, empty: true, message: 'There is nothing to apply.' }
  }
  return withScratchRepo((dir) => {
    writeTree(
      dir,
      Object.fromEntries(
        Object.entries(files).filter(([, content]) => content !== null)
      )
    )
    const patchFile = path.join(dir, '.handoff.patch')
    writeFileSync(patchFile, patch)
    try {
      git(['apply', '--check', patchFile], { cwd: dir })
      return { ok: true, empty: false, message: 'The patch applies cleanly.' }
    } catch (error) {
      return {
        ok: false,
        empty: false,
        message: String(error.stderr || error.message).trim()
      }
    } finally {
      unlinkSync(patchFile)
    }
  })
}
