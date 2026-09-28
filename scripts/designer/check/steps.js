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
import { pathToFileURL } from 'node:url'
import * as prettier from 'prettier'

import { ownershipOf } from '../lib/ownership.js'
import { readOverrides } from '../lib/repo.js'
import { SETS_DIR, setDir } from '../lib/sets.js'
import {
  checkSetCopy,
  describeCopyProblem
} from '../../../src/server/prototype-checks/copy-shape.js'
import { checkCopyUsage } from '../../../src/server/prototype-checks/copy-usage.js'
import {
  describeFrozenChange,
  frozenReleaseChanges
} from '../../../src/server/prototype-checks/frozen-releases.js'
import { advisoryLinesForCopy } from '../../../src/server/prototype-checks/gds-wording.js'
import { checkServiceConformance } from '../../../src/server/prototype-checks/service-conformance.js'
import {
  CHECK_SET_ENV,
  REAL_JOURNEY_SET
} from '../../../src/server/prototype-checks/sets-on-disk.js'
import {
  ownedServiceNames,
  serviceFolderOf
} from '../../../src/server/prototype-support/contracts.js'
import { leaves } from '../../../src/server/app/shared/copy-leaves.js'
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

/**
 * Frozen releases among the changed files: `{ broken, justFrozen }`. A file
 * in a release that was already frozen at the last save breaks the freeze
 * (the pre-commit hook refuses it too). A release whose freeze is itself
 * part of this change is only reported, as "you froze it".
 */
const frozenFindings = (verdicts, root) => {
  const setIds = [
    ...new Set(verdicts.filter((verdict) => verdict.frozen).map((v) => v.setId))
  ]
  const broken = []
  const justFrozen = []
  for (const setId of setIds) {
    const found = frozenReleaseChanges(setId, { repoRoot: root })
    if (!found.freezeCommit) {
      justFrozen.push(setId)
    } else if (found.changed.length > 0) {
      broken.push({ setId, found })
    }
  }
  return { broken, justFrozen }
}

