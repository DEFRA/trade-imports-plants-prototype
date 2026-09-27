import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { carryChange } from './carry.js'
import { freezeRelease } from './freeze.js'
import { formatList, listReleases } from './list.js'
import { retireRelease } from './retire.js'
import { REPO_ROOT } from './sets.js'

export const USAGE = [
  'npm run designer:release -- list [--json]',
  'npm run designer:release -- freeze <release> [--as <new-working-release>] [--describe "<text>"]',
  'npm run designer:release -- carry --from <release> --to <release> [--commit <commit id> | --working]',
  'npm run designer:release -- retire <release>'
].join('\n')

const FLAGS_WITH_VALUES = new Set([
  '--as',
  '--describe',
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
  return { command, target: positional[0], flags }
}

const printList = ({ flags }, repoRoot) => {
  const rows = listReleases(repoRoot)
  return flags.json ? JSON.stringify(rows, null, 2) : formatList(rows)
}

const printFreeze = ({ target, flags }, repoRoot) => {
  const result = freezeRelease(target, {
    as: flags.as,
    describe: flags.describe,
    repoRoot
  })
  return [
    result.alreadyFrozen
      ? `"${result.frozen}" was already frozen.`
      : `"${result.frozen}" is now frozen: nobody should change it again.`,
    `Carry on in "${result.working}", a new working release made from it.`,
    '',
    'Next steps:',
    '  1. Run `npm run format`.',
    `  2. Open http://localhost:3103/${result.working} (run \`npm run dev\` first).`,
    '  3. Save both with one commit (say "save my work").'
  ].join('\n')
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

const COMMANDS = {
  list: printList,
  freeze: printFreeze,
  carry: printCarry,
  retire: printRetire
}

/**
 * `npm run designer:release -- list|freeze|carry|retire`: look after your
 * design releases. See docs/designers/design-releases.md.
 */
export const run = (argv, { repoRoot = REPO_ROOT } = {}) => {
  const args = parseArgs(argv)
  const command = COMMANDS[args.command]
  if (!command) {
    console.error(`Usage:\n${USAGE}`)
    process.exitCode = 1
    return
  }
  try {
    console.log(command(args, repoRoot))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run(process.argv.slice(2))
}
