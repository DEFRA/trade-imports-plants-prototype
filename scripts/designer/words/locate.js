const INDENT_STEP = 2

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const leadingSpaces = (line) => line.length - line.trimStart().length

const keyPattern = (key) => {
  const escaped = escapeRegExp(key)
  return new RegExp(`^(?:'${escaped}'|"${escaped}"|${escaped})\\s*:`)
}

const findKeyLine = (lines, from, key, indent) => {
  const pattern = keyPattern(key)
  for (let index = from; index < lines.length; index += 1) {
    const line = lines[index]
    const spaces = leadingSpaces(line)
    if (line.trim() !== '' && spaces < indent) {
      return -1
    }
    if (spaces === indent && pattern.test(line.trimStart())) {
      return index
    }
  }
  return -1
}

/**
 * The 1-based line a copy leaf is declared on, found in the module's source.
 *
 * Copy modules are Prettier-formatted, so a key's depth is its indent: a
 * top-level key of `export const copy = {` sits 2 spaces in, its children 4,
 * and so on. The search walks the key path one segment at a time, each at its
 * own depth and inside its parent's block. When a segment cannot be found (an
 * array index, or an odd layout) it stops at the deepest line it did find.
 *
 * @param {string} source - the module's source text.
 * @param {string} exportName - the export holding the leaf, usually 'copy'.
 * @param {string} keyPath - the dotted path inside that export.
 * @returns {number} the 1-based line number.
 */
export const locateKeyLine = (source, exportName, keyPath) => {
  const lines = source.split('\n')
  const exportPattern = new RegExp(
    `^export const ${escapeRegExp(exportName)}\\b`
  )
  const start = Math.max(
    0,
    lines.findIndex((line) => exportPattern.test(line))
  )
  let found = start
  const segments = keyPath.split('.')
  for (const [depth, segment] of segments.entries()) {
    const line = findKeyLine(
      lines,
      found + 1,
      segment,
      INDENT_STEP * (depth + 1)
    )
    if (line === -1) {
      break
    }
    found = line
  }
  return found + 1
}
