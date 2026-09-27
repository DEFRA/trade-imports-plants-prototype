import { existsSync, writeFileSync } from 'node:fs'

import {
  exampleSourceFor,
  loadExamples,
  scenarioFileFor,
  SCENARIO_FILES
} from '../examples.js'
import { isSetId, loadFixturePool } from '../fixtures.js'
import { defaultExamples } from '../scenarios/default.js'
import { checkExamples } from '../seed-set.js'
import { checkOverlays } from '../../prototype-data/index.js'

/**
 * `npm run designer:examples -- <command> <set-id>`: list, check and link to a
 * set's example notifications. Every message is written for a designer.
 */

export const DEFAULT_BASE_URL = 'http://localhost:3103'

const USAGE = `Usage: npm run designer:examples -- <command> <set-id>

Commands:
  list <set-id>    List the set's examples: what each one is and where it stops.
  check <set-id>   Make every example by replaying the real pages, and say which
                   ones reached their page and which ones a page stopped.
  links <set-id>   Print each example's link. The links keep working after the
                   prototype restarts. Add --base <address> for the deployed one.
  init <set-id>    Start a scenario file for the set from its four default
                   examples, so you can add your own.

For example: npm run designer:examples -- check high-risk-plants`

const OK = 0
const FAILED = 1

const organisationNote = (example) =>
  example.organisationId ? `, for ${example.organisationId} only` : ''

const whereItStops = (example) => {
  if (example.through) {
    return `stops on ${example.through}`
  }
  return example.copyOf ? `a copy of '${example.copyOf}'` : 'goes to the end'
}

const summaryOf = (example) =>
  `${example.slug}: ${example.label} (${example.status}${organisationNote(example)}; ${whereItStops(example)})`

const parse = (argv) => {
  const [command, setId, ...rest] = argv
  const baseAt = rest.indexOf('--base')
  return {
    command,
    setId,
    base: baseAt === -1 ? DEFAULT_BASE_URL : rest[baseAt + 1]
  }
}

const noExamples = (setId) =>
  `${setId} has no examples. A set gets examples when it has a happy-path fixture (journeys/linear/flow/fixtures/happy-path.json) or a file at ${SCENARIO_FILES}/${setId}.js.`

const withExamples = (setId, io, action) => {
  let examples
  try {
    examples = io.loadExamples(setId)
  } catch (error) {
    io.err(error.message)
    return FAILED
  }
  if (examples.length === 0) {
    io.out(noExamples(setId))
    return OK
  }
  return action(examples)
}

const list = (setId, io) =>
  withExamples(setId, io, (examples) => {
    io.out(`The examples for ${setId}, in the order they are made:\n`)
    for (const example of examples) {
      io.out(`  ${summaryOf(example)}`)
    }
    return OK
  })

const signInLink = (base, setId, example) => {
  const target = `/examples/${setId}/${example.slug}`
  return example.organisationId
    ? `${base}/auth/stub-sign-in?organisationId=${encodeURIComponent(example.organisationId)}&redirect=${encodeURIComponent(target)}`
    : `${base}${target}`
}

const links = (setId, base, io) =>
  withExamples(setId, io, (examples) => {
    io.out(
      `Example links for ${setId}. Each one keeps working after the prototype restarts or is reset:\n`
    )
    for (const example of examples) {
      io.out(`  ${example.label}`)
      io.out(`  ${signInLink(base, setId, example)}\n`)
    }
    if (examples.some((example) => example.organisationId)) {
      io.out(
        'A link for another organisation signs you in as that organisation first. That only works on your own computer; on the deployed prototype, sign in as a different test user instead.'
      )
    }
    return OK
  })

const reportOverlays = (io) => {
  const { problems, counts } = checkOverlays()
  for (const problem of problems) {
    io.err(problem)
  }
  const extras = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => `${count} extra ${kind}`)
  if (extras.length > 0) {
    io.out(`Extra data in src/server/prototype-data: ${extras.join(', ')}.`)
  }
  return problems.length === 0
}

