import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * House shape for a prototype-owned service folder
 * (`src/server/app/services/<name>/`): a `contract.json` that is valid JSON
 * with at least one operation, and an `index.js` that carries no
 * `CONTRACT`/`NEEDS_A_REAL_SERVICE` export or floating module doc block (the
 * multi-paragraph comment a design settles into once and never updates —
 * `contract.json` is the source of truth instead; a short per-function doc
 * comment is fine and expected).
 */
const CONTRACT_FILE = 'contract.json'
const INDEX_FILE = 'index.js'

// The first non-blank line of index.js is a module doc block when it opens
// a block comment: a leading `/**` (or `/*`) before any import or export.
const LEADING_DOC_BLOCK = /^\s*\/\*/

const problem = (rule, message) => ({ rule, message })

/**
 * `index.js`'s own problems: `CONTRACT`/`NEEDS_A_REAL_SERVICE` exports, and
 * a floating module doc block.
 *
 * @param {string} source - `index.js`'s contents.
 * @returns {{rule: string, message: string}[]}
 */
export const indexFileProblems = (source) => {
  const problems = []
  if (/^export\s+const\s+CONTRACT\b/m.test(source)) {
    problems.push(
      problem(
        'contract-export',
        'index.js exports CONTRACT. Move it into contract.json and delete the export.'
      )
    )
  }
  if (/^export\s+const\s+NEEDS_A_REAL_SERVICE\b/m.test(source)) {
    problems.push(
      problem(
        'needs-export',
        "index.js exports NEEDS_A_REAL_SERVICE. Move the sentence into contract.json's needsARealService and delete the export."
      )
    )
  }
  if (LEADING_DOC_BLOCK.test(source)) {
    problems.push(
      problem(
        'floating-doc-block',
        'index.js opens with a module doc block. Keep only per-function doc comments; the service’s own story belongs in contract.json.'
      )
    )
  }
  return problems
}

/**
 * `contract.json`'s own problems: missing, unreadable, or with no operation.
 *
 * @param {string|null} source - `contract.json`'s contents, or null when the
 * file does not exist.
 * @returns {{rule: string, message: string}[]}
 */
export const contractFileProblems = (source) => {
  if (source === null) {
    return [problem('missing-contract', 'There is no contract.json.')]
  }
  let parsed
  try {
    parsed = JSON.parse(source)
  } catch {
    return [problem('invalid-contract', 'contract.json is not valid JSON.')]
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return [problem('invalid-contract', 'contract.json is not a JSON object.')]
  }
  if (!Array.isArray(parsed.operations) || parsed.operations.length === 0) {
    return [
      problem(
        'no-operations',
        'contract.json lists no operations. Give it at least one.'
      )
    ]
  }
  return []
}

/**
 * Every problem for one service folder, `index.js` and `contract.json`
 * together, `message`s already naming the folder.
 *
 * @param {string} folder - absolute path to the service folder.
 * @param {string} name - the service's folder name, for each message.
 * @returns {{rule: string, message: string}[]}
 */
export const checkServiceFolder = (folder, name) => {
  const indexFile = path.join(folder, INDEX_FILE)
  const contractFile = path.join(folder, CONTRACT_FILE)
  const indexSource = existsSync(indexFile)
    ? readFileSync(indexFile, 'utf8')
    : null
  const contractSource = existsSync(contractFile)
    ? readFileSync(contractFile, 'utf8')
    : null
  const found = [
    ...(indexSource === null ? [] : indexFileProblems(indexSource)),
    ...contractFileProblems(contractSource)
  ]
  return found.map((one) => ({ ...one, message: `${name}: ${one.message}` }))
}

/**
 * Runs `checkServiceFolder` over every prototype-owned service.
 *
 * @param {string[]} serviceNames - folder names under
 * `src/server/app/services/`.
 * @param {(name: string) => string} folderOf - a name to its absolute
 * folder.
 * @returns {{problems: {rule: string, message: string}[]}}
 */
export const checkServiceConformance = (serviceNames, folderOf) => ({
  problems: serviceNames.flatMap((name) =>
    checkServiceFolder(folderOf(name), name)
  )
})
