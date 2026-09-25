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
