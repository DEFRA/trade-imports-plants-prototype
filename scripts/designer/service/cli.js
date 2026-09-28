/**
 * `npm run designer:service -- new|list|retire`
 *
 * Makes, lists and retires prototype-owned services: services the real
 * plants service does not have yet, built in its own shape (`index.js`
 * picks `stub.js` or `client.js`, and `contract.json` carries the owner,
 * operations and open questions as data). A platform service (the default)
 * goes under `src/server/app/services/<name>/`, with its own line in
 * `overrides.json`'s `ours`; a set-owned one goes under
 * `src/server/app/sets/<release>/services/<name>/`, owned by that release
 * alone.
 *
 *   new <name> --owner <plants-backend|address-book|reference-data|ins-backend|dynamics-gateway|new-api>
 *              --describe "<text>" [--scope platform|set --set <release>]
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
import { OWNER_IDS, filesFor } from './templates.js'

/**
 * Every prototype-owned service, with what it says it needs, read from its
 * own `contract.json` — never by importing `index.js`, which would run the
 * service's own module-load side effects.
 *
 * @param {object} [options]
 * @param {string} [options.root] - the repo root.
 * @returns {Array<{ name: string, folder: string, needsARealService: string|null, contract: object|null, problem?: string }>}
 * one entry per service. `problem` says why a service could not be read.
 */
const describeOwnedServices = ({ root = REPO_ROOT } = {}) =>
  ownedServiceNames(readOverrides({ root })).map((name) => {
    const folder = serviceFolderOf(name)
    const contractFile = path.join(root, folder, 'contract.json')
    const entry = { name, folder, needsARealService: null, contract: null }
    if (!existsSync(contractFile)) {
      return { ...entry, problem: `${folder}/contract.json does not exist` }
    }
    try {
      const contract = JSON.parse(readFileSync(contractFile, 'utf8'))
      return {
        ...entry,
        needsARealService: contract.needsARealService ?? null,
        contract
      }
    } catch (error) {
      return { ...entry, problem: error.message }
    }
  })

export const USAGE = [
  'Usage: npm run designer:service -- <command>',
  '',
  `  new <name> --owner <${OWNER_IDS.join('|')}> --describe "<what the real service would need to do>" [--scope platform|set --set <release>]`,
  '             makes a prototype-owned service. --scope platform (the default) makes it in',
  '             src/server/app/services/<name>/, shared by every set. --scope set --set <release>',
  '             makes it in src/server/app/sets/<release>/services/<name>/, owned by that release',
  '             alone: no overrides.json line, and no clash with the real service to check.',
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

/** argv in, `{ command, name, owner, describe, scope, set, force, help }`
 * out. `scope` defaults to `'platform'` when `--scope` is left out, which
 * keeps every existing call working unchanged. */
export const parseArgs = (argv) => {
  const valueOf = (flag) => {
    const index = argv.indexOf(flag)
    return index === -1 ? undefined : argv[index + 1]
  }
  const flagValues = new Set(
    ['--owner', '--describe', '--scope', '--set'].map(valueOf).filter(Boolean)
  )
  const words = argv.filter(
    (arg) => !arg.startsWith('--') && !flagValues.has(arg)
  )
  return {
    command: words[0],
    name: words[1],
    owner: valueOf('--owner'),
    describe: valueOf('--describe'),
    scope: valueOf('--scope') ?? 'platform',
    set: valueOf('--set'),
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

/** Where a service's folder goes: shared by every set (the default), or
 * owned by one release alone, under its own `services/`. */
export const serviceFolderFor = ({ name, scope, set }) =>
  scope === 'set'
    ? `src/server/app/sets/${set}/services/${name}`
    : serviceFolderOf(name)

const scopeProblems = ({ scope, set }, { root }) => {
  if (scope !== 'platform' && scope !== 'set') {
    return [`--scope must be platform or set, not "${scope}".`]
  }
  if (scope !== 'set') {
    return []
  }
  if (!set) {
    return ['Say which release owns the service with --set <release>.']
  }
  if (!existsSync(path.join(root, `src/server/app/sets/${set}`))) {
    return [`There is no release called ${set} (src/server/app/sets/${set}/).`]
  }
  return []
}

const newServiceProblems = (args, { root, upstreamHas }) => {
  const { name, owner, describe, scope } = args
  if (!name || !isKebabCase(name)) {
    return [
      'Give the service a name in lower-case words joined by hyphens, like saved-vehicles.'
    ]
  }
  if (!OWNER_IDS.includes(owner)) {
    return [
      `Say who would own the real service with --owner: ${OWNER_IDS.join(', ')}.`
    ]
  }
  if (!describe || describe.trim() === '') {
    return [
      'Say in one sentence what the real service would need to do, with --describe "…".'
    ]
  }
  const scoped = scopeProblems(args, { root })
  if (scoped.length > 0) {
    return scoped
  }
  if (REMOVED_BY_THE_REAL_SERVICE.includes(name)) {
    return [
      `The real plants service removed a service called ${name} on purpose. Pick another name, and talk to the plants team before bringing it back.`
    ]
  }
  if (scope === 'platform' && upstreamHas(name) === true) {
    return [
      `The real plants service already has ${serviceFolderOf(name)}/. Use it (its index.js), and do not make a prototype copy.`
    ]
  }
  if (existsSync(path.join(root, serviceFolderFor(args)))) {
    return [
      `${serviceFolderFor(args)}/ already exists. Change that service, or pick another name.`
    ]
  }
  return []
}

const newServiceWarnings = (name, scope, { upstreamHas }) => [
  ...(scope === 'platform' && upstreamHas(name) === null
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
 * Makes a new prototype-owned service: shared by every set under
 * `src/server/app/services/<name>/` (`--scope platform`, the default), or
 * owned by one release alone under `src/server/app/sets/<set>/services/<name>/`
 * (`--scope set --set <release>`). Only a platform service takes an
 * `overrides.json` line: a set-owned one is already inside that release.
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
  const { name, scope } = args
  const folder = serviceFolderFor(args)
  mkdirSync(path.join(root, folder), { recursive: true })
  const written = Object.entries(filesFor(args)).map(([file, content]) => {
    const relative = `${folder}/${file}`
    writeFileSync(path.join(root, relative), content)
    return relative
  })
  tidy(written)
  if (scope === 'platform') {
    addOwnedPaths(overridesPathOf(root), [ownedGlobOf(name)])
  }
  // A feature's controller.js sits six directories under src/server/app for
  // a platform service (sets/<release>/journeys/linear/features/<feature>/),
  // but only four under its own release root for a set-owned one
  // (journeys/linear/features/<feature>/, inside sets/<release>/ already).
  const importPath =
    scope === 'set'
      ? `../../../../services/${name}/index.js`
      : `../../../../../../services/${name}/index.js`
  return {
    status: 0,
    lines: [
      ...newServiceWarnings(name, scope, { upstreamHas }),
      `Made ${folder}/: ${written.map((file) => path.basename(file)).join(', ')}.`,
      ...(scope === 'platform'
        ? [
            `Added ${ownedGlobOf(name)} to ours in overrides.json, so the weekly update leaves it alone.`
          ]
        : [`Owned by ${args.set} alone: no overrides.json line needed.`]),
      `Check it: npm test -- ${folder} --coverage.enabled=false`,
      `A page in the release imports it as '${importPath}'.`
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
  const services = describeOwnedServices({ root })
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
