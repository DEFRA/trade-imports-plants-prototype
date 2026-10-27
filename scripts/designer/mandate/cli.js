/**
 * `npm run designer:mandate -- record|show`
 *
 * Records a designer's permission for release patterns, in their own words,
 * and reads one back. Prints JSON: `{ ok: true, mandate }`, or
 * `{ ok: false, problem }` with exit code 1.
 *
 *   record --set <release> --words "<the designer's words>" [--scope "<what it covers>"]
 *   show --set <release> --id <mandate id>
 */
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { REPO_ROOT } from '../lib/repo.js'
import {
  MandateError,
  recordMandate,
  showMandate,
  workspaceRootOf
} from './record.js'

export const USAGE = [
  'Usage: npm run designer:mandate -- record|show',
  '',
  '  record --set <release> --words "<words>" [--scope "<words>"]',
  "      appends the designer's own words to the release's mandates.md and",
  "      prints the new id. Only a designer's session can record one.",
  '  show --set <release> --id <mandate id>',
  '      prints one recorded mandate.'
].join('\n')

const VALUE_FLAGS = ['--set', '--words', '--scope', '--id']

/** argv in, `{ command, set, words, scope, id, help, errors }` out. */
export const parseArgs = (argv) => {
  const values = {}
  const errors = []
  const positional = []
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (VALUE_FLAGS.includes(arg)) {
      const value = argv[index + 1]
      if (value === undefined || value.startsWith('--')) {
        errors.push(`${arg} needs a value after it.`)
      } else {
        values[arg.slice(2)] = value
        index += 1
      }
    } else if (arg === '--help' || arg === '-h') {
      values.help = true
    } else if (arg.startsWith('--')) {
      errors.push(`I do not know "${arg}".`)
    } else {
      positional.push(arg)
    }
  }
  return {
    command: positional[0],
    set: values.set,
    words: values.words,
    scope: values.scope,
    id: values.id,
    help: values.help === true,
    errors
  }
}

const missingValues = (args) => {
  const needed = { record: ['set', 'words'], show: ['set', 'id'] }[args.command]
  if (!needed) {
    return [`There is no "${args.command}" command.`]
  }
  return needed
    .filter((name) => !args[name])
    .map((name) => `${args.command} needs --${name}.`)
}

const refused = (problem) => ({
  status: 1,
  output: JSON.stringify({ ok: false, problem }, null, 2)
})

const isoToday = () => new Date().toISOString().slice(0, 10)

/**
 * Runs the command and returns `{ status, output }`.
 *
 * @param {string[]} argv - the arguments after `--`.
 * @param {{ root?: string, workspaceRoot?: string, today?: string }} [options]
 */
export const run = (
  argv,
  {
    root = REPO_ROOT,
    workspaceRoot = workspaceRootOf(root),
    today = isoToday()
  } = {}
) => {
  const args = parseArgs(argv)
  if (args.help || !args.command) {
    return { status: 0, output: USAGE }
  }
  const problems = [...args.errors, ...missingValues(args)]
  if (problems.length > 0) {
    return refused(problems.join(' '))
  }
  try {
    const mandate =
      args.command === 'record'
        ? recordMandate(
            args.set,
            { words: args.words, scope: args.scope },
            { root, workspaceRoot, today }
          )
        : showMandate(args.set, args.id, { root })
    return { status: 0, output: JSON.stringify({ ok: true, mandate }, null, 2) }
  } catch (error) {
    if (error instanceof MandateError) {
      return refused(error.message)
    }
    throw error
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { status, output } = run(process.argv.slice(2))
  console.log(output)
  process.exitCode = status
}
