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
  '  --json   print the result as JSON instead of a table.'
].join('\n')

const TIER_FLAGS = new Map(TIERS.map((tier) => [`--${tier}`, tier]))

const readSetValue = (argv, index, errors) => {
  const value = argv[index + 1]
  if (!value || value.startsWith('--')) {
    errors.push(
      '--set needs a set id after it, for example --set plants-working.'
    )
    return undefined
  }
  return value
}

/**
 * @param {string[]} argv - the arguments after `--`.
 * @returns {{set: string|undefined, tier: string, json: boolean, help: boolean, errors: string[]}}
 */
export const parseCheckArgs = (argv) => {
  const errors = []
  const tiers = []
  let set
  let json = false
  let help = false

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--set') {
      set = readSetValue(argv, index, errors) ?? set
      index += 1
    } else if (arg.startsWith('--set=')) {
      set = arg.slice('--set='.length) || set
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

  return { set, tier: tiers[0] ?? 'quick', json, help, errors }
}
