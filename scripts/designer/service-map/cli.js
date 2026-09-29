/**
 * `npm run designer:service-map -- [--set <set-id>] [--no-open] [--json-only]`:
 * a map of how a set's pages connect, with a picture of each page from the
 * last walkthrough, built from the set's own journey files.
 *
 * With no --set it maps the designer's working release, or the real journey
 * when they have none. The page is written beside the local walkthrough's
 * demo page, at .cache/designer/walkthrough/site/service-map/<set-id>/, and
 * opened. --json-only prints the map as data and writes nothing: the
 * quickest way to answer "which pages does this answer skip?".
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { REPO_ROOT } from '../lib/repo.js'
import { REAL_JOURNEY_SET, defaultSet, listSets } from '../lib/sets.js'
import { OUTPUTS } from '../walkthrough/run.js'
import { buildGraph, serialiseGraph } from '../../reports/service-map/graph.js'
import { ServiceMapProblem } from '../../reports/service-map/install-set.js'

export const USAGE =
  'Usage: npm run designer:service-map -- [--set <set-id>] [--no-open] [--json-only]'

/**
 * Reads the command line.
 *
 * @param {string[]} argv
 * @returns {{ options: { set: string|null, open: boolean, jsonOnly: boolean,
 *   help: boolean }, problems: string[] }}
 */
export const parseServiceMapArgs = (argv) => {
  const options = { set: null, open: true, jsonOnly: false, help: false }
  const problems = []
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--set') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) {
        problems.push('--set needs a set id, for example --set plants-working.')
      } else {
        options.set = value
        index += 1
      }
    } else if (arg === '--no-open') {
      options.open = false
    } else if (arg === '--json-only') {
      options.jsonOnly = true
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else {
      problems.push(`"${arg}" is not something designer:service-map knows.`)
    }
  }
  return { options, problems }
}

/** The set to map: the one named, else the working release, else the real
 * journey. */
export const chooseSet = (named, { root = REPO_ROOT } = {}) => {
  if (named) {
    if (!listSets({ root }).includes(named)) {
      throw new ServiceMapProblem(
        `There is no set called "${named}". The sets are: ${listSets({ root }).join(', ')}.`
      )
    }
    return named
  }
  return defaultSet({ root }) ?? REAL_JOURNEY_SET
}

const openInBrowser = (file) => {
  const [command, args] =
    process.platform === 'darwin'
      ? ['open', [file]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', file]]
        : ['xdg-open', [file]]
  const child = spawn(command, args, { detached: true, stdio: 'ignore' })
  child.on('error', () => {})
  child.unref()
}

/**
 * Runs designer:service-map.
 *
 * @param {string[]} argv
 * @param {{ root?: string, write?: (text: string) => void,
 *   say?: (line: string) => void, open?: (file: string) => void }} [io]
 * @returns {Promise<number>} the exit code.
 */
export const main = async (
  argv,
  {
    root = REPO_ROOT,
    write = (text) => process.stdout.write(text),
    say = (line) => console.log(line),
    open = openInBrowser
  } = {}
) => {
  const { options, problems } = parseServiceMapArgs(argv)
  if (options.help) {
    say(USAGE)
    return 0
  }
  if (problems.length > 0) {
    say([...problems, '', USAGE].join('\n'))
    return 1
  }
  try {
    const setId = chooseSet(options.set, { root })
    if (options.jsonOnly) {
      write(serialiseGraph(await buildGraph(setId, { root })))
      return 0
    }
    const { buildServiceMaps } =
      await import('../../reports/service-map/cli.js')
    const siteDir = path.join(root, OUTPUTS.local.site)
    const result = await buildServiceMaps({
      root,
      setIds: [setId],
      reportFile: path.join(root, OUTPUTS.local.json),
      resultsDir: path.join(root, OUTPUTS.local.results),
      siteDir
    })
    const page = path.join(siteDir, 'service-map', setId, 'index.html')
    for (const line of result.lines) {
      say(line)
    }
    say(`Service map: ${path.relative(root, page)}`)
    if (options.open) {
      open(page)
    }
    return result.failed.length > 0 ? 1 : 0
  } catch (error) {
    if (error instanceof ServiceMapProblem) {
      say(error.message)
      return 1
    }
    throw error
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2))
}
