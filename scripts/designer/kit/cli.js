/**
 * `npm run designer:kit -- <find|pages|copy>`: find the old Prototype Kit
 * prototype on this computer and copy a page from it for `port-a-kit-page`.
 *
 *   find [--clone <path>]      where the old prototype is (and remember a path)
 *   pages [--folder <folder>]  its pages in the current design folder
 *   copy <page> --release <id> [--slug <slug>] [--folder <folder>] [--saved]
 *                              copy a page and its partials to
 *                              .cache/designer/port/<id>/<slug>/
 */
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { REPO_ROOT } from '../lib/repo.js'
import {
  copyKitPage,
  currentFolder,
  findKitClones,
  isKitClone,
  pagesIn,
  rememberClone
} from './kit.js'

export const USAGE = [
  'Usage:',
  '  npm run designer:kit -- find [--clone <path to GB-notification-service>]',
  '  npm run designer:kit -- pages [--folder <folder under app/views>]',
  '  npm run designer:kit -- copy <page> --release <release-id> [--slug <new-slug>] [--folder <folder>] [--saved]'
].join('\n')

const VALUE_FLAGS = new Set(['--clone', '--folder', '--release', '--slug'])

/** The arguments, parsed. No filesystem, no process. */
export const parseKitArgs = (argv) => {
  const [command, ...rest] = argv
  const flags = {}
  const positional = []
  for (let index = 0; index < rest.length; index++) {
    const arg = rest[index]
    if (VALUE_FLAGS.has(arg)) {
      flags[arg.slice(2)] = rest[index + 1]
      index++
    } else if (arg.startsWith('--')) {
      flags[arg.slice(2)] = true
    } else {
      positional.push(arg)
    }
  }
  return { command, target: positional[0], flags }
}

const NOT_FOUND = [
  'Could not find the old prototype (a folder called GB-notification-service with app/views in it) near this prototype or in your code folders.',
  'Ask the designer where their copy is, then run: npm run designer:kit -- find --clone <that folder>',
  'Never clone it without asking: it is a separate repository (defra-design/GB-notification-service).'
].join('\n')

const cloneFor = (flags, root) => {
  if (flags.clone) {
    const dir = path.resolve(flags.clone)
    if (!isKitClone(dir)) {
      throw new Error(
        `${dir} is not the old prototype: it has no app/views folder.`
      )
    }
    rememberClone(root, dir)
    return dir
  }
  const [first] = findKitClones({ repoRoot: root })
  if (!first) {
    throw new Error(NOT_FOUND)
  }
  return first
}

const runFind = (flags, root) => {
  if (flags.clone) {
    const dir = cloneFor(flags, root)
    return [
      `Found the old prototype at ${dir}, and remembered it.`,
      `Current design folder: app/views/${currentFolder(dir)}`
    ]
  }
  const clones = findKitClones({ repoRoot: root })
  if (clones.length === 0) {
    throw new Error(NOT_FOUND)
  }
  return [
    `Found the old prototype at ${clones[0]}.`,
    ...clones.slice(1).map((dir) => `Another copy: ${dir}`),
    `Current design folder (changed most recently): app/views/${currentFolder(clones[0])}`
  ]
}

const runPages = (flags, root) => {
  const clone = cloneFor(flags, root)
  const folder = flags.folder ?? currentFolder(clone)
  const pages = pagesIn(clone, folder)
  return [
    `Pages in ${clone}/app/views/${folder}:`,
    ...pages.map((page) => `  ${page}`)
  ]
}

const runCopy = (target, flags, root) => {
  if (!target || !flags.release) {
    throw new Error(`Say which page and which release.\n${USAGE}`)
  }
  const clone = cloneFor(flags, root)
  const folder = flags.folder ?? currentFolder(clone)
  const copied = copyKitPage({
    repoRoot: root,
    clone,
    page: target,
    folder,
    release: flags.release,
    slug: flags.slug,
    saved: flags.saved === true
  })
  return [
    `Copied ${copied.from}${flags.saved ? ' (the last saved version)' : ''}`,
    `  to ${copied.source}`,
    ...copied.partials.map((file) => `  and its partial ${file}`),
    ...copied.missing.map(
      (include) =>
        `  Could not find the partial "${include}" it includes: read it in the clone.`
    ),
    `Pass ${copied.source} to the port as source, with sourceKind "html".`
  ]
}

/** Runs one command; returns what to print and the exit code. */
export const runKit = (argv, root = REPO_ROOT) => {
  const { command, target, flags } = parseKitArgs(argv)
  try {
    if (command === 'find') {
      return { code: 0, lines: runFind(flags, root) }
    }
    if (command === 'pages') {
      return { code: 0, lines: runPages(flags, root) }
    }
    if (command === 'copy') {
      return { code: 0, lines: runCopy(target, flags, root) }
    }
    return { code: 1, lines: [USAGE] }
  } catch (error) {
    return { code: 1, lines: [error.message] }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { code, lines } = runKit(process.argv.slice(2))
  console.log(lines.join('\n'))
  process.exitCode = code
}
