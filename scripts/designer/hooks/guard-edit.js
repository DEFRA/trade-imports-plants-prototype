/**
 * Claude Code PreToolUse hook for Edit, Write and NotebookEdit. It only runs
 * once the prototype's own .claude/settings.json wires it in as a
 * PreToolUse hook (see "For maintainers" in README.md).
 *
 * Reads the hook's JSON on stdin and decides from the file's owner and the
 * current branch:
 * - any branch other than design/*: allowed. A designer's own work happens
 *   on design/*; every other branch (feat/*, chore/*, handoff/*, maintain/*,
 *   main) is a developer or an agent working to the real repo's own rules,
 *   which this guard has no part in.
 * - on design/*: yours is allowed, unless it is in a frozen release
 *   (blocked); shared on purpose is allowed, with a warning; belongs to the
 *   real service, or removed, is blocked (exit 2), naming the file, its
 *   owner and the two safe routes.
 * Reads and other tools are never blocked, and anything it cannot make
 * sense of is allowed (fail open): a broken guard must never stop work.
 */
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { currentBranch } from '../lib/git.js'
import { ownershipOf } from '../lib/ownership.js'
import { REPO_ROOT, readOverrides } from '../lib/repo.js'

export const GUARDED_TOOLS = ['Edit', 'MultiEdit', 'Write', 'NotebookEdit']
export const DESIGN_BRANCH_PREFIX = 'design/'

const ALLOW = Object.freeze({ exitCode: 0, stderr: '' })
const BLOCK_EXIT_CODE = 2

const OWNER_NAMES = {
  'real-service': 'the real plants service',
  removed: 'nobody: the weekly update deletes it'
}

const safeRoutes = (repoPath) =>
  [
    'Two safe routes:',
    '1. Make the change in your design release (a folder under src/server/app/sets/ that you own).',
    '2. Prepare it for the real team as a hand-off (the workspace prototype skill), on a handoff/<name> branch.',
    `Run "npm run designer:where -- ${repoPath}" to see whose file it is.`
  ].join('\n')

const blockMessage = (verdict) =>
  [
    `Blocked: ${verdict.path}`,
    `Owner: ${OWNER_NAMES[verdict.owner]}.`,
    verdict.sentence,
    safeRoutes(verdict.path)
  ].join('\n')

const frozenMessage = (verdict) =>
  [
    `Blocked: ${verdict.path}`,
    `It is in ${verdict.setId}, a frozen release. ${verdict.sentence}`,
    'Say "start a working release from ' +
      `${verdict.setId}" and the design-release skill will make one.`
  ].join('\n')

const warningMessage = (verdict) =>
  [
    `Careful: ${verdict.path}`,
    verdict.sentence,
    'Keep the change small, and update its "why" in overrides.json.'
  ].join('\n')

const isDesignBranch = (branch) =>
  typeof branch === 'string' && branch.startsWith(DESIGN_BRANCH_PREFIX)

/**
 * The decision for one tool call: `{ exitCode, stderr }`. Pure apart from
 * reading overrides.json and release.json under `root`.
 */
export const decide = ({
  toolName,
  filePath,
  cwd,
  branch,
  root = REPO_ROOT,
  overrides = readOverrides({ root })
}) => {
  if (!GUARDED_TOOLS.includes(toolName) || typeof filePath !== 'string') {
    return ALLOW
  }
  if (!isDesignBranch(branch)) {
    return ALLOW
  }
  const verdict = ownershipOf(filePath, { root, cwd: cwd ?? root, overrides })
  if (!verdict.path) {
    return ALLOW
  }
  if (verdict.frozen) {
    return { exitCode: BLOCK_EXIT_CODE, stderr: frozenMessage(verdict) }
  }
  if (verdict.owner === 'yours') {
    return ALLOW
  }
  if (verdict.owner === 'shared-on-purpose') {
    return { exitCode: 0, stderr: warningMessage(verdict) }
  }
  return { exitCode: BLOCK_EXIT_CODE, stderr: blockMessage(verdict) }
}

/**
 * Parses the hook's stdin and decides. `branchOf` finds the branch checked
 * out, swappable in tests. Any failure allows the call.
 */
export const runHook = (
  stdinText,
  { root = REPO_ROOT, branchOf = () => currentBranch({ root }) } = {}
) => {
  try {
    const input = JSON.parse(stdinText)
    const toolInput = input?.tool_input ?? {}
    return decide({
      toolName: input?.tool_name,
      filePath: toolInput.file_path ?? toolInput.notebook_path,
      cwd: input?.cwd,
      branch: branchOf(),
      root
    })
  } catch {
    return ALLOW
  }
}

const readStdin = async () => {
  const chunks = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let result = ALLOW
  try {
    result = runHook(await readStdin())
  } catch {
    result = ALLOW
  }
  if (result.stderr) {
    process.stderr.write(`${result.stderr}\n`)
  }
  process.exitCode = result.exitCode
}
