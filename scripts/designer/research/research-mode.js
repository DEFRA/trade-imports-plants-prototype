/**
 * Research mode: the pure rules. No git and no filesystem writes here, so every
 * decision `on`, `off` and `sheet` take is unit-testable on its own.
 *
 * Research mode is one commit in a design release, titled exactly
 * `Research mode on for <set-id>`, that relaxes chosen save rules and logs each
 * one in `sets/<set-id>/research-mode.md`. Turning it off is `git revert` of
 * that commit, which also removes the log (and with it the chooser's
 * "Research mode on" tag).
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

export const SETS_DIR = 'src/server/app/sets'
export const RESEARCH_MODE_FILE = 'research-mode.md'
export const SESSION_FILE = 'research-session.json'

/** Sets research mode never changes: the real journey and the placeholder. */
const NEVER_RESEARCH = new Map([
  [
    'high-risk-plants',
    'high-risk-plants is the real journey. Research mode never changes it. Make a research release first: say "make a research version" (design-release), then turn research mode on there.'
  ],
  [
    'sample-journey',
    'sample-journey is a placeholder, not a design release. Make a research release first: say "make a research version" (design-release).'
  ]
])

export const onTitle = (setId) => `Research mode on for ${setId}`

export const revertTitle = (setId) => `Revert "${onTitle(setId)}"`

/** `src/server/app/sets/<set-id>`, repo-relative, with forward slashes. */
export const setDirOf = (setId) => `${SETS_DIR}/${setId}`

/** A file research mode may change: a page's controller (its `fields()` save
 * rules) or the release's obligations (its submit requirements). */
export const isRuleFile = (relativeToSet) =>
  relativeToSet === RESEARCH_MODE_FILE ||
  /(^|\/)controller\.js$/.test(relativeToSet) ||
  /^obligations\/.+\.js$/.test(relativeToSet)

const cellsOf = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())

const isSeparatorRow = (cells) => cells.every((cell) => /^:?-+:?$/.test(cell))

/**
 * Reads the rules table out of `research-mode.md`. The first table row is the
 * header; each later row with 4 cells is one relaxed rule:
 * `| Page | File | What participants can now do | What the real service does |`.
 * @param {string} text
 * @returns {{ page: string, file: string, now: string, real: string }[]}
 */
export const parseResearchMode = (text) => {
  const rows = text
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .map(cellsOf)
    .filter((cells) => !isSeparatorRow(cells))
  return rows
    .slice(1)
    .filter((cells) => cells.length >= 4 && cells[0] !== '')
    .map(([page, file, now, real]) => ({
      page,
      file: file.replace(/`/g, ''),
      now,
      real
    }))
}

/**
 * The research-mode log of a set, if it has one.
 * @param {string} repoRoot
 * @param {string} setId
 * @returns {{ exists: boolean, rules: object[] }}
 */
export const readResearchMode = (repoRoot, setId) => {
  const file = path.join(repoRoot, setDirOf(setId), RESEARCH_MODE_FILE)
  if (!existsSync(file)) {
    return { exists: false, rules: [] }
  }
  return { exists: true, rules: parseResearchMode(readFileSync(file, 'utf8')) }
}

/**
 * `sets/<id>/release.json` if the release has one, else null. Written by
 * `new:set` (design-release); older sets and the two built-in sets have none.
 */
export const readRelease = (repoRoot, setId) => {
  const file = path.join(repoRoot, setDirOf(setId), 'release.json')
  if (!existsSync(file)) {
    return null
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

/**
 * Why research mode may not be switched on for this set, or null when it may.
 * @param {string} repoRoot
 * @param {string} setId
 */
export const refusalFor = (repoRoot, setId) => {
  if (NEVER_RESEARCH.has(setId)) {
    return NEVER_RESEARCH.get(setId)
  }
  if (!existsSync(path.join(repoRoot, setDirOf(setId)))) {
    return `There is no design release called "${setId}". Say "which releases are there" to see them.`
  }
  if (readRelease(repoRoot, setId)?.frozen === true) {
    return `${setId} is a frozen release. Start a research release from it instead: say "make a research version".`
  }
  return null
}

/** A plain warning when the release was not made for research, or null. */
export const purposeWarning = (repoRoot, setId) => {
  const purpose = readRelease(repoRoot, setId)?.purpose
  return purpose && purpose !== 'research'
    ? `${setId} is a ${purpose} release, not a research release. Research mode is safest in a release made for research.`
    : null
}

/**
 * Splits changed repo-relative paths into what the research-mode commit takes
 * and what it leaves alone.
 * @param {string} setId
 * @param {{ code: string, path: string }[]} changes - from `git status`.
 */
export const sortChanges = (setId, changes) => {
  const prefix = `${setDirOf(setId)}/`
  const rules = []
  const leftAlone = []
  const deleted = []
  for (const change of changes) {
    const inSet = change.path.startsWith(prefix)
    const relative = inSet ? change.path.slice(prefix.length) : null
    if (inSet && isRuleFile(relative) && change.code.includes('D')) {
      deleted.push(change.path)
    } else if (inSet && isRuleFile(relative)) {
      rules.push({ path: change.path, relative })
    } else {
      leftAlone.push(change.path)
    }
  }
  return { rules, leftAlone, deleted }
}

/** Changed rule files that `research-mode.md` does not name. */
export const unloggedFiles = (ruleChanges, logText) =>
  ruleChanges
    .filter(({ relative }) => relative !== RESEARCH_MODE_FILE)
    .filter(({ relative }) => !logText.includes(relative))
    .map(({ relative }) => relative)

/**
 * The research-mode commits on this branch that are still in force: every
 * commit titled `Research mode on for <id>` that no later
 * `Revert "Research mode on for <id>"` commit names. Newest first, as `git log`
 * lists them.
 * @param {string} setId
 * @param {{ sha: string, subject: string, body: string }[]} commits
 */
export const activeOnCommits = (setId, commits) => {
  const reverted = new Set(
    commits
      .filter(({ subject }) => subject === revertTitle(setId))
      .map(({ body }) => /This reverts commit ([0-9a-f]{7,40})/.exec(body)?.[1])
      .filter(Boolean)
  )
  const isReverted = (sha) =>
    [...reverted].some((short) => sha.startsWith(short))
  return commits.filter(
    ({ sha, subject }) => subject === onTitle(setId) && !isReverted(sha)
  )
}

/** The body of the research-mode commit: one line per relaxed rule. */
export const onCommitBody = (setId, rules) =>
  [
    `Relaxed for a research round only. Undo with: npm run designer:research -- off ${setId}`,
    '',
    ...rules.map((rule) => `- ${rule.page}: ${rule.now} (${rule.file})`)
  ].join('\n')
