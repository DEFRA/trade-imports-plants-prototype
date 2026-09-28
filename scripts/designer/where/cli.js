/**
 * `npm run designer:where -- <paths...> [--changed] [--json]`
 *
 * Says, for each path, whose file it is and what that means for a change,
 * using the weekly update's own rules. It is advice: it always exits 0.
 */
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { changedAndUntrackedPaths } from '../lib/git.js'
import { ownershipOf } from '../lib/ownership.js'
import { REPO_ROOT, readOverrides } from '../lib/repo.js'

export const USAGE = [
  'Usage: npm run designer:where -- <paths...> [--changed] [--json]',
  '',
  '  <paths...>  the files to ask about',
  '  --changed   also ask about every file git status lists',
  '  --json      print the answers as JSON'
].join('\n')

/** argv in, `{ paths, changed, json, help }` out. */
export const parseArgs = (argv) => {
  const flags = new Set(argv.filter((arg) => arg.startsWith('--')))
  return {
    paths: argv.filter((arg) => !arg.startsWith('--')),
    changed: flags.has('--changed'),
    json: flags.has('--json'),
    help: flags.has('--help')
  }
}

const SUMMARY_LABELS = [
  ['frozen', 'in a frozen release'],
  ['yours', 'yours'],
  ['shared-on-purpose', 'shared on purpose'],
  ['real-service', 'belong to the real service'],
  ['removed', 'removed by the weekly update']
]

const summaryKey = (answer) => (answer.frozen ? 'frozen' : answer.owner)

/** A one-line count, for example "2 yours, 1 belong to the real service." */
export const summarise = (answers) => {
  const parts = SUMMARY_LABELS.map(([key, label]) => {
    const count = answers.filter((answer) => summaryKey(answer) === key).length
    return count > 0 ? `${count} ${label}` : null
  }).filter(Boolean)
  return parts.length > 0 ? `${parts.join(', ')}.` : ''
}

/** One line per path: the path, then its plain-English verdict. */
export const formatAnswers = (answers) => {
  const lines = answers.map(
    (answer) => `${answer.path ?? answer.input} - ${answer.sentence}`
  )
  if (answers.length > 1) {
    lines.push('', summarise(answers))
  }
  return lines.join('\n')
}

/**
 * Works out the answers without printing anything. `listChanged` is the
 * source of `--changed` paths, swappable in tests.
 */
export const answer = (
  { paths, changed },
  {
    root = REPO_ROOT,
    overrides = readOverrides({ root }),
    cwd = process.env.INIT_CWD ?? process.cwd(),
    listChanged = () => changedAndUntrackedPaths({ root })
  } = {}
) => {
  const typed = paths.map((filePath) =>
    ownershipOf(filePath, { root, cwd, overrides })
  )
  const fromGit = changed
    ? listChanged().map((filePath) =>
        ownershipOf(filePath, { root, overrides })
      )
    : []
  const seen = new Set()
  return [...typed, ...fromGit].filter((entry) => {
    const key = entry.path ?? entry.input
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

/** Runs the command and returns the text to print. */
export const run = (argv, options = {}) => {
  const args = parseArgs(argv)
  if (args.help || (args.paths.length === 0 && !args.changed)) {
    return USAGE
  }
  const answers = answer(args, options)
  if (args.json) {
    return JSON.stringify(answers, null, 2)
  }
  if (answers.length === 0) {
    return 'Nothing has changed since your last save.'
  }
  return formatAnswers(answers)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    console.log(run(process.argv.slice(2)))
  } catch (error) {
    console.log(`Could not work out who owns these files: ${error.message}`)
  }
  process.exitCode = 0
}
