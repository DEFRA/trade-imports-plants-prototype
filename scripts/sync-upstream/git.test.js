import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { createPullRequest, ensureLabel, setRepoRoot } from './git.js'

const fakeGh = (binDir, logFile) => {
  const script = path.join(binDir, 'gh')
  writeFileSync(
    script,
    `#!/bin/sh\nprintf '%s|%s\\n' "$GH_REPO" "$*" >> "${logFile}"\n`
  )
  chmodSync(script, 0o755)
}

describe('the gh calls the sync makes', () => {
  let root
  let logFile
  let savedPath

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'sync-gh-'))
    logFile = path.join(root, 'gh.log')
    fakeGh(root, logFile)
    savedPath = process.env.PATH
    process.env.PATH = `${root}${path.delimiter}${savedPath}`
    setRepoRoot(root)
  })

  afterEach(() => {
    process.env.PATH = savedPath
    rmSync(root, { recursive: true, force: true })
  })

  const calls = () =>
    readFileSync(logFile, 'utf8')
      .trim()
      .split('\n')
      .map((line) => {
        const [repo, args] = line.split('|')
        return { repo, args }
      })

  test('Should create or update the label in one call, on the prototype repo', () => {
    ensureLabel('needs-person', { color: 'd73a4a', description: 'Look' })

    expect(calls()).toEqual([
      {
        repo: 'DEFRA/trade-imports-plants-prototype',
        args: 'label create needs-person --force --color d73a4a --description Look'
      }
    ])
  })

  test('Should open the pull request on the prototype repo', () => {
    createPullRequest({
      title: 'Sync',
      bodyFile: 'body.md',
      draft: true,
      label: 'needs-person',
      branch: 'sync/upstream-2026-11-30'
    })

    expect(calls()).toEqual([
      {
        repo: 'DEFRA/trade-imports-plants-prototype',
        args: 'pr create --title Sync --body-file body.md --head sync/upstream-2026-11-30 --label needs-person --draft'
      }
    ])
  })
})
