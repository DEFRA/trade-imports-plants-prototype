/**
 * Reads `npm run designer:check -- [--set <id>] [--quick|--full|--walk]
 * [--json]`. The set can also be given on its own (`-- plants-working`).
 * Problems are collected as plain sentences rather than thrown, so the CLI
 * can print them all at once.
 */

export const TIERS = Object.freeze(['quick', 'full', 'walk'])

export const USAGE = [
  'Usage: npm run designer:check -- --set <set-id> [--quick | --full | --walk] [--json]',
  '',
  '  --quick  (the default) tidy, ownership, English and Welsh, templates and',
  '           the prototype checks. Under a minute.',
  '  --full   the quick check, then exactly what the pre-commit hook runs:',
  '           npm run format:check, npm run lint and npm test.',
  '  --walk   the full check, then npm run test:fit:journeys, which walks every',
  '           journey in a real browser.',
  '  --json   print the result as JSON instead of a table.',
  '  --since <commit>',
  '           the commit this run started from. A recorded mandate must not',
  '           have changed since it.',
  '  --no-new-patterns',
  '           with --since: fail on any change since that commit to the',
  "           release's assets, layout.njk, patterns.md or mandates.md, and on",
  '           any new app- class. For a run with no designer’s mandate.',
  '  --mandate <id>',
  "           with --since: the designer's mandate the run works under. Fail",
  '           on any mandate the run recorded, and on any pattern it added or',
  '           changed that does not cite this one. A new pattern must be an',
  '           Option. The scope is not checked.'
].join('\n')

const TIER_FLAGS = new Map(TIERS.map((tier) => [`--${tier}`, tier]))

const MISSING_VALUE = {
  '--set': '--set needs a set id after it, for example --set plants-working.',
  '--since':
    '--since needs a commit after it, for example --since 1a2b3c4: the commit the run started from.',
  '--mandate':
    '--mandate needs a mandate id after it, for example --mandate m-2026-10-27-1.'
}

const readValue = (flag, argv, index, errors) => {
  const value = argv[index + 1]
  if (!value || value.startsWith('--')) {
    errors.push(MISSING_VALUE[flag])
    return undefined
  }
  return value
}

/**
 * @param {string[]} argv - the arguments after `--`.
 * @returns {{set: string|undefined, tier: string, json: boolean, help: boolean, since: string|undefined, noNewPatterns: boolean, mandate: string|undefined, errors: string[]}}
 */
export const parseCheckArgs = (argv) => {
  const errors = []
  const tiers = []
  let set
  let since
  let mandate
  let json = false
  let help = false
  let noNewPatterns = false

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--set' || arg === '--since' || arg === '--mandate') {
      const value = readValue(arg, argv, index, errors)
      if (arg === '--set') {
        set = value ?? set
      } else if (arg === '--since') {
        since = value ?? since
      } else {
        mandate = value ?? mandate
      }
      index += 1
    } else if (arg.startsWith('--set=')) {
      set = arg.slice('--set='.length) || set
    } else if (arg.startsWith('--since=')) {
      since = arg.slice('--since='.length) || since
    } else if (arg === '--no-new-patterns') {
      noNewPatterns = true
    } else if (TIER_FLAGS.has(arg)) {
      tiers.push(TIER_FLAGS.get(arg))
    } else if (arg === '--json') {
      json = true
    } else if (arg === '--help' || arg === '-h') {
      help = true
    } else if (!arg.startsWith('-') && set === undefined) {
      set = arg
    } else {
      errors.push(`I do not know "${arg}".`)
    }
  }

  if (tiers.length > 1) {
    errors.push('Choose one of --quick, --full or --walk, not several.')
  }

  if (noNewPatterns && since === undefined) {
    errors.push(
      '--no-new-patterns needs the commit the run started from: add --since <commit>.'
    )
  }

  if (mandate !== undefined && since === undefined) {
    errors.push(
      '--mandate needs the commit the run started from: add --since <commit>.'
    )
  }

  if (mandate !== undefined && noNewPatterns) {
    errors.push(
      'Choose --no-new-patterns for a run with no mandate, or --mandate for a run with one, not both.'
    )
  }

  return {
    set,
    tier: tiers[0] ?? 'quick',
    json,
    help,
    since,
    noNewPatterns,
    mandate,
    errors
  }
}
