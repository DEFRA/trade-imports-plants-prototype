/**
 * `npm run designer:format`: tidies every file the way `npm run format` does
 * (the same Prettier globs), but prints only what it changed, not a line for
 * every file it left alone. `npm run format` prints about 80 KB each run,
 * which floods a designer's terminal and an agent's context.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { REPO_ROOT } from '../lib/repo.js'

const PRETTIER = path.join(REPO_ROOT, 'node_modules/prettier/bin/prettier.cjs')

/** The same globs as the `format` script in package.json. */
export const GLOBS = Object.freeze([
  'src/**/*.js',
  '**/*.{js,cjs,md,json,config.js,test.js}'
])

/**
 * The Prettier arguments: write, list only the files it changed. No
 * `--log-level warn`: Prettier prints the changed files at its normal log
 * level, so a quieter level hid them and every run said "already tidy".
 */
export const prettierArgs = () => [
  PRETTIER,
  '--write',
  '--list-different',
  ...GLOBS
]

/** Prettier's list of changed files, as the lines to print. */
export const summarise = (stdout) => {
  const tidied = String(stdout)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
  if (tidied.length === 0) {
    return ['Every file was already tidy.']
  }
  return [
    `Tidied ${tidied.length} file${tidied.length === 1 ? '' : 's'}:`,
    ...tidied.map((file) => `  ${file}`)
  ]
}

/**
 * Tidies every file under `root` and says which ones it changed.
 *
 * @returns {{ status: number, lines: string[], stderr: string }}
 */
export const tidyAll = ({ root = REPO_ROOT } = {}) => {
  const result = spawnSync(process.execPath, prettierArgs(), {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })
  return {
    status: result.status ?? 1,
    lines: summarise(result.stdout),
    stderr: result.stderr ?? ''
  }
}

/**
 * Tidies the named files the way `npm run format` would, so a generated file
 * is saved as Prettier leaves it. Quiet; a failure leaves the file as written.
 *
 * @returns {boolean} whether Prettier ran cleanly.
 */
export const tidyFiles = (files, { root = REPO_ROOT } = {}) => {
  const result = spawnSync(
    process.execPath,
    [PRETTIER, '--write', '--log-level', 'warn', ...files],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  )
  return result.status === 0
}

export const main = ({ root = REPO_ROOT } = {}) => {
  const { status, lines, stderr } = tidyAll({ root })
  if (stderr) {
    process.stderr.write(stderr)
  }
  console.log(lines.join('\n'))
  return status
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main()
}
