/**
 * The steps designer:check can run. Each takes
 * `{ setId, root, changedPaths, runCommand }` and answers
 * `{ status, summary, details, output }`:
 *
 * - status: 'pass', 'warn' (advice only, never fails the check) or 'fail'
 * - summary: one plain sentence for the table
 * - details: plain lines shown under the table
 * - output: the raw text, written to the log and read by translate.js
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import * as prettier from 'prettier'

import { ownershipOf } from '../lib/ownership.js'
import { SETS_DIR, setDir } from '../lib/sets.js'
import {
  checkSetCopy,
  describeCopyProblem
} from '../../../src/server/prototype-checks/copy-shape.js'
import { CHECK_SET_ENV } from '../../../src/server/prototype-checks/sets-on-disk.js'
import { checkSetTemplates } from './templates.js'

const PRETTIER_EXTENSIONS = new Set(['.js', '.cjs', '.md', '.json'])
const VITEST = 'node_modules/vitest/vitest.mjs'

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

const result = (status, summary, { details = [], output = '' } = {}) => ({
  status,
  summary,
  details,
  output
})

/**
 * Formats the changed files Prettier looks after, the way `npm run format`
 * would, and reports every file it rewrote. Files it cannot read (a typing
 * slip) fail the step.
 */
export const tidyChangedFiles = async (changedPaths, { root }) => {
  const tidied = []
  const failed = []
  const ignorePath = [
    path.join(root, '.gitignore'),
    path.join(root, '.prettierignore')
  ]
  for (const repoPath of changedPaths) {
    const file = path.join(root, repoPath)
    if (!PRETTIER_EXTENSIONS.has(path.extname(repoPath)) || !existsSync(file)) {
      continue
    }
    const info = await prettier.getFileInfo(file, { ignorePath })
    if (info.ignored || !info.inferredParser) {
      continue
    }
    const source = readFileSync(file, 'utf8')
    try {
      const options = await prettier.resolveConfig(file)
      const formatted = await prettier.format(source, {
        ...options,
        filepath: file
      })
      if (formatted !== source) {
        writeFileSync(file, formatted)
        tidied.push(repoPath)
      }
    } catch (error) {
      failed.push(`Prettier could not tidy ${repoPath}: ${error.message}`)
    }
  }
  return { tidied, failed }
}

const tidy = async ({ root, changedPaths }) => {
  const { tidied, failed } = await tidyChangedFiles(changedPaths, { root })
  if (failed.length > 0) {
    return result('fail', `Could not tidy ${plural(failed.length, 'file')}.`, {
      details: failed.map((line) => line.split('\n')[0]),
      output: failed.join('\n')
    })
  }
  return result(
    'pass',
    tidied.length === 0
      ? 'Nothing needed tidying.'
      : `Tidied ${plural(tidied.length, 'file')}.`,
    {
      details: tidied.map((repoPath) => `Tidied ${repoPath}`),
      output: tidied.join('\n')
    }
  )
}

const OWNER_WORDS = {
  yours: 'yours',
  'shared-on-purpose': 'shared on purpose',
  'real-service': 'belong to the real service',
  removed: 'removed by the weekly update'
}

const ownership = ({ root, changedPaths }) => {
  const verdicts = changedPaths.map((repoPath) =>
    ownershipOf(repoPath, { root })
  )
  if (verdicts.length === 0) {
    return result('pass', 'You have not changed any files yet.')
  }
  const counts = Object.entries(OWNER_WORDS)
    .map(([owner, words]) => [
      verdicts.filter((verdict) => verdict.owner === owner).length,
      words
    ])
    .filter(([count]) => count > 0)
    .map(([count, words]) => `${count} ${words}`)
  const attention = verdicts.filter(
    (verdict) => verdict.owner !== 'yours' || verdict.frozen
  )
  const details = attention.map(
    (verdict) => `${verdict.path}: ${verdict.sentence}`
  )
  return result(
    attention.length > 0 ? 'warn' : 'pass',
    `${plural(verdicts.length, 'file')} changed: ${counts.join(', ')}.`,
    { details, output: details.join('\n') }
  )
}

/** A copy problem for the log, naming the Welsh file so it can be attributed. */
const copyLogLine = (setId, found) =>
  `copy-shape: ${SETS_DIR}/${setId}/${found.folder}/copy.cy.js: ${describeCopyProblem(found)}`

const copy = async ({ root, setId }) => {
  const { copyFolders, problems, markers } = await checkSetCopy(
    setDir(setId, { root })
  )
  const markerLines = markers.map(
    (marker) => `Welsh needed: ${marker.copy} \`${marker.keyPath}\``
  )
  if (problems.length > 0) {
    return result(
      'fail',
      `${plural(problems.length, 'problem')} in the English and Welsh copy.`,
      {
        details: problems.map(describeCopyProblem),
        output: problems.map((found) => copyLogLine(setId, found)).join('\n')
      }
    )
  }
  const waiting =
    markers.length === 0
      ? 'no Welsh is waiting.'
      : `${plural(markers.length, 'piece')} of text still need Welsh.`
  return result(
    'pass',
    `${plural(copyFolders, 'copy folder')} match; ${waiting}`,
    { details: markerLines, output: markerLines.join('\n') }
  )
}

const templates = ({ root, setId }) => {
  const checked = checkSetTemplates(setDir(setId, { root }), { root })
  if (checked.problems.length > 0) {
    return result(
      'fail',
      `${plural(checked.problems.length, 'template problem')}.`,
      {
        details: checked.problems,
        output: checked.problems.map((line) => `njk-check: ${line}`).join('\n')
      }
    )
  }
  return result('pass', `${plural(checked.templates, 'template')} compile.`)
}

const TESTS_PASSED = /Tests\s+(\d+) passed/

const commandResult = ({ code, output }, passSummary) => {
  if (code === 0) {
    const tests = TESTS_PASSED.exec(output)
    return result(
      'pass',
      tests ? `${plural(Number(tests[1]), 'test')} passed.` : passSummary,
      { output }
    )
  }
  return result('fail', 'Failed. See what went wrong below.', { output })
}

const npmStep =
  (script, passSummary) =>
  async ({ root, runCommand }) =>
    commandResult(
      await runCommand('npm', ['run', script], { cwd: root }),
      passSummary
    )

const prototypeChecks = async ({ root, setId, runCommand }) =>
  commandResult(
    await runCommand(
      process.execPath,
      [VITEST, 'run', 'src/server/prototype-checks', '--no-coverage'],
      { cwd: root, env: { TZ: 'UTC', [CHECK_SET_ENV]: setId } }
    ),
    'Every page opens.'
  )

const unitTests = async ({ root, runCommand }) =>
  commandResult(
    await runCommand('npm', ['test'], { cwd: root }),
    'Every unit test passed.'
  )

/** Every step, by id. */
export const STEP_RUNNERS = {
  tidy,
  ownership,
  copy,
  templates,
  'prototype-checks': prototypeChecks,
  'real-journey-tests': npmStep(
    'test:high-risk-plants',
    'The real journey tests passed.'
  ),
  'format-check': npmStep('format:check', 'Every file is tidy.'),
  lint: npmStep('lint', 'No code rules broken.'),
  'unit-tests': unitTests,
  walk: npmStep('test:fit:journeys', 'Every journey walked to the end.')
}
