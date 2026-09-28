/**
 * `npm run designer:walkthrough -- [options]`, parsed. No filesystem and no
 * process: argv in, `{ options, problems }` out. Each problem is one plain
 * sentence a designer can act on.
 */

export const USAGE = [
  'Usage: npm run designer:walkthrough -- [options]',
  '',
  'Walks every example in a set through the prototype, page by page, and',
  'makes a report with a picture of each page, a video and a trace.',
  'With no options it walks your working release (or the real journey when',
  'you have none) and opens the report in your browser.',
  '',
  'Options:',
  '  --set <set-id>[,<set-id>]  walk these sets. Repeat it for more',
  '  --all                      walk every set',
  '  --no-open                  do not open the report when done (agents',
  '                             always use this: opening it waits for Ctrl+C)',
  '  --show                     open the last report again, without walking',
  '  --ci                       what the pull request checks run: every set,',
  '                             a report to merge, and a summary for GitHub',
  '  --help                     show this help'
].join('\n')

const FLAGS = Object.freeze({
  '--all': 'all',
  '--show': 'show',
  '--ci': 'ci',
  '--help': 'help',
  '-h': 'help'
})

const splitList = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '')

const emptyOptions = () => ({
  sets: [],
  all: false,
  open: true,
  show: false,
  ci: false,
  help: false
})

const readSetValue = (argv, index) => {
  const arg = argv[index]
  if (arg.startsWith('--set=')) {
    return { value: arg.slice('--set='.length), consumed: 1 }
  }
  const value = argv[index + 1]
  return value === undefined || value.startsWith('--')
    ? { value: null, consumed: 1 }
    : { value, consumed: 2 }
}

/**
 * Parses the arguments after `--`.
 *
 * @param {string[]} argv
 * @returns {{ options: object, problems: string[] }}
 */
export const parseWalkthroughArgs = (argv) => {
  const options = emptyOptions()
  const problems = []
  let index = 0
  while (index < argv.length) {
    const arg = argv[index]
    if (FLAGS[arg]) {
      options[FLAGS[arg]] = true
      index += 1
    } else if (arg === '--no-open') {
      options.open = false
      index += 1
    } else if (arg === '--set' || arg.startsWith('--set=')) {
      const { value, consumed } = readSetValue(argv, index)
      if (value === null) {
        problems.push(
          '--set needs a set id after it, like --set plants-working.'
        )
      } else {
        options.sets.push(...splitList(value))
      }
      index += consumed
    } else {
      problems.push(`"${arg}" is not an option designer:walkthrough knows.`)
      index += 1
    }
  }
  options.sets = [...new Set(options.sets)]
  if (options.all && options.sets.length > 0) {
    problems.push('Use --set or --all, not both.')
  }
  if (options.ci) {
    options.open = false
  }
  return { options, problems }
}
