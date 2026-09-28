import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { SENTENCES } from '../lib/ownership.js'
import { makeFixtureRepo } from '../lib/test-support.js'
import { runHook } from './guard-edit.js'

const WORKING =
  'src/server/app/sets/plants-working/journeys/linear/features/origin/template.njk'
const FROZEN =
  'src/server/app/sets/plants-dr2/journeys/linear/features/origin/template.njk'
const PATCHED = 'src/server/app/services/ports/index.js'
const UPSTREAM =
  'src/server/app/sets/high-risk-plants/journeys/linear/features/origin/copy/copy.en.js'
const REMOVED = '.mcp.json'

describe('guard-edit hook', () => {
  let fixture
  beforeAll(() => {
    fixture = makeFixtureRepo()
  })
  afterAll(() => fixture.cleanup())

  const stdin = (toolName, repoPath, extra = {}) =>
    JSON.stringify({
      session_id: 'test',
      hook_event_name: 'PreToolUse',
      cwd: fixture.root,
      tool_name: toolName,
      tool_input: { file_path: path.join(fixture.root, repoPath), ...extra }
    })

  const hook = (text, branch = 'design/plants-working-captions') =>
    runHook(text, { root: fixture.root, branchOf: () => branch })

  it('Should allow an edit to a file that is yours', () => {
    expect(hook(stdin('Edit', WORKING))).toEqual({ exitCode: 0, stderr: '' })
  })

  it('Should block an edit in a frozen release with the frozen sentence', () => {
    const result = hook(stdin('Write', FROZEN))
    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain(FROZEN)
    expect(result.stderr).toContain(SENTENCES.frozen)
    expect(result.stderr).toContain('plants-dr2')
  })

  it('Should allow a shared-on-purpose file with a warning', () => {
    const result = hook(stdin('Edit', PATCHED))
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toContain(PATCHED)
    expect(result.stderr).toContain(SENTENCES['shared-on-purpose'])
  })

  it('Should block a real-service file, naming the file, its owner and both safe routes', () => {
    const result = hook(stdin('Edit', UPSTREAM))
    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain(UPSTREAM)
    expect(result.stderr).toContain('Owner: the real plants service.')
    expect(result.stderr).toContain('your design release')
    expect(result.stderr).toContain('as a hand-off')
    expect(result.stderr).toContain(`npm run designer:where -- ${UPSTREAM}`)
  })

  it('Should block a file the weekly update removes', () => {
    const result = hook(stdin('Write', REMOVED))
    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain(SENTENCES.removed)
  })

  it('Should read a notebook path as the file', () => {
    const text = JSON.stringify({
      tool_name: 'NotebookEdit',
      cwd: fixture.root,
      tool_input: { notebook_path: path.join(fixture.root, UPSTREAM) }
    })
    expect(hook(text).exitCode).toBe(2)
  })

  it('Should resolve a relative path against the hook cwd', () => {
    const text = JSON.stringify({
      tool_name: 'Edit',
      cwd: fixture.root,
      tool_input: { file_path: UPSTREAM }
    })
    expect(hook(text).exitCode).toBe(2)
  })

  it.each([
    'feat/EUDPA-621-widen-hint',
    'chore/EUDPA-621-tidy-sync',
    'main',
    'handoff/consignment-addresses',
    'maintain/tidy-sync'
  ])(
    'Should allow every file on a %s branch: only design/* is guarded',
    (branch) => {
      for (const repoPath of [UPSTREAM, REMOVED, FROZEN, PATCHED, WORKING]) {
        expect(hook(stdin('Edit', repoPath), branch)).toEqual({
          exitCode: 0,
          stderr: ''
        })
      }
    }
  )

  it('Should still guard a design/* branch other than the default fixture one', () => {
    const result = hook(stdin('Edit', UPSTREAM), 'design/plants-dr2-captions')
    expect(result.exitCode).toBe(2)
  })

  it('Should never block a read, or any tool that does not write', () => {
    expect(hook(stdin('Read', UPSTREAM)).exitCode).toBe(0)
    expect(hook(stdin('Grep', UPSTREAM)).exitCode).toBe(0)
    expect(hook(stdin('Bash', UPSTREAM)).exitCode).toBe(0)
  })

  it('Should allow a file outside the prototype', () => {
    const text = JSON.stringify({
      tool_name: 'Write',
      cwd: fixture.root,
      tool_input: { file_path: '/tmp/scratch/notes.md' }
    })
    expect(hook(text).exitCode).toBe(0)
  })

  it.each([
    ['not json at all', 'not json'],
    ['an empty input', ''],
    ['JSON with no tool input', '{"tool_name":"Edit"}'],
    ['a JSON array', '[1,2]']
  ])('Should fail open on %s', (_label, text) => {
    expect(hook(text)).toEqual({ exitCode: 0, stderr: '' })
  })

  it('Should fail open when the branch cannot be read', () => {
    const result = runHook(stdin('Edit', UPSTREAM), {
      root: fixture.root,
      branchOf: () => {
        throw new Error('git is missing')
      }
    })
    expect(result).toEqual({ exitCode: 0, stderr: '' })
  })
})
