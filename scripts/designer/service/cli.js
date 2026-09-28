/**
 * `npm run designer:service -- new|list|retire`
 *
 * Makes, lists and retires prototype-owned services: services the real
 * plants service does not have yet, built in its own shape under
 * `src/server/app/services/<name>/` (`index.js` picks `stub.js` or
 * `client.js`), each with its own line in `overrides.json`'s `ours`.
 *
 *   new <name> --owner <plants-backend|new-api|ins> --describe "<text>"
 *   list
 *   retire <name> [--force]
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  describeServices,
  ownedGlobOf,
  ownedServiceNames,
  serviceFolderOf
} from '../../../src/server/prototype-support/contracts.js'
import { isKebabCase } from '../../new-set/names.js'
import {
  addOwnedPaths,
  removeOwnedPaths
} from '../../new-set/update-overrides.js'
import { tidyFiles } from '../format/cli.js'
import { runGit } from '../lib/git.js'
import { REPO_ROOT, readOverrides } from '../lib/repo.js'
import { filesFor, OWNERS } from './templates.js'

export const USAGE = [
  'Usage: npm run designer:service -- <command>',
  '',
  '  new <name> --owner <plants-backend|new-api|ins> --describe "<what the real service would need to do>"',
  '             makes a prototype-owned service in src/server/app/services/<name>/',
  '  list       lists every prototype-owned service and what it needs',
  '  retire <name> [--force]',
  '             deletes a prototype-owned service and its line in overrides.json'
].join('\n')

/**
 * Services the real plants service removed on purpose (commit a810e68,
 * "Decide the fate of the unused platform services"). Making one again
 * would bring back what its team took out.
 */
export const REMOVED_BY_THE_REAL_SERVICE = Object.freeze([
  'commercial-transporters',
  'import-reason-purpose',
  'transport-reference'
])

/**
 * Service folders the animals frontend has (trade-imports-animals-frontend,
 * `src/server/app/services/`). Allowed, but worth a word: the real team may
 * want to share the animals one rather than build a second.
 */
export const ANIMALS_SERVICES = Object.freeze([
  'certification-purposes',
  'document-types',
  'document-uploads',
  'transporters'
])

/** argv in, `{ command, name, owner, describe, force, help }` out. */
export const parseArgs = (argv) => {
  const valueOf = (flag) => {
    const index = argv.indexOf(flag)
    return index === -1 ? undefined : argv[index + 1]
  }
  const flagValues = new Set(
    ['--owner', '--describe'].map(valueOf).filter(Boolean)
  )
  const words = argv.filter(
    (arg) => !arg.startsWith('--') && !flagValues.has(arg)
  )
  return {
    command: words[0],
    name: words[1],
    owner: valueOf('--owner'),
    describe: valueOf('--describe'),
    force: argv.includes('--force'),
    help: argv.includes('--help')
  }
}

/**
 * Whether upstream/main (the real plants service) has a service folder of
 * this name: true, false, or null when upstream/main is not fetched here.
 */
export const upstreamHasService = (name, { root = REPO_ROOT } = {}) => {
  try {
    const listed = runGit(
      ['ls-tree', '--name-only', 'upstream/main', '--', serviceFolderOf(name)],
      { root }
    )
    return listed.trim() !== ''
  } catch {
    return null
  }
}

const overridesPathOf = (root) => path.join(root, 'overrides.json')

const refuse = (lines) => ({ status: 1, lines })

const newServiceProblems = (
  { name, owner, describe },
  { root, upstreamHas }
) => {
  if (!name || !isKebabCase(name)) {
    return [
      'Give the service a name in lower-case words joined by hyphens, like saved-vehicles.'
    ]
  }
  if (!OWNERS.includes(owner)) {
    return [
      `Say who would own the real service with --owner: ${OWNERS.join(', ')}.`
    ]
  }
  if (!describe || describe.trim() === '') {
    return [
      'Say in one sentence what the real service would need to do, with --describe "…".'
    ]
  }
  if (REMOVED_BY_THE_REAL_SERVICE.includes(name)) {
    return [
      `The real plants service removed a service called ${name} on purpose. Pick another name, and talk to the plants team before bringing it back.`
    ]
  }
  if (upstreamHas(name) === true) {
    return [
      `The real plants service already has ${serviceFolderOf(name)}/. Use it (its index.js), and do not make a prototype copy.`
    ]
  }
  if (existsSync(path.join(root, serviceFolderOf(name)))) {
    return [
      `${serviceFolderOf(name)}/ already exists. Change that service, or pick another name.`
    ]
  }
  return []
}

