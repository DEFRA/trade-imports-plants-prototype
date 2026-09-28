/**
 * Thin git layer for the upstream sync. Every function here shells out to a
 * single git (or gh) invocation and returns plain data - the decisions about
 * what to do with that data live in sync.js and rules.js.
 */
import { execFileSync } from 'node:child_process'
import process from 'node:process'

const UPSTREAM_URL =
  'https://github.com/DEFRA/trade-imports-plants-frontend.git'
const UPSTREAM_REMOTE = 'upstream'

// The sync script may be invoked from any working directory (the workflow
// runs it from the checkout root, but nothing enforces that) - every git and
// gh call below runs against this directory once setRepoRoot has named it.
let repoRoot = process.cwd()

export const setRepoRoot = (root) => {
  repoRoot = root
}

// Without the GIT_* variables a hook exports (GIT_INDEX_FILE and the like),
// so a call always acts on the repo in `cwd`, even from a test run by a hook.
const gitEnv = () =>
  Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))
  )

const git = (args, options = {}) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    cwd: repoRoot,
    env: gitEnv(),
    ...options
  }).trim()

const gh = (args, options = {}) =>
  execFileSync('gh', args, {
    encoding: 'utf8',
    cwd: repoRoot,
    ...options
  }).trim()

const gitLines = (args, options = {}) => {
  const output = git(args, options)
  return output === '' ? [] : output.split('\n')
}

export const remoteNames = () => gitLines(['remote'])

export const ensureUpstreamRemote = () => {
  if (remoteNames().includes(UPSTREAM_REMOTE)) {
    return
  }
  git(['remote', 'add', UPSTREAM_REMOTE, UPSTREAM_URL])
  git(['remote', 'set-url', '--push', UPSTREAM_REMOTE, 'DISABLED'])
}

export const fetchUpstreamMain = () =>
  git(['fetch', UPSTREAM_REMOTE, 'main', '--no-tags'])

export const currentBranch = () => git(['rev-parse', '--abbrev-ref', 'HEAD'])

export const upstreamAlreadyMerged = () => {
  try {
    git(['merge-base', '--is-ancestor', 'upstream/main', 'HEAD'])
    return true
  } catch {
    return false
  }
}

export const createSyncBranch = (branchName) => {
  git(['switch', '-c', branchName, 'main'])
  return branchName
}

const STATUS_CODE_LENGTH = 2

export const statusPorcelain = () =>
  gitLines(['status', '--porcelain=v1']).map((line) => ({
    code: line.slice(0, STATUS_CODE_LENGTH),
    path: line.slice(STATUS_CODE_LENGTH + 1)
  }))

export const isUnmerged = (code) =>
  ['UU', 'AA', 'DD', 'AU', 'UA', 'UD', 'DU'].includes(code)

/**
 * Merges upstream/main without committing. `git merge` exits non-zero both
 * for a real conflict and for a merge that could not run at all (unrelated
 * histories, a dirty working tree, network failure...) - only the former is
 * a normal outcome here, so a failed merge with nothing left unmerged in the
 * index is a bug to surface, not a conflict to carry on from.
 */
export const mergeUpstream = () => {
  try {
    git(['merge', '--no-commit', '--no-ff', 'upstream/main'])
    return { conflicted: false }
  } catch (error) {
    if (statusPorcelain().some(({ code }) => isUnmerged(code))) {
      return { conflicted: true }
    }
    throw error
  }
}

export const removePath = (path) =>
  git(['rm', '-f', '-q', '--ignore-unmatch', '--', path])

/** Whether our last commit has the path. */
export const existsInHead = (path) => {
  try {
    git(['cat-file', '-e', `HEAD:${path}`], {
      stdio: ['ignore', 'pipe', 'pipe']
    })
    return true
  } catch {
    return false
  }
}

/**
 * Puts our side of a path back: our side of a conflict, or our committed
 * file. A path our commit does not have (added only upstream) has no side of
 * ours to put back, so it is removed instead: `git checkout HEAD` would fail
 * on it and stop the sync.
 */
export const restoreOurs = (path, { conflicted }) => {
  if (!conflicted && !existsInHead(path)) {
    removePath(path)
    return
  }
  git(['checkout', conflicted ? '--ours' : 'HEAD', '--', path])
  git(['add', path])
}

export const stageAll = () => git(['add', '-A'])

// --no-verify: this commit only records the merge (clean, or deliberately
// left with conflict markers for a person to resolve) - the repo's own
// pre-commit hook runs format/lint/test against working-tree content and has
// no way to pass on a file that is still mid-conflict. The sync's own checks
// step runs those same gates right after and reports them in the summary.
export const commit = (message) => git(['commit', '--no-verify', '-m', message])

export const mergedCommitLog = () =>
  gitLines(['log', '--format=%h %s', 'HEAD..upstream/main']).map((line) => {
    const [hash, ...subjectParts] = line.split(' ')
    return { hash, subject: subjectParts.join(' ') }
  })

export const pushBranch = (branchName) =>
  git(['push', '--set-upstream', 'origin', branchName])

export const ensureLabel = (name, { color, description }) => {
  try {
    gh(['label', 'view', name])
  } catch {
    gh([
      'label',
      'create',
      name,
      '--color',
      color,
      '--description',
      description
    ])
  }
}

export const createPullRequest = ({
  title,
  bodyFile,
  draft,
  label,
  branch
}) => {
  const args = [
    'pr',
    'create',
    '--title',
    title,
    '--body-file',
    bodyFile,
    '--head',
    branch
  ]
  if (label) {
    args.push('--label', label)
  }
  if (draft) {
    args.push('--draft')
  }
  return gh(args)
}
