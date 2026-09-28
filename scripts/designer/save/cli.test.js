import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { gitEnv } from '../lib/git-env.js'
import { LOG_FILE, parseSaveArgs, save } from './cli.js'

let root

const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', env: gitEnv() })

const useHook = (script) => {
  const hooks = path.join(root, 'hooks')
  mkdirSync(hooks, { recursive: true })
  const hook = path.join(hooks, 'pre-commit')
  writeFileSync(hook, `#!/bin/sh\n${script}\n`)
  chmodSync(hook, 0o755)
  git('config', 'core.hooksPath', hooks)
}

const stageNote = (text) => {
  writeFileSync(path.join(root, 'note.md'), text)
  git('add', 'note.md')
}

beforeEach(() => {
  root = mkdtempSync(path.join(os.tmpdir(), 'designer-save-'))
  git('init', '-q', '-b', 'main')
  git('config', 'user.name', 'Save test')
  git('config', 'user.email', 'save@example.com')
  git('config', 'commit.gpgsign', 'false')
  git('config', 'core.hooksPath', '/dev/null')
  writeFileSync(path.join(root, '.gitignore'), 'hooks/\n.cache/\n')
  git('add', '.gitignore')
  git('commit', '-q', '-m', 'Start')
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('parseSaveArgs', () => {
  it('Should read the first line and the body', () => {
    expect(
      parseSaveArgs(['-m', 'plants-working: a change', '-m', 'Body'])
    ).toEqual({
      messages: ['plants-working: a change', 'Body'],
      noEdit: false
    })
  })

  it('Should refuse to skip the checks', () => {
    expect(parseSaveArgs(['-m', 'x', '--no-verify']).error).toContain(
      'not allowed'
    )
  })

  it('Should refuse paths after the message', () => {
    expect(parseSaveArgs(['-m', 'x', '--', 'a.js']).error).toContain(
      'Stage files with git add'
    )
  })

  it('Should ask for a message', () => {
    expect(parseSaveArgs([]).error).toContain('-m')
  })
})

describe('save', () => {
  it('Should save what is staged and say so in one line', () => {
    useHook('echo "a very long coverage table"')
    stageNote('one')

    const { code, lines } = save(['-m', 'plants-working: a change'], { root })

    expect(code).toBe(0)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(
      /^Saved [0-9a-f]+ plants-working: a change \(1 file\)\. The checks passed\./
    )
    expect(readFileSync(path.join(root, LOG_FILE), 'utf8')).toContain(
      'a very long coverage table'
    )
  })

  it('Should print the end of the log and save nothing when the checks fail', () => {
    useHook('echo "lint: 1 problem in copy.en.js"\nexit 1')
    stageNote('one')

    const { code, lines } = save(['-m', 'plants-working: a change'], { root })

    expect(code).toBe(1)
    expect(lines[0]).toContain('Nothing was saved')
    expect(lines).toContain('lint: 1 problem in copy.en.js')
    expect(git('log', '--format=%s').trim()).toBe('Start')
  })

  it('Should save nothing when nothing is staged', () => {
    const { code, lines } = save(['-m', 'plants-working: a change'], { root })

    expect(code).toBe(1)
    expect(lines[0]).toContain('Nothing is staged')
  })
})