const newServiceWarnings = (name, { upstreamHas }) => [
  ...(upstreamHas(name) === null
    ? [
        'Could not check the real plants service: upstream/main is not fetched here. Run git fetch upstream main to check the name.'
      ]
    : []),
  ...(ANIMALS_SERVICES.includes(name)
    ? [
        `The animals frontend has a service called ${name}. Say so in the hand-off: the real team may want to share it.`
      ]
    : [])
]

/**
 * Makes a new prototype-owned service.
 *
 * @returns {{ status: number, lines: string[] }}
 */
export const newService = (
  args,
  {
    root = REPO_ROOT,
    upstreamHas = (name) => upstreamHasService(name, { root }),
    tidy = (files) => tidyFiles(files, { root })
  } = {}
) => {
  const problems = newServiceProblems(args, { root, upstreamHas })
  if (problems.length > 0) {
    return refuse(problems)
  }
  const { name } = args
  const folder = serviceFolderOf(name)
  mkdirSync(path.join(root, folder), { recursive: true })
  const written = Object.entries(filesFor(args)).map(([file, content]) => {
    const relative = `${folder}/${file}`
    writeFileSync(path.join(root, relative), content)
    return relative
  })
  tidy(written)
  addOwnedPaths(overridesPathOf(root), [ownedGlobOf(name)])
  return {
    status: 0,
    lines: [
      ...newServiceWarnings(name, { upstreamHas }),
      `Made ${folder}/: ${written.map((file) => path.basename(file)).join(', ')}.`,
      `Added ${ownedGlobOf(name)} to ours in overrides.json, so the weekly update leaves it alone.`,
      `Check it: npm test -- ${folder} --coverage.enabled=false`,
      `A page in a release imports it as '../../../../../../services/${name}/index.js'.`
    ]
  }
}

const filesUnder = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        return entry.isDirectory() ? filesUnder(full) : [full]
      })
    : []

/** Files in a set that import the service, as repo-relative paths. */
export const importersOf = (name, { root = REPO_ROOT } = {}) => {
  const needle = `services/${name}/`
  return filesUnder(path.join(root, 'src/server/app/sets'))
    .filter((file) => file.endsWith('.js'))
    .filter((file) => readFileSync(file, 'utf8').includes(needle))
    .map((file) => path.relative(root, file).split(path.sep).join('/'))
}

/**
 * Deletes a prototype-owned service and its `ours` line.
 *
 * @returns {{ status: number, lines: string[] }}
 */
export const retireService = ({ name, force }, { root = REPO_ROOT } = {}) => {
  const owned = ownedServiceNames(readOverrides({ root }))
  if (!name || !owned.includes(name)) {
    return refuse([
      `${name ?? 'That'} is not a prototype-owned service. The prototype-owned services are: ${owned.join(', ') || 'none'}.`
    ])
  }
  const importers = importersOf(name, { root })
  if (importers.length > 0 && !force) {
    return refuse([
      `These pages still use ${name}. Change them first, or run retire again with --force:`,
      ...importers.map((file) => `  ${file}`)
    ])
  }
  rmSync(path.join(root, serviceFolderOf(name)), {
    recursive: true,
    force: true
  })
  removeOwnedPaths(overridesPathOf(root), [ownedGlobOf(name)])
  return {
    status: 0,
    lines: [
      `Deleted ${serviceFolderOf(name)}/ and took ${ownedGlobOf(name)} out of ours in overrides.json.`
    ]
  }
}

/**
 * Lists every prototype-owned service with what it needs.
 *
 * @returns {Promise<{ status: number, lines: string[] }>}
 */
export const listServices = async ({ root = REPO_ROOT } = {}) => {
  const services = await describeServices({ root })
  if (services.length === 0) {
    return { status: 0, lines: ['There are no prototype-owned services.'] }
  }
  return {
    status: 0,
    lines: services.flatMap((service) => [
      `${service.name} (${service.contract?.owner ?? 'owner not given'}): ${service.folder}/`,
      `  Needs a real service: ${service.needsARealService ?? service.problem ?? 'not given'}`
    ])
  }
}

/** Runs the command. */
export const run = async (argv, options = {}) => {
  const args = parseArgs(argv)
  if (args.help || !args.command) {
    return { status: 0, lines: [USAGE] }
  }
  if (args.command === 'new') {
    return newService(args, options)
  }
  if (args.command === 'list') {
    return listServices(options)
  }
  if (args.command === 'retire') {
    return retireService(args, options)
  }
  return refuse([`There is no "${args.command}" command.`, '', USAGE])
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { status, lines } = await run(process.argv.slice(2))
  console.log(lines.join('\n'))
  process.exitCode = status
}
