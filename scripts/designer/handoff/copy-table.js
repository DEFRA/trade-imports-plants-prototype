/**
 * Reads a feature's copy module (`copy.en.js` or `copy.cy.js`) as data, so
 * the brief can show each changed string as old and new text rather than as
 * a diff. Copy modules are plain object literals with no imports, so they are
 * evaluated in an empty sandbox with their `export` keywords removed.
 */
import vm from 'node:vm'

const EVAL_TIMEOUT_MS = 1000

const flatten = (value, prefix, leaves) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, leaves)
    }
    return leaves
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      flatten(child, `${prefix}[${index}]`, leaves)
    )
    return leaves
  }
  leaves[prefix] = typeof value === 'function' ? String(value) : value
  return leaves
}

/**
 * Every leaf of a copy module as `{ 'key.path': value }`. A function leaf
 * (a string built from arguments) is given as its source. Returns null when
 * the module cannot be read this way.
 */
export const copyLeaves = (source) => {
  if (source === null || source === undefined) {
    return {}
  }
  const script = source
    .replace(/^export\s+default\s+/gm, 'var __default__ = ')
    .replace(/^export\s+(const|let|var)\s+/gm, 'var ')
  try {
    const context = vm.createContext({})
    vm.runInContext(script, context, { timeout: EVAL_TIMEOUT_MS })
    const root = context.copy ?? context.__default__
    return root && typeof root === 'object' ? flatten(root, '', {}) : null
  } catch {
    return null
  }
}

/**
 * The strings that changed between two versions of a copy module, one row
 * per key: `{ key, before, after }`, with null for a key that was added or
 * removed. Returns null when either version cannot be read as data.
 */
export const copyChanges = (beforeSource, afterSource) => {
  const before = copyLeaves(beforeSource)
  const after = copyLeaves(afterSource)
  if (before === null || after === null) {
    return null
  }
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
  return keys
    .filter((key) => before[key] !== after[key])
    .map((key) => ({
      key,
      before: before[key] ?? null,
      after: after[key] ?? null
    }))
}

/** True for a feature's English or Welsh copy module. */
export const isCopyFile = (filePath) => /\/copy\.(en|cy)\.js$/.test(filePath)

export const isWelshCopyFile = (filePath) => /\/copy\.cy\.js$/.test(filePath)
