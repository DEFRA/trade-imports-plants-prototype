/**
 * Finds the old GOV.UK Prototype Kit prototype (the GB notification
 * prototype) on this computer and copies one of its pages, with the partials
 * it pulls in, into a port's working folder. No shell, no `find ~`: a few
 * known places are searched a few folders deep, and folders that cannot be
 * read are skipped quietly.
 */
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const KIT_FOLDER = 'GB-notification-service'
export const SETTING_FILE = '.cache/designer/kit-clone.txt'
const VIEWS = 'app/views'
const SEARCH_DEPTH = 3
const SKIPPED = new Set([
  'node_modules',
  'Library',
  'Applications',
  'Pictures',
  'Music',
  'Movies'
])
const INCLUDE = /\{%-?\s*include\s+["']([^"']+)["']/g
const DESIGN_RELEASE_FOLDER = /^design-release-/

/** True when `dir` looks like a Prototype Kit clone of the old prototype. */
export const isKitClone = (dir) =>
  Boolean(dir) && existsSync(path.join(dir, VIEWS))

const childFolders = (dir) => {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          !entry.name.startsWith('.') &&
          !SKIPPED.has(entry.name)
      )
      .map((entry) => path.join(dir, entry.name))
  } catch {
    return []
  }
}

/** Every folder named GB-notification-service up to `depth` levels below. */
const searchUnder = (base, depth) => {
  const found = []
  let level = [base]
  for (let step = 0; step <= depth && level.length > 0; step++) {
    const next = []
    for (const dir of level) {
      if (path.basename(dir) === KIT_FOLDER && isKitClone(dir)) {
        found.push(dir)
      } else {
        next.push(...childFolders(dir))
      }
    }
    level = next
  }
  return found
}

/**
 * The places to look, most likely first: the folder remembered from last
 * time, beside this prototype and its parent folders, then the usual code
 * folders in the home folder.
 */
export const searchBases = ({ repoRoot, home = os.homedir() }) => [
  path.dirname(repoRoot),
  path.dirname(path.dirname(repoRoot)),
  path.dirname(path.dirname(path.dirname(repoRoot))),
  ...[
    'git',
    'code',
    'src',
    'projects',
    'dev',
    'repos',
    'Documents',
    'Desktop'
  ].map((name) => path.join(home, name))
]

const remembered = (repoRoot) => {
  const file = path.join(repoRoot, SETTING_FILE)
  if (!existsSync(file)) {
    return null
  }
  const dir = readFileSync(file, 'utf8').trim()
  return isKitClone(dir) ? dir : null
}

/** Remembers the clone for next time, in `.cache/` (never saved in git). */
export const rememberClone = (repoRoot, dir) => {
  const file = path.join(repoRoot, SETTING_FILE)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, `${dir}\n`)
}

/**
 * Every clone of the old prototype found, the remembered one first.
 *
 * @returns {string[]} absolute folder paths.
 */
export const findKitClones = ({ repoRoot, home, depth = SEARCH_DEPTH }) => {
  const found = []
  const add = (dir) => {
    if (dir && !found.includes(dir)) {
      found.push(dir)
    }
  }
  const searched = []
  for (const base of searchBases({ repoRoot, home })) {
    if (existsSync(base)) {
      searched.push(...searchUnder(base, depth))
    }
  }
  add(remembered(repoRoot))
  searched
    .map((dir) => ({ dir, at: lastChanged(dir, '') }))
    .sort((a, b) => b.at - a.at)
    .forEach(({ dir }) => add(dir))
  return found
}

const lastChanged = (clone, folder) => {
  try {
    const out = execFileSync(
      'git',
      ['log', '-1', '--format=%ct', '--', `${VIEWS}/${folder}`],
      { cwd: clone, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim()
    return out ? Number(out) : 0
  } catch {
    return 0
  }
}

/**
 * The design-release folder under `app/views` that changed most recently:
 * the current design. Falls back to the last by name, then the top level.
 */
export const currentFolder = (clone) => {
  const folders = childFolders(path.join(clone, VIEWS))
    .map((dir) => path.basename(dir))
    .filter((name) => DESIGN_RELEASE_FOLDER.test(name))
    .sort()
  if (folders.length === 0) {
    return ''
  }
  const dated = folders.map((name) => ({ name, at: lastChanged(clone, name) }))
  // Sorted by name, so on a tie (one commit touched both) the later release wins.
  const newest = dated.reduce((best, item) =>
    item.at >= best.at ? item : best
  )
  return newest.at > 0 ? newest.name : folders.at(-1)
}

/** The pages (`.html` files) in one folder of `app/views`, without `.html`. */
export const pagesIn = (clone, folder) => {
  try {
    return readdirSync(path.join(clone, VIEWS, folder), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
      .map((entry) => entry.name.replace(/\.html$/, ''))
      .sort()
  } catch {
    return []
  }
}

const readPage = (clone, relative, saved) => {
  if (saved) {
    try {
      return execFileSync('git', ['show', `HEAD:${VIEWS}/${relative}`], {
        cwd: clone,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      })
    } catch {
      return null
    }
  }
  const file = path.join(clone, VIEWS, relative)
  return existsSync(file) ? readFileSync(file, 'utf8') : null
}

/** The partials a page includes, as paths under `app/views`. */
export const includesOf = (html) =>
  [...html.matchAll(INCLUDE)].map((match) => match[1])

/**
 * Copies one page, and every partial it includes (and theirs), to
 * `.cache/designer/port/<release>/<slug>/`: the page as `source.html`, each
 * partial under `included/` with its path under `app/views`.
 *
 * @returns {{ source: string, from: string, partials: string[], missing: string[] }}
 * repo-relative paths written, the page it came from, and includes not found.
 */
export const copyKitPage = ({
  repoRoot,
  clone,
  page,
  folder,
  release,
  slug,
  saved = false
}) => {
  const name = page.replace(/\.html$/, '')
  const relative = folder ? `${folder}/${name}.html` : `${name}.html`
  const html = readPage(clone, relative, saved)
  if (html === null) {
    const pages = pagesIn(clone, folder)
    throw new Error(
      `There is no page called "${name}" in ${VIEWS}/${folder || '(top level)'}. Its pages are: ${pages.join(', ')}.`
    )
  }
  const outDir = path.join('.cache/designer/port', release, slug ?? name)
  mkdirSync(path.join(repoRoot, outDir), { recursive: true })
  writeFileSync(path.join(repoRoot, outDir, 'source.html'), html)
  const partials = []
  const missing = []
  const queue = includesOf(html)
  while (queue.length > 0) {
    const include = queue.shift()
    if (partials.some((done) => done.endsWith(include))) {
      continue
    }
    const content = readPage(clone, include, saved)
    if (content === null) {
      missing.push(include)
      continue
    }
    const target = path.join(outDir, 'included', include)
    mkdirSync(path.join(repoRoot, path.dirname(target)), { recursive: true })
    writeFileSync(path.join(repoRoot, target), content)
    partials.push(target)
    queue.push(...includesOf(content))
  }
  return {
    source: path.join(outDir, 'source.html'),
    from: path.join(clone, VIEWS, relative),
    partials,
    missing
  }
}
