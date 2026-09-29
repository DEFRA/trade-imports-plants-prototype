import { existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { format as formatWithPrettier, resolveConfig } from 'prettier'

import {
  exampleSourceFor,
  loadExamples,
  scenarioFileFor,
  SCENARIO_FILES
} from '../examples.js'
import {
  HAPPY_PATH,
  findFixture,
  isSetId,
  loadFixturePool
} from '../fixtures.js'
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
  fixtures <set-id>
                   List the fixtures an example can use: what each is for,
                   the pages it answers, and where they differ.

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
    io.out(
      'Each link opens the page the example stopped at. To open another page of the same notification, add ?page=<page> to a link without an organisation, for example ?page=task-list or ?page=notification-view (check your answers).'
    )
    if (examples.some((example) => example.organisationId)) {
      io.out(
        'A link for another organisation signs you in as that organisation first. That only works on your own computer; on the deployed prototype, sign in as a different test user instead.'
      )
    }
    return OK
  })

const uniqueSlugs = (steps) => [...new Set(steps.map((step) => step.slug))]

const fieldNamesAt = (steps, slug) =>
  [
    ...new Set(
      steps
        .filter((step) => step.slug === slug)
        .flatMap((step) => Object.keys(step.fields ?? {}))
    )
  ].sort()

/** Pages only some fixtures visit, and pages whose questions differ. */
const differences = (walks) => {
  const lines = []
  const allSlugs = [...new Set(walks.flatMap((walk) => walk.slugs))]
  for (const slug of allSlugs) {
    const visiting = walks.filter((walk) => walk.slugs.includes(slug))
    if (visiting.length < walks.length) {
      lines.push(
        `  ${slug}: only ${visiting.map((walk) => walk.name).join(', ')}`
      )
      continue
    }
    const byFields = new Map()
    for (const walk of visiting) {
      const fields = fieldNamesAt(walk.steps, slug).join(', ')
      byFields.set(fields, [...(byFields.get(fields) ?? []), walk.name])
    }
    if (byFields.size > 1) {
      lines.push(
        `  ${slug} asks different questions: ${[...byFields]
          .map(
            ([fields, names]) => `${names.join(', ')} (${fields || 'nothing'})`
          )
          .join('; ')}`
      )
    }
  }
  return lines
}

/**
 * Every fixture an example can use: what it is for, the pages it answers in
 * order, and where fixtures differ (the branches of the journey).
 */
const fixtures = (setId, io) => {
  const pool = io.loadFixturePool(setId)
  const walks = Object.entries(pool).flatMap(([file, named]) =>
    Object.entries(named)
      .filter(([, fixture]) => Array.isArray(fixture?.steps))
      .map(([name, fixture]) => ({
        file,
        name,
        useCase: fixture.useCase ?? '',
        late: fixture.late === true,
        steps: fixture.steps,
        slugs: uniqueSlugs(fixture.steps)
      }))
  )
  if (walks.length === 0) {
    io.out(noExamples(setId))
    return OK
  }
  io.out(
    `The fixtures an example in ${setId} can use (fixture: '<name>'), and the pages each one answers:\n`
  )
  for (const walk of walks) {
    const where = walk.file === HAPPY_PATH ? '' : ' (in ' + walk.file + ')'
    const late = walk.late ? ', arrives late' : ''
    io.out(`  ${walk.name}${where}${late}: ${walk.useCase || 'no description'}`)
    io.out(`    ${walk.slugs.join(' > ')}\n`)
  }
  const branches = differences(walks)
  if (branches.length > 0) {
    io.out('Where they differ:')
    for (const line of branches) {
      io.out(line)
    }
  }
  return OK
}

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

const quoted = (text) =>
  `'${String(text).replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`

const valueText = (value) =>
  typeof value === 'string' ? quoted(value) : JSON.stringify(value)

const exampleText = (example) =>
  [
    '  {',
    Object.entries(example)
      .map(([key, value]) => `    ${key}: ${valueText(value)}`)
      .join(',\n'),
    '  }'
  ].join('\n')

/**
 * The short `fixture: 'warePotatoes'` form, as scenarios/high-risk-plants.js
 * writes it, wherever the name is in only one fixture file. The long
 * `{ file, name }` form repeated on every example trips the
 * sonarjs/no-duplicate-string code rule as soon as one more example is added.
 */
export const shortFixtures = (examples, pool) =>
  examples.map((example) => {
    const { fixture } = example
    if (typeof fixture !== 'object' || fixture === null) {
      return example
    }
    const found = findFixture(pool, fixture.name)
    return found.problem || found.file !== fixture.file
      ? example
      : { ...example, fixture: fixture.name }
  })

/** A scenario file laid out as Prettier leaves it. */
export const scenarioFileText = (setId, examples) => `/**
 * The example notifications the ${setId} set starts with, and gets back after
 * Reset. Started from the set's four default examples.
 *
 * How to write one: docs/designers/example-data.md. Each example replays the
 * real pages with a fixture from the set's happy path. \`slug\` is the stable
 * id its example link uses, so never rename one someone may have shared.
 */
export const examples = [
${examples.map(exampleText).join(',\n')}
]
`

// Resolved from this file's own path, not the scenario file's: a fresh
// release's scenario file starts life outside any folder Prettier's config
// search would find it from (a brand-new src/server/prototype-seed/scenarios
// file is fine, but a test writes it to a temp folder), and the generator's
// own values (a long `story` sentence, say) can be too wide for one line, so
// this always formats through Prettier rather than hand-rolling its rules.
const PRETTIER_CONFIG_ANCHOR = fileURLToPath(import.meta.url)

const formatScenarioFile = async (text, file) => {
  const options = await resolveConfig(PRETTIER_CONFIG_ANCHOR)
  return formatWithPrettier(text, { ...options, filepath: file })
}

const init = async (setId, io) => {
  const file = io.scenarioFileFor(setId)
  if (existsSync(file)) {
    io.err(
      `${SCENARIO_FILES}/${setId}.js already exists. Add your examples to it.`
    )
    return FAILED
  }
  const pool = io.loadFixturePool(setId)
  const examples = shortFixtures(defaultExamples(pool), pool)
  if (examples.length === 0) {
    io.err(
      `${setId} has no happy-path fixture to replay, so it cannot have examples yet.`
    )
    return FAILED
  }
  const text = await formatScenarioFile(scenarioFileText(setId, examples), file)
  io.writeFile(file, text)
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
  init: ({ setId }, io) => init(setId, io),
  fixtures: ({ setId }, io) => fixtures(setId, io)
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
