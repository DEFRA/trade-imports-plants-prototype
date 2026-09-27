import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runCheck } from './run.js'

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url))

const passing = (summary = 'Fine.') => ({
  status: 'pass',
  summary,
  details: [],
  output: ''
})

const fakeRunners = (overrides = {}) => ({
  tidy: vi.fn(async () => passing()),
  ownership: vi.fn(async () => passing()),
  copy: vi.fn(async () => passing()),
  templates: vi.fn(async () => passing()),
  'prototype-checks': vi.fn(async () => passing()),
  'real-journey-tests': vi.fn(async () => passing()),
  'format-check': vi.fn(async () => passing()),
  lint: vi.fn(async () => passing()),
  'unit-tests': vi.fn(async () => passing()),
  walk: vi.fn(async () => passing()),
  ...overrides
})

const options = (runners, tier = 'quick') => ({
  setId: 'plants-working',
  tier,
  root: REPO_ROOT,
  changedPaths: [],
  runCommand: vi.fn(),
  runners
})

describe('runCheck with stand-in steps', () => {
  it('Should pass when every step passes', async () => {
    const result = await runCheck(options(fakeRunners()))

    expect(result.ok).toBe(true)
    expect(result.findings).toEqual([])
    expect(result.steps.map((step) => step.status)).toEqual([
      'pass',
      'pass',
      'pass',
      'pass',
      'pass'
    ])
  })

  it('Should run the pre-commit steps for the full check', async () => {
    const runners = fakeRunners()

    await runCheck(options(runners, 'full'))

    expect(runners['format-check']).toHaveBeenCalledTimes(1)
    expect(runners.lint).toHaveBeenCalledTimes(1)
    expect(runners['unit-tests']).toHaveBeenCalledTimes(1)
    expect(runners.walk).not.toHaveBeenCalled()
  })

  it('Should keep running the quick steps after one fails, but not the slow ones', async () => {
    const runners = fakeRunners({
      copy: vi.fn(async () => ({
        status: 'fail',
        summary: '1 problem.',
        details: [],
        output: 'copy-shape: origin: The Welsh file has no `hint`.'
      }))
    })

    const result = await runCheck(options(runners, 'full'))

    expect(runners.templates).toHaveBeenCalledTimes(1)
    expect(runners.lint).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    expect(result.steps.at(-1)).toMatchObject({
      id: 'unit-tests',
      status: 'skipped'
    })
    expect(result.findings.map((finding) => finding.id)).toEqual(['copy-shape'])
  })

  it('Should treat a warning as advice, not a failure', async () => {
    const runners = fakeRunners({
      ownership: vi.fn(async () => ({ ...passing(), status: 'warn' }))
    })

    expect((await runCheck(options(runners))).ok).toBe(true)
  })

  it('Should leave raw output out of the result but give it to the log', async () => {
    const onOutput = vi.fn()
    const runners = fakeRunners({
      tidy: vi.fn(async () => ({ ...passing(), output: 'Tidied a.js' }))
    })

    const result = await runCheck({ ...options(runners), onOutput })

    expect(onOutput).toHaveBeenCalledWith(
      'Tidy the code layout (Prettier)',
      'Tidied a.js'
    )
    expect(result.steps[0]).not.toHaveProperty('output')
  })
})

describe('runCheck quick on real sets, with the vitest step stood in', () => {
  const vitestPassed = vi.fn(async () => ({
    code: 0,
    output: 'Tests  4 passed (4)'
  }))

  it('Should pass the sample-journey set with nothing changed', async () => {
    const result = await runCheck({
      setId: 'sample-journey',
      tier: 'quick',
      root: REPO_ROOT,
      changedPaths: [],
      runCommand: vitestPassed
    })

    expect(result.findings).toEqual([])
    expect(result.ok).toBe(true)
    expect(vitestPassed).toHaveBeenCalledWith(
      process.execPath,
      [
        'node_modules/vitest/vitest.mjs',
        'run',
        'src/server/prototype-checks',
        '--no-coverage'
      ],
      {
        cwd: REPO_ROOT,
        env: { TZ: 'UTC', DESIGNER_CHECK_SET: 'sample-journey' }
      }
    )
  })
})

describe('runCheck quick on a release with a missing Welsh key', () => {
  let root

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'designer-check-'))
    copyFileSync(
      path.join(REPO_ROOT, 'overrides.json'),
      path.join(root, 'overrides.json')
    )
    const copyFolder = path.join(
      root,
      'src/server/app/sets/plants-working/journeys/linear/features/origin/copy'
    )
    mkdirSync(copyFolder, { recursive: true })
    writeFileSync(
      path.join(root, 'src/server/app/sets/plants-working/set.js'),
      "export const SET_ID = 'plants-working'\n"
    )
    writeFileSync(
      path.join(copyFolder, 'copy.en.js'),
      "export const copy = { heading: 'Origin', hint: 'Where it grew' }\n"
    )
    writeFileSync(
      path.join(copyFolder, 'copy.cy.js'),
      "export const copy = { heading: 'Tarddiad' }\n"
    )
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('Should fail and say, in plain English, how to fix it', async () => {
    const result = await runCheck({
      setId: 'plants-working',
      tier: 'quick',
      root,
      changedPaths: [
        'src/server/app/sets/plants-working/journeys/linear/features/origin/copy/copy.en.js'
      ],
      runCommand: vi.fn(async () => ({ code: 0, output: '' }))
    })

    expect(result.ok).toBe(false)
    const copyStep = result.steps.find((step) => step.id === 'copy')
    expect(copyStep.status).toBe('fail')
    expect(copyStep.details).toEqual([
      "origin: The Welsh file has no `hint`. Add it to copy.cy.js. If you do not have the Welsh yet, write '[Welsh needed] Where it grew'."
    ])
    expect(result.findings).toEqual([
      expect.objectContaining({
        id: 'copy-shape',
        skill: 'change-the-words',
        attribution: 'yours',
        fix: expect.stringContaining('[Welsh needed]')
      })
    ])
  })
})