const reportChecked = (results, io) => {
  for (const { example, made, stopped } of results) {
    io.out(
      made
        ? `  Reached  ${example.slug}: ${example.label} (${made.status}, stops on ${made.stopAt})`
        : `  Stopped  ${example.slug}: ${stopped}`
    )
  }
  const stoppedCount = results.filter((result) => result.stopped).length
  io.out(
    `\n${results.length - stoppedCount} of ${results.length} examples reached their page.`
  )
  if (stoppedCount > 0) {
    io.out(
      'Fix what the page said in the example (its answers), its fixture or the extra data, then run this again.'
    )
  }
  return stoppedCount === 0
}

const check = (setId, io) =>
  withExamples(setId, io, async (examples) => {
    const overlaysOk = reportOverlays(io)
    io.out(`Checking the examples for ${setId} by replaying the real pages…\n`)
    let server
    try {
      server = await io.createServer()
    } catch (error) {
      io.err(
        `The prototype would not start, so the examples cannot be checked: ${error.message}. Try npm run build:frontend, then run this again.`
      )
      return FAILED
    }
    try {
      const results = await checkExamples(server, setId, examples)
      return reportChecked(results, io) && overlaysOk ? OK : FAILED
    } catch (error) {
      io.err(
        `Could not check ${setId}: ${error.message}. Is the set mounted? It should appear on the chooser at ${DEFAULT_BASE_URL}.`
      )
      return FAILED
    } finally {
      await server.stop({ timeout: 0 })
    }
  })

const scenarioFileText = (setId, examples) => `/**
 * The example notifications the ${setId} set starts with, and gets back after
 * Reset. Started from the set's four default examples.
 *
 * How to write one: docs/designers/example-data.md. Each example replays the
 * real pages with a fixture from the set's happy path. \`slug\` is the stable
 * id its example link uses, so never rename one someone may have shared.
 */
export const examples = ${JSON.stringify(examples, null, INDENT)}
`

const INDENT = 2

const init = (setId, io) => {
  const file = io.scenarioFileFor(setId)
  if (existsSync(file)) {
    io.err(
      `${SCENARIO_FILES}/${setId}.js already exists. Add your examples to it.`
    )
    return FAILED
  }
  const examples = defaultExamples(io.loadFixturePool(setId))
  if (examples.length === 0) {
    io.err(
      `${setId} has no happy-path fixture to replay, so it cannot have examples yet.`
    )
    return FAILED
  }
  io.writeFile(file, scenarioFileText(setId, examples))
  io.out(
    `Started ${SCENARIO_FILES}/${setId}.js with ${examples.length} examples. Add yours, then run: npm run designer:examples -- check ${setId}`
  )
  return OK
}

const defaultIo = {
  out: (line) => console.log(line),
  err: (line) => console.error(line),
  exampleSourceFor,
  loadExamples,
  loadFixturePool,
  scenarioFileFor,
  writeFile: (file, text) => writeFileSync(file, text),
  createServer: async () => {
    const { createServer } = await import('../../server.js')
    const server = await createServer()
    await server.initialize()
    return server
  }
}

const COMMANDS = {
  list: ({ setId }, io) => list(setId, io),
  links: ({ setId, base }, io) => links(setId, base, io),
  check: ({ setId }, io) => check(setId, io),
  init: ({ setId }, io) => init(setId, io)
}

/**
 * Runs one command.
 *
 * @param {string[]} argv - the words after `designer:examples --`.
 * @param {Partial<typeof defaultIo>} [overrides] - replaces output, file and
 * server access, for tests.
 * @returns {Promise<number>} the exit code: 0 when everything was fine.
 */
export const main = async (argv, overrides = {}) => {
  const io = { ...defaultIo, ...overrides }
  const options = parse(argv)
  const command = COMMANDS[options.command]
  if (!command) {
    io.out(USAGE)
    return options.command ? FAILED : OK
  }
  if (!isSetId(options.setId)) {
    io.err(
      `Say which set, for example: npm run designer:examples -- ${options.command} high-risk-plants`
    )
    return FAILED
  }
  if (!io.exampleSourceFor(options.setId) && options.command !== 'init') {
    io.out(noExamples(options.setId))
    return OK
  }
  return command(options, io)
}
