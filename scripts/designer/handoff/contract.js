/**
 * Reads a prototype-owned service (`src/server/app/services/<name>/`) for the
 * hand-off: its `CONTRACT` and `NEEDS_A_REAL_SERVICE` exports, the files that
 * travel to plants-frontend as proposed, and the one prototype-only import
 * its `stub.js` keeps.
 *
 * `index.js` is read as data, never run: its imports are stood in for by
 * empty names, so reading it touches no store, no config and no network.
 * `CONTRACT` must therefore be a plain object literal (it may name other
 * constants declared in the same file).
 */
import vm from 'node:vm'

import { relativeImportsOf } from './impact.js'

const EVAL_TIMEOUT_MS = 1000

const IMPORT_STATEMENT =
  /^import\s+(?:([^'";]*?)\s+from\s+)?['"][^'"\n]+['"][ \t]*;?[ \t]*$/gm

const PROTOTYPE_ONLY_DIR = /^src\/server\/prototype-(support|data)\//

/** The prototype-only mode switch, and the name plants-frontend's barrels use. */
export const PROTOTYPE_MODE_SWITCH = 'isStubDataMode'
export const REAL_MODE_SWITCH = 'isStubMode'

/** The names an import statement binds: default, namespace and named. */
const boundNames = (clause) => {
  if (!clause) {
    return []
  }
  const names = []
  const named = /\{([^}]*)\}/.exec(clause)
  if (named) {
    for (const part of named[1].split(',')) {
      const name = part
        .trim()
        .split(/\s+as\s+/)
        .at(-1)
        ?.trim()
      if (name) {
        names.push(name)
      }
    }
  }
  const outside = clause.replace(/\{[^}]*\}/, '')
  for (const part of outside.split(',')) {
    const name = part
      .trim()
      .replace(/^\*\s+as\s+/, '')
      .trim()
    if (/^[A-Za-z_$][\w$]*$/.test(name)) {
      names.push(name)
    }
  }
  return names
}

/**
 * The service module's exports as data, or null when it cannot be read that
 * way. Functions are dropped; only JSON-shaped values are kept.
 *
 * @param {string} source - the service's `index.js`.
 * @returns {{ contract: object|null, needs: string|null } | null}
 */
export const readServiceExports = (source) => {
  if (!source) {
    return null
  }
  const imported = []
  const script = source
    .replace(IMPORT_STATEMENT, (_statement, clause) => {
      imported.push(...boundNames(clause))
      return ''
    })
    .replace(/^export\s+\{[^}]*\}(?:\s+from\s+['"][^'"]+['"])?;?/gm, '')
    .replace(/^export\s+\*\s+from\s+['"][^'"]+['"];?/gm, '')
    .replace(/^export\s+default\s+/gm, 'var __default__ = ')
    .replace(/^export\s+(const|let|var)\s+/gm, 'var ')
    .replace(/^export\s+(async\s+)?function/gm, '$1function')
    .replace(/^export\s+class\s+/gm, 'class ')
  const prelude = imported.length
    ? `var ${[...new Set(imported)].join(', ')};\n`
    : ''
  try {
    const context = vm.createContext({})
    vm.runInContext(`${prelude}${script}`, context, {
      timeout: EVAL_TIMEOUT_MS
    })
    const contract = context.CONTRACT
    const needs = context.NEEDS_A_REAL_SERVICE
    return {
      contract:
        contract && typeof contract === 'object'
          ? JSON.parse(JSON.stringify(contract))
          : null,
      needs: typeof needs === 'string' ? needs : null
    }
  } catch {
    return null
  }
}

/**
 * The prototype-only imports in a service file: anything that resolves into
 * `src/server/prototype-support/` or `src/server/prototype-data/`.
 *
 * @param {string} filePath - repo-relative.
 * @param {string|null} source
 * @returns {string[]} the repo-relative paths it imports.
 */
export const prototypeOnlyImportsOf = (filePath, source) =>
  source
    ? relativeImportsOf(filePath, source).filter((resolved) =>
        PROTOTYPE_ONLY_DIR.test(resolved)
      )
    : []

/**
 * A service file as plants-frontend would have it: the prototype's
 * `isStubDataMode()` (patched into `common/services/mode.js`, see
 * overrides.json) becomes plants-frontend's `isStubMode()`, which its own
 * service barrels ask.
 */
export const asRealServiceFile = (source) =>
  source.replaceAll(PROTOTYPE_MODE_SWITCH, REAL_MODE_SWITCH)

/**
 * Everything the brief and the patch need about one prototype-owned service.
 *
 * @param {string} name - the folder name under `src/server/app/services/`.
 * @param {(filePath: string) => string|null} read - reads a repo-relative
 * file from the working tree, or null.
 * @param {string[]} usedBy - the real-journey files that import it.
 */
export const describeService = (name, read, usedBy) => {
  const dir = `src/server/app/services/${name}`
  const files = {
    index: `${dir}/index.js`,
    client: `${dir}/client.js`,
    stub: `${dir}/stub.js`
  }
  const index = read(files.index)
  const client = read(files.client)
  const stub = read(files.stub)
  const exported = readServiceExports(index)
  return {
    name,
    dir,
    target: dir,
    usedBy: [...new Set(usedBy)].sort(),
    files,
    present: {
      index: index !== null,
      client: client !== null,
      stub: stub !== null
    },
    contract: exported?.contract ?? null,
    contractReadable: exported !== null && exported.contract !== null,
    needs: exported?.needs ?? null,
    stubPrototypeImports: prototypeOnlyImportsOf(files.stub, stub),
    proposedPrototypeImports: [
      ...prototypeOnlyImportsOf(files.index, index),
      ...prototypeOnlyImportsOf(files.client, client)
    ],
    modeSwitchRenamed: [index, client].some((source) =>
      (source ?? '').includes(PROTOTYPE_MODE_SWITCH)
    ),
    proposed: [
      {
        path: files.index,
        after: index === null ? null : asRealServiceFile(index)
      },
      {
        path: files.client,
        after: client === null ? null : asRealServiceFile(client)
      }
    ].filter((file) => file.after !== null)
  }
}
