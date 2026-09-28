/**
 * Pure glob matching and override classification for the upstream sync.
 * No git, no filesystem, no child processes - everything here is a plain
 * function over strings and the parsed overrides.json shape, so it can be
 * unit tested without a repository at all.
 */

const escapeRegExpLiteral = (character) =>
  character.replace(/[.+^${}()|[\]\\]/g, '\\$&')

/**
 * Converts a glob pattern to a RegExp. Supports `*` (any run of characters
 * within one path segment) and `**` (any run of characters, including `/`).
 * Nothing fancier than that - overrides.json never needs brace expansion,
 * character classes or negation.
 */
export const globToRegExp = (pattern) => {
  let source = ''
  let index = 0
  while (index < pattern.length) {
    if (pattern.startsWith('**', index)) {
      source += '.*'
      index += 2
    } else if (pattern[index] === '*') {
      source += '[^/]*'
      index += 1
    } else {
      source += escapeRegExpLiteral(pattern[index])
      index += 1
    }
  }
  return new RegExp(`^${source}$`)
}

export const matchesGlob = (pattern, filePath) =>
  globToRegExp(pattern).test(filePath)

export const matchesAnyGlob = (patterns, filePath) =>
  patterns.some((pattern) => matchesGlob(pattern, filePath))

const patchedPatterns = (overrides) =>
  overrides.patched.map((entry) => entry.path)

/**
 * Which rule applies to a path: 'deleted' and 'ours' are the two rules the
 * sync script actively enforces; 'patched' covers both the paths named in
 * overrides.json and everything else the merge touches, which is meant to
 * merge normally either way.
 */
export const classifyPath = (filePath, overrides) => {
  if (matchesAnyGlob(overrides.deleted, filePath)) {
    return 'deleted'
  }
  if (matchesAnyGlob(overrides.ours, filePath)) {
    return 'ours'
  }
  return 'patched'
}

const SERVICE_FOLDER = /^src\/server\/app\/services\/([^/]+)\//

/**
 * The prototype-owned service a path sits in, or null. Only a folder that
 * `ours` lists on its own line, as `src/server/app/services/<name>/**`,
 * counts: every other services folder belongs to the real service.
 */
export const prototypeServiceOf = (filePath, overrides) => {
  const name = SERVICE_FOLDER.exec(filePath)?.[1]
  return name && overrides.ours.includes(`src/server/app/services/${name}/**`)
    ? name
    : null
}

/** Status codes for a path our side does not have: added only upstream
 * (`A ` staged cleanly, `UA` left unmerged), or deleted by us while upstream
 * changed it (`DU`). */
const NOT_ON_OUR_SIDE = new Set(['A ', 'UA', 'DU'])

const UNMERGED = new Set(['UU', 'AA', 'DD', 'AU', 'UA', 'UD', 'DU'])

const keepOurSide = (code) => {
  if (NOT_ON_OUR_SIDE.has(code)) {
    return 'remove'
  }
  return UNMERGED.has(code) ? 'checkout-ours' : 'checkout-head'
}

/**
 * What the sync does to a path an `ours` glob covers, from its
 * `git status --porcelain` code after the merge.
 *
 * - `checkout-head` puts back our committed file (a clean upstream change).
 * - `checkout-ours` takes our side of a conflict (an add/add clash
 *   included).
 * - `remove` drops a path our side does not have (added only upstream, or
 *   deleted by us), so `ours` stays in charge. `git checkout HEAD` would fail
 *   on it: HEAD has no such file.
 * - `leave` is a file git does not track (`??`), which the merge did not
 *   touch.
 * - `service-arrived` means upstream touched a path inside a prototype-owned
 *   service folder: the real service now has a service of that name. Our
 *   side is kept for now (`keep` is one of the three above) and a person
 *   retires the prototype one. Every sync says so until they do.
 *
 * @param {string} code - the two-letter porcelain status.
 * @param {string} filePath - the path.
 * @param {object} overrides - `overrides.json`, parsed.
 * @returns {{ action: string, keep?: string, service?: string }}
 */
export const oursAction = (code, filePath, overrides) => {
  if (code === '??') {
    return { action: 'leave' }
  }
  const keep = keepOurSide(code)
  const service = prototypeServiceOf(filePath, overrides)
  return service
    ? { action: 'service-arrived', keep, service }
    : { action: keep }
}

/**
 * Paths declared in more than one list, so a change to overrides.json can be
 * checked for internal consistency without needing a repository to compare
 * against. Two glob patterns are treated as overlapping only when they (or
 * one of their prefixes) are identical - true glob-vs-glob intersection is
 * checked instead against the real tree, in overrides.test.js.
 */
export const declaredOverlaps = (overrides) => {
  const lists = {
    deleted: overrides.deleted,
    ours: overrides.ours,
    patched: patchedPatterns(overrides)
  }
  const seen = new Map()
  const overlaps = []
  for (const [listName, patterns] of Object.entries(lists)) {
    for (const pattern of patterns) {
      const owner = seen.get(pattern)
      if (owner && owner !== listName) {
        overlaps.push({ pattern, lists: [owner, listName] })
      }
      seen.set(pattern, owner ?? listName)
    }
  }
  return overlaps
}
