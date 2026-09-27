/**
 * `npm run designer:check -- --set <id> [--quick|--full|--walk] [--json]`
 *
 * "Did I break anything?" for designers: a plain pass or fail table, each
 * failure explained with its fix, and the raw log in
 * .cache/designer/check/<timestamp>.log. A green --full is exactly what the
 * pre-commit hook runs, so a commit straight after it passes the hook.
 * See docs/designers/checks-and-errors.md.
 */
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { changedAndUntrackedPaths } from '../lib/git.js'
import { REPO_ROOT } from '../lib/repo.js'
import { defaultSet, listSets } from '../lib/sets.js'
import { parseCheckArgs, USAGE } from './args.js'
import { createLog } from './log.js'
import { runCommand } from './process.js'
import { formatJson, formatReport } from './report.js'
import { runCheck } from './run.js'

const EXIT_PROBLEMS = 1
const EXIT_USAGE = 2

const safeChangedPaths = (root) => {
  try {
    return changedAndUntrackedPaths({ root })
  } catch {
    return []
  }
}

/**
 * Picks the set to check: the one named, or the working release changed most
 * recently. Answers `{ setId }` or `{ error }` in plain English.
 */
export const resolveSet = (named, { sets, fallback }) => {
  const list = sets.join(', ')
  if (named === undefined) {
    return fallback
      ? { setId: fallback }
      : {
          error: `Say which set to check, for example --set ${sets[0] ?? 'plants-working'}. The sets here are: ${list}.`
        }
  }
  return sets.includes(named)
    ? { setId: named }
    : {
        error: `There is no set called "${named}". The sets here are: ${list}.`
      }
}

/**
 * @param {string[]} argv - the arguments after `--`.
 * @param {object} [io] - where to write (tests pass their own).
 * @returns {Promise<number>} the exit code: 0 passed, 1 problems, 2 usage.
 */
export const main = async (
  argv,
  { root = REPO_ROOT, stdout = process.stdout, stderr = process.stderr } = {}
) => {
  const args = parseCheckArgs(argv)
  if (args.help) {
    stdout.write(`${USAGE}\n`)
    return 0
  }
  if (args.errors.length > 0) {
    stderr.write(`${args.errors.join('\n')}\n\n${USAGE}\n`)
    return EXIT_USAGE
  }
  const chosen = resolveSet(args.set, {
    sets: listSets({ root }),
    fallback: args.set === undefined ? defaultSet({ root }) : null
  })
  if (chosen.error) {
    stderr.write(`${chosen.error}\n`)
    return EXIT_USAGE
  }

  const log = createLog({ root })
  const result = await runCheck({
    setId: chosen.setId,
    tier: args.tier,
    root,
    changedPaths: safeChangedPaths(root),
    runCommand,
    onStep: (_id, title) => {
      if (!args.json) {
        stderr.write(`Checking: ${title}...\n`)
      }
    },
    onOutput: log.write
  })

  const format = args.json ? formatJson : formatReport
  stdout.write(`${format(result, { logPath: log.path })}\n`)
  return result.ok ? 0 : EXIT_PROBLEMS
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2))
}
