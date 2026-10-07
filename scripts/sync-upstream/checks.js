/**
 * Thin process-running layer for the sync's post-merge checks. Each function
 * runs one command and reports pass/fail plus a short detail for the
 * summary - never throws, so one failing check doesn't stop the others
 * running.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const OUTPUT_TAIL_LINES = 20

// The same rule as scripts/npm-version.js: Corepack allows a `+sha512...`
// suffix, which npm itself rejects.
const NPM_SPEC = /^npm@\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/

const tail = (text) =>
  text.split('\n').slice(-OUTPUT_TAIL_LINES).join('\n').trim()

const runCommand = (name, command, args, cwd) => {
  const result = spawnSync(command, args, { encoding: 'utf8', cwd })
  const passed = result.status === 0
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  return {
    name,
    passed,
    detail: passed ? undefined : tail(output)
  }
}

/**
 * The command and arguments for a clean install with the npm that
 * package.json's `packageManager` pins, so an upstream npm bump the merge
 * brings in is the npm the check uses. Plain `npm ci` when it names no npm.
 *
 * @param {unknown} packageManager - the `packageManager` field, as read
 * @returns {{ command: string, args: string[] }}
 */
export const npmCiCommandFor = (packageManager) => {
  const [spec] = String(packageManager ?? '').split('+')
  return NPM_SPEC.test(spec)
    ? { command: 'npx', args: ['--yes', spec, 'ci'] }
    : { command: 'npm', args: ['ci'] }
}

const readPackageManager = (cwd) => {
  try {
    return JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'))
      .packageManager
  } catch {
    return undefined
  }
}

export const runNpmCi = (cwd) => {
  const { command, args } = npmCiCommandFor(readPackageManager(cwd))
  return runCommand('npm ci', command, args, cwd)
}

export const runLint = (cwd) => runCommand('lint', 'npm', ['run', 'lint'], cwd)

export const runUnitTests = (cwd) =>
  runCommand('unit tests', 'npm', ['test'], cwd)

export const runSetBootCheck = (cwd) =>
  runCommand('set boot check (test:fit)', 'npm', ['run', 'test:fit'], cwd)

const skipped = (name) => ({
  name,
  passed: false,
  detail: 'skipped - npm ci failed'
})

export const runAllChecks = (cwd) => {
  const npmCi = runNpmCi(cwd)
  if (!npmCi.passed) {
    return [
      npmCi,
      skipped('lint'),
      skipped('unit tests'),
      skipped('set boot check (test:fit)')
    ]
  }
  return [npmCi, runLint(cwd), runUnitTests(cwd), runSetBootCheck(cwd)]
}
