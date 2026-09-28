/**
 * `on`, `off` and `status`: research mode as one commit that is reverted
 * afterwards. Each returns `{ ok, lines }` — the plain-English lines to print —
 * and never throws for a designer mistake, only for a broken repo.
 */
import {
  activeOnCommits,
  onCommitBody,
  onTitle,
  purposeWarning,
  readResearchMode,
  refusalFor,
  RESEARCH_MODE_FILE,
  setDirOf,
  sortChanges,
  unloggedFiles
} from './research-mode.js'
import {
  abortRevert,
  addPaths,
  changedPaths,
  commitStaged,
  commitsMentioning,
  headSha,
  revert,
  stagedPaths
} from './git.js'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const refuse = (...lines) => ({ ok: false, lines })

const activeFor = (repoRoot, setId) =>
  activeOnCommits(setId, commitsMentioning(repoRoot, onTitle(setId)))

const ruleLines = (rules) =>
  rules.map((rule) => `  - ${rule.page}: ${rule.now}`)

/** The rules as the real service has them again, for switching off. */
const restoredLines = (rules) =>
  rules.map((rule) => `  - ${rule.page}: ${rule.real || rule.now}`)

/**
 * Commits the relaxed rules as `Research mode on for <set-id>`.
 * Takes only rule files inside the release (controllers, obligations and
 * `research-mode.md`); anything else changed is left unsaved and listed.
 */
export const turnOn = (repoRoot, setId) => {
  const refusal = refusalFor(repoRoot, setId)
  if (refusal) {
    return refuse(refusal)
  }
  const [active] = activeFor(repoRoot, setId)
  if (active) {
    return refuse(
      `Research mode is already on for ${setId} (commit ${active.sha.slice(0, 7)}).`,
      `To change which errors are off, turn it off first: npm run designer:research -- off ${setId}`
    )
  }

  const { rules, leftAlone, deleted } = sortChanges(
    setId,
    changedPaths(repoRoot)
  )
  if (deleted.length > 0) {
    return refuse(
      'Research mode only changes rules. It never deletes files. These are deleted:',
      ...deleted.map((file) => `  - ${file}`),
      'Undo the deletions with git restore, then try again.'
    )
  }
  if (!rules.some(({ relative }) => relative === RESEARCH_MODE_FILE)) {
    return refuse(
      `There is no new or changed ${setDirOf(setId)}/${RESEARCH_MODE_FILE}.`,
      'Write it first: one row for every save rule you relaxed.'
    )
  }
  const log = readResearchMode(repoRoot, setId)
  if (log.rules.length === 0) {
    return refuse(
      `${RESEARCH_MODE_FILE} has no rules in its table. Add one row for every save rule you relaxed.`
    )
  }
  const logText = readFileSync(
    path.join(repoRoot, setDirOf(setId), RESEARCH_MODE_FILE),
    'utf8'
  )
  const unlogged = unloggedFiles(rules, logText)
  if (unlogged.length > 0) {
    return refuse(
      `These changed files are not in ${RESEARCH_MODE_FILE}. Log each one, or undo it:`,
      ...unlogged.map((file) => `  - ${file}`)
    )
  }

  const paths = rules.map((rule) => rule.path)
  const otherStaged = stagedPaths(repoRoot).filter(
    (file) => !paths.includes(file)
  )
  if (otherStaged.length > 0) {
    return refuse(
      'Other changes are staged for the next save, and research mode must be a commit of its own. Unstage them with git restore --staged <file> (your edits stay), then try again:',
      ...otherStaged.map((file) => `  - ${file}`)
    )
  }
  addPaths(repoRoot, paths)
  try {
    commitStaged(repoRoot, {
      title: onTitle(setId),
      body: onCommitBody(setId, log.rules)
    })
  } catch (error) {
    return refuse(
      'The research-mode commit did not go through. The checks that run before every commit probably failed.',
      `Run: npm run designer:check -- --set ${setId} --full, fix what it reports, then run this again.`,
      String(error.stderr ?? error.message).trim()
    )
  }

  const warning = purposeWarning(repoRoot, setId)
  return {
    ok: true,
    lines: [
      `Research mode is on for ${setId} (commit ${headSha(repoRoot)} "${onTitle(setId)}").`,
      'Participants can now:',
      ...ruleLines(log.rules),
      ...(warning ? [warning] : []),
      ...(leftAlone.length > 0
        ? [
            'Not part of research mode, so left unsaved:',
            ...leftAlone.map((file) => `  - ${file}`)
          ]
        : []),
      `Turn it off after the sessions with: npm run designer:research -- off ${setId}`
    ]
  }
}

/** Reverts the research-mode commit, which puts every rule back and removes
 * `research-mode.md`. */
export const turnOff = (repoRoot, setId) => {
  const [active] = activeFor(repoRoot, setId)
  if (!active) {
    const log = readResearchMode(repoRoot, setId)
    return log.exists
      ? refuse(
          `${setDirOf(setId)}/${RESEARCH_MODE_FILE} exists, but there is no "${onTitle(setId)}" commit on this branch.`,
          'The rules were changed but never saved as research mode. Undo those edits with git restore, or ask for help.'
        )
      : refuse(`Research mode is not on for ${setId}. Nothing to do.`)
  }
  const unsaved = changedPaths(repoRoot, [setDirOf(setId)])
  if (unsaved.length > 0) {
    return refuse(
      `You have unsaved changes in ${setId}. Save them ("save my work") or undo them, then try again:`,
      ...unsaved.map(({ path: file }) => `  - ${file}`)
    )
  }
  const { rules } = readResearchMode(repoRoot, setId)
  try {
    revert(repoRoot, active.sha)
  } catch {
    abortRevert(repoRoot)
    return refuse(
      'Research mode could not be switched off automatically: a later change touches the same lines. Nothing was changed.',
      `Put each rule in ${RESEARCH_MODE_FILE} back by hand, delete ${RESEARCH_MODE_FILE}, and save it as one change titled "Research mode off for ${setId}".`
    )
  }
  return {
    ok: true,
    lines: [
      `Research mode is off for ${setId} (commit ${headSha(repoRoot)} reverts ${active.sha.slice(0, 7)}).`,
      'Every page checks answers as the real service does again:',
      ...restoredLines(rules),
      'The deployed prototype changes only after this is merged to main.'
    ]
  }
}

/** Whether research mode is on, and which rules it relaxes. */
export const statusOf = (repoRoot, setId) => {
  const [active] = activeFor(repoRoot, setId)
  const log = readResearchMode(repoRoot, setId)
  if (active) {
    return {
      ok: true,
      lines: [
        `Research mode is on for ${setId} (commit ${active.sha.slice(0, 7)}).`,
        'Participants can:',
        ...ruleLines(log.rules)
      ]
    }
  }
  return {
    ok: true,
    lines: [
      log.exists
        ? `Research mode is being prepared for ${setId}: ${RESEARCH_MODE_FILE} exists but is not saved yet. Run: npm run designer:research -- on ${setId}`
        : `Research mode is off for ${setId}. Errors behave as in the real service.`
    ]
  }
}
