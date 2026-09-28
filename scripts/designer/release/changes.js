import { git } from './git.js'

const FIELD = '\u001f'
const MAX_CHANGES = 30
const DESIGNER_BRANCH = /^(?:remotes\/origin\/)?design\//

const BRANCH_PREFERENCE = [
  (branch) => DESIGNER_BRANCH.test(branch),
  (branch) => !branch.startsWith('remotes/'),
  () => true
]

const branchesContaining = (repoRoot, sha) =>
  git(repoRoot, [
    'branch',
    '--all',
    '--format=%(refname:short)',
    '--contains',
    sha
  ])
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.endsWith('/HEAD'))

/** The one branch to name for a commit: a design/ branch first. */
const bestBranch = (branches) => {
  for (const prefers of BRANCH_PREFERENCE) {
    const found = branches.find(prefers)
    if (found) {
      return found
    }
  }
  return null
}

const isSetUp = (subject) =>
  /^(?:Start|Freeze|Retire) design release /.test(subject)

/**
 * The saved changes to one release on every branch, newest first: each
 * commit's id, date, the branch that holds it (a design/ branch when there
 * is one) and its message. Commits with the same message are marked, and the
 * newest of them on a design/ branch is the one to pick.
 *
 * @returns {{ sha: string, date: string, branch: string|null,
 *   branches: string[], subject: string, setUp: boolean,
 *   sameMessage: number, pick: boolean }[]}
 */
export const releaseChanges = (setId, { repoRoot }) => {
  const lines = git(repoRoot, [
    'log',
    '--all',
    `-${MAX_CHANGES}`,
    `--format=%h${FIELD}%cI${FIELD}%s`,
    '--',
    `src/server/app/sets/${setId}`
  ])
    .split('\n')
    .filter(Boolean)
  const changes = lines.map((line) => {
    const [sha, date, subject] = line.split(FIELD)
    const branches = branchesContaining(repoRoot, sha)
    return {
      sha,
      date,
      branch: bestBranch(branches),
      branches,
      subject,
      setUp: isSetUp(subject)
    }
  })
  const bySubject = Map.groupBy(changes, (change) => change.subject)
  return changes.map((change) => {
    const twins = bySubject.get(change.subject)
    const pick =
      twins.find((twin) => DESIGNER_BRANCH.test(twin.branch ?? '')) ?? twins[0]
    return {
      ...change,
      sameMessage: twins.length,
      pick: twins.length > 1 && pick === change
    }
  })
}

const shortDate = (iso) => iso.slice(0, 16).replace('T', ' ')

/** The changes as a plain list a designer can pick from. */
export const formatChanges = (setId, changes) => {
  if (changes.length === 0) {
    return `No saved changes to ${setId} on any branch.`
  }
  const lines = [
    `Saved changes to ${setId}, newest first (every branch):`,
    ...changes.map((change) => {
      const notes = [
        change.setUp ? 'the release itself, not a change to carry' : null,
        change.sameMessage > 1
          ? `same message as ${change.sameMessage - 1} other${change.sameMessage > 2 ? 's' : ''}${change.pick ? ': pick this one' : ''}`
          : null
      ].filter(Boolean)
      return `  ${change.sha}  ${shortDate(change.date)}  ${change.branch ?? '(no branch)'}  ${change.subject}${notes.length > 0 ? `  (${notes.join('; ')})` : ''}`
    })
  ]
  if (changes.some((change) => change.sameMessage > 1)) {
    lines.push(
      '',
      'Some changes share a message. Take the one marked "pick this one" (the newest on a design/ branch) and name it in your reply.'
    )
  }
  return lines.join('\n')
}
