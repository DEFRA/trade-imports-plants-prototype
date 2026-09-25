/**
 * Thin process-running layer for the sync's post-merge checks. Each function
 * runs one command and reports pass/fail plus a short detail for the
 * summary - never throws, so one failing check doesn't stop the others
 * running.
 */
import { spawnSync } from 'node:child_process'

const OUTPUT_TAIL_LINES = 20

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

export const runNpmCi = (cwd) =>
  runCommand('npm ci', 'npx', ['--yes', 'npm@11.6.2', 'ci'], cwd)

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
