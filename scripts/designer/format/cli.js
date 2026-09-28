/**
 * `npm run designer:format`: tidies every file the way `npm run format` does
 * (the same Prettier globs), but prints only what it changed, not a line for
 * every file it left alone. `npm run format` prints about 80 KB each run,
 * which floods a designer's terminal and an agent's context.
 */
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { REPO_ROOT } from '../lib/repo.js'

const PRETTIER = 'node_modules/prettier/bin/prettier.cjs'

/** The same globs as the `format` script in package.json. */
export const GLOBS = Object.freeze([
  'src/**/*.js',
  '**/*.{js,cjs,md,json,config.js,test.js}'
])

/** The Prettier arguments: write, list only the files it changed. */
export const prettierArgs = () => [
  PRETTIER,
  '--write',
  '--list-different',
  '--log-level',
  'warn',
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

export const main = ({ root = REPO_ROOT } = {}) => {
  const result = spawnSync(process.execPath, prettierArgs(), {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })
  if (result.stderr) {
    process.stderr.write(result.stderr)
  }
  console.log(summarise(result.stdout).join('\n'))
  return result.status ?? 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main()
}
