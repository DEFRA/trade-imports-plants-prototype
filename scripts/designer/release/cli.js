import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { carryChange } from './carry.js'
import { formatChanges, releaseChanges } from './changes.js'
import { freezeRelease } from './freeze.js'
import { formatList, listReleases } from './list.js'
import { formatOrders, readOrders } from './orders.js'
import { MOUNT_FILES, remountReleases } from './remount.js'
import { retireRelease } from './retire.js'
import { REPO_ROOT } from './sets.js'

export const USAGE = [
  'npm run designer:release -- list [--json]',
  'npm run designer:release -- orders <release> [<page> ...]   (the four orders a page sits in)',
  'npm run designer:release -- changes <release> [--json]   (saved changes to it on every branch, newest first)',
  'npm run designer:release -- freeze <release> [--as <new-working-release>] [--describe "<text>"] [--title "<name>"] [--frozen-describe "<text>"] [--frozen-title "<name>"]',
  'npm run designer:release -- carry --from <release> --to <release> [--commit <commit id> | --working]',
  'npm run designer:release -- retire <release>',
  'npm run designer:release -- remount   (after a merge clash in overrides.json or src/server/prototype-sets/)'
].join('\n')

const FLAGS_WITH_VALUES = new Set([
  '--as',
  '--describe',
  '--frozen-describe',
  '--title',
  '--frozen-title',
  '--from',
  '--to',
  '--commit'
])

/**
 * `designer:release` arguments, parsed. No filesystem, no process.
 *
 * @returns {{ command?: string, target?: string, flags: Record<string, string | true> }}
 */
export const parseArgs = (argv) => {
  const [command, ...rest] = argv
  const flags = {}
  const positional = []
  for (let index = 0; index < rest.length; index++) {
    const arg = rest[index]
    if (FLAGS_WITH_VALUES.has(arg)) {
      flags[arg.slice(2)] = rest[index + 1]
      index++
    } else if (arg.startsWith('--')) {
      flags[arg.slice(2)] = true
    } else {
      positional.push(arg)
    }
  }
  return {
    command,
    target: positional[0],
    rest: positional.slice(1),
    flags
  }
}

const printList = ({ flags }, repoRoot) => {
  const rows = listReleases(repoRoot)
  return flags.json ? JSON.stringify(rows, null, 2) : formatList(rows)
}

const printFreeze = ({ target, flags }, repoRoot) => {
  const result = freezeRelease(target, {
    as: flags.as,
    describe: flags.describe,
    frozenDescribe: flags['frozen-describe'],
    title: flags.title,
    frozenTitle: flags['frozen-title'],
    repoRoot
  })
  return [
    result.alreadyFrozen
      ? `"${result.frozen}" was already frozen.`
      : `"${result.frozen}" is now frozen: nobody should change it again.`,
    `Carry on in "${result.working}", a new working release made from it.`,
    '',
    'Next steps:',
    '  1. Run `npm run designer:format`.',
    `  2. Open http://localhost:3103/${result.working} (run \`npm run dev\` first).`,
    '  3. Save both with one commit (say "save my work"). Freeze on its own: carry any change you want in the frozen release before freezing, never after.'
  ].join('\n')
}

const printChanges = ({ target, flags }, repoRoot) => {
  if (!target) {
    throw new Error(
      'Say which release: npm run designer:release -- changes <release>'
    )
  }
  const changes = releaseChanges(target, { repoRoot })
  return flags.json
    ? JSON.stringify(changes, null, 2)
    : formatChanges(target, changes)
}

const printCarry = ({ flags }, repoRoot) => {
  const result = carryChange({
    from: flags.from,
    to: flags.to,
    commit: flags.commit,
    working: flags.working === true,
    repoRoot
  })
  const changed = result.files.map((file) => `  ${file}`)
  if (result.how === 'conflicts') {
    process.exitCode = 1
    return [
      `The change could not be carried into "${flags.to}" cleanly. These files now have both versions marked with <<<<<<< and >>>>>>>:`,
      ...result.conflicts.map((file) => `  ${file}`),
      'Choose which version to keep in each, or undo with `git restore --staged --worktree -- <file>`.',
      result.message ?? ''
    ].join('\n')
  }
  return [
    `Carried the change from "${flags.from}" into "${flags.to}"${
      result.how === 'three-way' ? ' by merging (the files are staged)' : ''
    }:`,
    ...changed,
    '',
    `Check it: npm run designer:check -- --set ${flags.to}`
  ].join('\n')
}

const printRetire = ({ target }, repoRoot) => {
  const removed = retireRelease(target, { repoRoot })
  return [
    `Retired "${target}". Removed:`,
    ...removed.map((line) => `  - ${line}`),
    '',
    'It is still in git history if you need it back. Save the removal with one commit (say "save my work").'
  ].join('\n')
}

const printRemount = (_args, repoRoot) => {
  const { resolved, added, removed } = remountReleases({ repoRoot })
  const changed = [...added, ...removed]
  const lines = []
  if (resolved.length > 0) {
    lines.push(
      'Put back this branch’s side of the files the merge could not join:',
      ...resolved.map((file) => `  - ${file}`)
    )
  }
  lines.push(
    changed.length > 0
      ? 'Rebuilt the release mounts from the release folders:'
      : 'Every release folder is already mounted, described and marked as yours. Nothing to change.',
    ...changed.map((line) => `  - ${line}`)
  )
  if (resolved.length > 0 || changed.length > 0) {
    lines.push(
      '',
      'Next steps:',
      '  1. Run `npm run designer:format`.',
      `  2. Mark them resolved: git add ${MOUNT_FILES.join(' ')}`,
      '  3. Check it: npm run designer:check -- --set <release> --full, then finish the merge (say "save my work").'
    )
  }
  return lines.join('\n')
}

const printOrders = async ({ target, rest }, repoRoot) =>
  formatOrders(target, await readOrders(target, { repoRoot }), rest)

const COMMANDS = {
  orders: printOrders,
  list: printList,
  changes: printChanges,
  freeze: printFreeze,
  carry: printCarry,
  retire: printRetire,
  remount: printRemount
}

/**
 * `npm run designer:release -- list|changes|freeze|carry|retire`: look after your
 * design releases. See docs/designers/design-releases.md.
 */
export const run = async (argv, { repoRoot = REPO_ROOT } = {}) => {
  const args = parseArgs(argv)
  const command = COMMANDS[args.command]
  if (!command) {
    console.error(`Usage:\n${USAGE}`)
    process.exitCode = 1
    return
  }
  try {
    console.log(await command(args, repoRoot))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await run(process.argv.slice(2))
}
