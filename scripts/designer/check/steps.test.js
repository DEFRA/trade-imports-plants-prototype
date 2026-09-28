import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { STEP_RUNNERS, tidyChangedFiles } from './steps.js'

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url))

describe('tidyChangedFiles', () => {
  let root

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'designer-tidy-'))
    writeFileSync(
      path.join(root, '.prettierrc.json'),
      '{ "semi": false, "singleQuote": true }\n'
    )
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('Should tidy a changed file and name it', async () => {
    writeFileSync(path.join(root, 'untidy.js'), 'const a   =  "b"\n')

    const result = await tidyChangedFiles(['untidy.js'], { root })

    expect(result).toEqual({ tidied: ['untidy.js'], failed: [] })
    expect(readFileSync(path.join(root, 'untidy.js'), 'utf8')).toBe(
      "const a = 'b'\n"
    )
  })

  it('Should leave a tidy file alone and not name it', async () => {
    writeFileSync(path.join(root, 'tidy.js'), "const a = 'b'\n")

    expect(await tidyChangedFiles(['tidy.js'], { root })).toEqual({
      tidied: [],
      failed: []
    })
  })

  it('Should skip templates, deleted files and ignored files', async () => {
    writeFileSync(path.join(root, 'page.njk'), '<p>  hi  </p>\n')
    writeFileSync(path.join(root, '.prettierignore'), 'ignored.js\n')
    writeFileSync(path.join(root, 'ignored.js'), 'const a   =  1\n')

    const result = await tidyChangedFiles(
      ['page.njk', 'deleted.js', 'ignored.js'],
      { root }
    )

    expect(result).toEqual({ tidied: [], failed: [] })
  })

  it('Should report a file it cannot read', async () => {
    writeFileSync(path.join(root, 'slip.js'), "const a = 'b\n")

    const { failed } = await tidyChangedFiles(['slip.js'], { root })

    expect(failed).toHaveLength(1)
    expect(failed[0]).toMatch(/^Prettier could not tidy slip\.js: /)
  })
})

describe('the ownership step', () => {
  it('Should pass with nothing changed', async () => {
    const outcome = await STEP_RUNNERS.ownership({
      root: REPO_ROOT,
      changedPaths: []
    })

    expect(outcome).toMatchObject({
      status: 'pass',
      summary: 'You have not changed any files yet.'
    })
  })

  it('Should warn, not fail, about a file that belongs to the real service', async () => {
    const outcome = await STEP_RUNNERS.ownership({
      root: REPO_ROOT,
      changedPaths: [
        'src/server/app/sets/high-risk-plants/set.js',
        'src/server/app/sets/sample-journey/set.js'
      ]
    })

    expect(outcome.status).toBe('warn')
    expect(outcome.summary).toBe(
      '2 files changed: 1 yours, 1 belong to the real service.'
    )
    expect(outcome.details).toEqual([
      expect.stringMatching(
        /^src\/server\/app\/sets\/high-risk-plants\/set\.js: Belongs to the real service/
      )
    ])
  })
})

describe('the copy and templates steps on sample-journey', () => {
  it('Should pass both', async () => {
    const context = { root: REPO_ROOT, setId: 'sample-journey' }

    expect((await STEP_RUNNERS.copy(context)).status).toBe('pass')
    expect((await STEP_RUNNERS.templates(context)).status).toBe('pass')
  })
})
