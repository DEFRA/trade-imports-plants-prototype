import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { scaffoldSet } from '../../new-set/index.js'
import { formatChanges, releaseChanges } from './changes.js'
import { git } from './git.js'
import { commitAll, makeTestRepo, removeTestRepo } from './test-repo.js'

const NOW = new Date('2026-09-27T10:00:00.000Z')
const RENAME = 'plants-working: rename Consignment parties'
const NOTE = 'src/server/app/sets/plants-working/note.md'

let repoRoot

const saveNote = (text, message) => {
  writeFileSync(path.join(repoRoot, NOTE), text)
  return commitAll(repoRoot, message)
}

beforeEach(() => {
  repoRoot = makeTestRepo()
  scaffoldSet(
    { setId: 'plants-working', from: 'high-risk-plants', purpose: 'working' },
    { repoRoot, now: NOW }
  )
  commitAll(
    repoRoot,
    'Start design release plants-working from high-risk-plants'
  )
})

afterEach(() => {
  removeTestRepo(repoRoot)
})

describe('releaseChanges', () => {
  it('Should list the changes on every branch, newest first, and mark the release itself', () => {
    git(repoRoot, ['switch', '-q', '-c', 'design/plants-working-words'])
    const onDesign = saveNote('one', 'plants-working: a change')

    const changes = releaseChanges('plants-working', { repoRoot })

    expect(changes.map((change) => change.sha)).toEqual([
      onDesign.slice(0, changes[0].sha.length),
      expect.any(String)
    ])
    expect(changes[0].branch).toBe('design/plants-working-words')
    expect(changes[1].setUp).toBe(true)
  })

  it('Should pick the newest of several changes with the same message on a design/ branch', () => {
    git(repoRoot, ['switch', '-q', '-c', 'design/plants-working-words'])
    const first = saveNote('one', RENAME)
    git(repoRoot, ['switch', '-q', 'main'])
    git(repoRoot, ['switch', '-q', '-c', 'feat/other'])
    saveNote('two', RENAME)

    const changes = releaseChanges('plants-working', { repoRoot })
    const picked = changes.filter((change) => change.pick)

    expect(picked).toHaveLength(1)
    expect(first.startsWith(picked[0].sha)).toBe(true)
    expect(formatChanges('plants-working', changes)).toContain('pick this one')
  })

  it('Should say when a release has no saved changes', () => {
    expect(formatChanges('plants-none', [])).toBe(
      'No saved changes to plants-none on any branch.'
    )
  })
})