const ownership = ({ root, changedPaths }) => {
  const verdicts = changedPaths.map((repoPath) =>
    ownershipOf(repoPath, { root })
  )
  if (verdicts.length === 0) {
    return result('pass', 'You have not changed any files yet.')
  }
  const { broken, justFrozen } = frozenFindings(verdicts, root)
  const isFrozenEdit = (verdict) =>
    verdict.frozen && !justFrozen.includes(verdict.setId)
  const counts = [
    ...Object.entries(OWNER_WORDS).map(([owner, words]) => [
      verdicts.filter(
        (verdict) => verdict.owner === owner && !isFrozenEdit(verdict)
      ).length,
      words
    ]),
    [verdicts.filter(isFrozenEdit).length, 'in a frozen release']
  ]
    .filter(([count]) => count > 0)
    .map(([count, words]) => `${count} ${words}`)
  const attention = verdicts.filter(
    (verdict) => verdict.owner !== 'yours' && !isFrozenEdit(verdict)
  )
  const frozeLines = justFrozen.map(
    (setId) =>
      `You froze ${setId} in this change. Save the freeze on its own, before any other change.`
  )
  const details = [
    ...frozeLines,
    ...attention.map((verdict) => `${verdict.path}: ${verdict.sentence}`)
  ]
  const summary = [
    `${plural(verdicts.length, 'file')} changed: ${counts.join(', ')}.`,
    ...frozeLines
  ].join(' ')
  if (broken.length > 0) {
    const lines = broken.map(({ setId, found }) =>
      describeFrozenChange(setId, found)
    )
    return result('fail', summary, {
      details,
      output: [...lines, ...details].join('\n')
    })
  }
  return result(attention.length > 0 ? 'warn' : 'pass', summary, {
    details,
    output: details.join('\n')
  })
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
      : `${plural(markers.length, 'piece')} of text still ${markers.length === 1 ? 'needs' : 'need'} Welsh.`
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

const serviceConformance = ({ root }) => {
  // A folder overrides.json lists but that is not on disk at all is a
  // different problem (a fixture, or a service mid-retirement): not this
  // step's to report.
  const owned = ownedServiceNames(readOverrides({ root })).filter((name) =>
    existsSync(path.join(root, serviceFolderOf(name)))
  )
  const { problems } = checkServiceConformance(owned, (name) =>
    path.join(root, serviceFolderOf(name))
  )
  if (problems.length > 0) {
    return result(
      'fail',
      `${plural(problems.length, 'problem')} in your prototype-owned services.`,
      {
        details: problems.map((found) => found.message),
        output: problems
          .map((found) => `service-conformance: ${found.message}`)
          .join('\n')
      }
    )
  }
  return result(
    'pass',
    owned.length === 0
      ? 'There are no prototype-owned services.'
      : `${plural(owned.length, 'service')} match the house shape.`
  )
}

// high-risk-plants reads copy through macro parameters that shadow the
// page's own copy object (see commodities/list and commodities/details),
// which a plain-text scan cannot tell apart from the real thing. Its own
// upstream tests (copy-parity.test.js) already prove its copy.
const copyUsage = async ({ root, setId }) => {
  if (setId === REAL_JOURNEY_SET) {
    return result('pass', 'high-risk-plants proves its own copy upstream.')
  }
  const { problems } = await checkCopyUsage(setDir(setId, { root }))
  if (problems.length > 0) {
    return result(
      'fail',
      `${plural(problems.length, 'problem')} with copy a template reads.`,
      {
        details: problems.map((found) => found.message),
        output: problems
          .map((found) => `copy-usage: ${found.message}`)
          .join('\n')
      }
    )
  }
  return result('pass', 'Every template’s copy resolves.')
}

/** Every `copy.en.js` among the changed paths, read fresh (never cached: a
 * designer's edit since the last check must show). */
const changedEnglishCopy = async (changedPaths, { root }) => {
  const files = changedPaths.filter((repoPath) =>
    repoPath.endsWith('copy.en.js')
  )
  const read = await Promise.all(
    files.map(async (repoPath) => {
      const full = path.join(root, repoPath)
      if (!existsSync(full)) {
        return null
      }
      const loaded = await import(`${pathToFileURL(full).href}?t=${Date.now()}`)
      return { repoPath, copy: loaded.copy }
    })
  )
  return read.filter(Boolean)
}

const gdsWording = async ({ root, changedPaths }) => {
  const files = await changedEnglishCopy(changedPaths, { root })
  const lines = files.flatMap(({ repoPath, copy }) =>
    advisoryLinesForCopy(leaves(copy)).map((line) => `${repoPath}: ${line}`)
  )
  if (lines.length === 0) {
    return result(
      'pass',
      files.length === 0
        ? 'You changed no English copy.'
        : 'No wording notes on your changed English copy.'
    )
  }
  return result('warn', `${plural(lines.length, 'wording note')}.`, {
    details: lines,
    output: lines.join('\n')
  })
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

const ESLINT = 'node_modules/eslint/bin/eslint.js'
const LINTED_EXTENSIONS = new Set(['.js', '.cjs', '.mjs'])

/**
 * ESLint on the code files the designer changed, so a broken code rule (for
 * example a repeated string in an example scenario) shows in the quick
 * check, not only in the pre-commit hook.
 */
const codeRulesOnChanged = async ({ root, changedPaths, runCommand }) => {
  const files = changedPaths.filter(
    (repoPath) =>
      LINTED_EXTENSIONS.has(path.extname(repoPath)) &&
      existsSync(path.join(root, repoPath))
  )
  if (files.length === 0) {
    return result('pass', 'You changed no code files.')
  }
  return commandResult(
    await runCommand(
      process.execPath,
      [ESLINT, '--no-warn-ignored', ...files],
      { cwd: root }
    ),
    `No code rules broken in ${plural(files.length, 'file')} you changed.`
  )
}

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
  'copy-usage': copyUsage,
  templates,
  'code-rules': codeRulesOnChanged,
  'service-conformance': serviceConformance,
  'gds-wording': gdsWording,
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
