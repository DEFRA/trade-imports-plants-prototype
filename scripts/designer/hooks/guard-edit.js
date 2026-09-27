/**
 * Claude Code PreToolUse hook for Edit, Write and NotebookEdit. It only runs
 * once the settings proposal is applied to .claude/settings.json.
 *
 * Reads the hook's JSON on stdin and decides from the file's owner and the
 * current branch:
 * - yours: allowed, unless it is in a frozen release (blocked)
 * - any file on a handoff/* or maintain/* branch: allowed
 * - shared on purpose: allowed, with a warning
 * - belongs to the real service, or removed: blocked (exit 2), naming the
 *   file, its owner and the two safe routes
 * Reads and other tools are never blocked, and anything it cannot make
 * sense of is allowed (fail open): a broken guard must never stop work.
 */
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { currentBranch } from '../lib/git.js'
import { ownershipOf } from '../lib/ownership.js'
import { REPO_ROOT, readOverrides } from '../lib/repo.js'

export const GUARDED_TOOLS = ['Edit', 'MultiEdit', 'Write', 'NotebookEdit']
export const OPEN_BRANCH_PREFIXES = ['handoff/', 'maintain/']

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
    '2. Prepare it for the real team with the hand-off skill, on a handoff/<name> branch.',
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

const isOpenBranch = (branch) =>
  typeof branch === 'string' &&
  OPEN_BRANCH_PREFIXES.some((prefix) => branch.startsWith(prefix))

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
  if (isOpenBranch(branch)) {
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
