/**
 * Reads a prototype-owned service (`src/server/app/services/<name>/`) for
 * the hand-off: its `contract.json`, the files that travel to
 * plants-frontend as proposed, and the one prototype-only import its
 * `stub.js` keeps.
 *
 * `contract.json` is read as plain JSON, never run: it carries the service's
 * owner, base URL, operations, record shape, examples, open questions and
 * notes as data. `index.js` and `client.js` are read only as text, for the
 * mode-switch rewrite and the prototype-only import check.
 */
import { relativeImportsOf } from './impact.js'

const PROTOTYPE_ONLY_DIR = /^src\/server\/prototype-(support|data)\//

/** The prototype-only mode switch, and the name plants-frontend's barrels use. */
export const PROTOTYPE_MODE_SWITCH = 'isStubDataMode'
export const REAL_MODE_SWITCH = 'isStubMode'

/**
 * A service's `contract.json`, parsed as data, or nulls when it is missing
 * or is not valid JSON.
 *
 * @param {string|null} source - the file's text, or null when it does not
 * exist.
 * @returns {{ contract: object|null, needs: string|null }}
 */
export const readContract = (source) => {
  if (!source) {
    return { contract: null, needs: null }
  }
  try {
    const parsed = JSON.parse(source)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { contract: null, needs: null }
    }
    return {
      contract: parsed,
      needs:
        typeof parsed.needsARealService === 'string'
          ? parsed.needsARealService
          : null
    }
  } catch {
    return { contract: null, needs: null }
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
    stub: `${dir}/stub.js`,
    contract: `${dir}/contract.json`
  }
  const index = read(files.index)
  const client = read(files.client)
  const stub = read(files.stub)
  const { contract, needs } = readContract(read(files.contract))
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
    contract,
    contractReadable: contract !== null,
    needs,
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
