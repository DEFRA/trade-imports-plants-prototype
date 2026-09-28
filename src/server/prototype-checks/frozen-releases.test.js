import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  describeFrozenChange,
  frozenReleaseChanges
} from './frozen-releases.js'
import { setIdsOnDisk, setsToCheck } from './sets-on-disk.js'

/**
 * Nothing in a frozen design release changes after the commit that froze
 * it. This runs in the pre-commit hook, so a frozen release cannot be
 * changed by accident: start a working release from it instead.
 */
describe('frozen releases — every set on disk', () => {
  it.each(setsToCheck(setIdsOnDisk()))(
    'Should leave %s alone after it was frozen',
    (setId) => {
      const found = frozenReleaseChanges(setId)
      expect(
        found.changed,
        found.changed.length > 0 ? describeFrozenChange(setId, found) : ''
      ).toEqual([])
    }
  )
})

describe('frozenReleaseChanges', () => {
  const ID = 'plants-dr2'
  const SET = `src/server/app/sets/${ID}`
  let repoRoot

  const changesNow = () => frozenReleaseChanges(ID, { repoRoot })

  const env = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))
  )
  const git = (...args) =>
    execFileSync('git', args, { cwd: repoRoot, env, stdio: 'ignore' })
  const write = (relative, content) => {
    const file = path.join(repoRoot, relative)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, content)
  }
  const record = (frozen) =>
    `${JSON.stringify({ id: ID, purpose: frozen ? 'frozen' : 'working', frozen }, null, 2)}\n`
  const commit = (message) => {
    git('add', '-A')
    git('commit', '-q', '-m', message)
  }

  beforeEach(() => {
    repoRoot = mkdtempSync(path.join(tmpdir(), 'frozen-releases-'))
    git('init', '-q', '-b', 'main')
    git('config', 'user.name', 'Frozen test')
    git('config', 'user.email', 'frozen@example.com')
    git('config', 'commit.gpgsign', 'false')
    git('config', 'core.hooksPath', '/dev/null')
    write(`${SET}/set.js`, 'export const SET_ID = "plants-dr2"\n')
    write(`${SET}/copy.en.js`, "export default { title: 'Old' }\n")
    write(`${SET}/release.json`, record(false))
    commit('Start plants-dr2')
  })

  afterEach(() => rmSync(repoRoot, { recursive: true, force: true }))

  it('Should report nothing for a working release', () => {
    write(`${SET}/copy.en.js`, "export default { title: 'New' }\n")
    expect(changesNow().changed).toEqual([])
  })

  it('Should report nothing while the freeze itself is not saved yet', () => {
    write(`${SET}/release.json`, record(true))
    expect(changesNow().changed).toEqual([])
  })

  it('Should report nothing straight after the freeze is saved', () => {
    write(`${SET}/release.json`, record(true))
    commit('Freeze plants-dr2')
    expect(changesNow().changed).toEqual([])
  })

  it('Should report an edit made after the freeze, saved or not', () => {
    write(`${SET}/release.json`, record(true))
    commit('Freeze plants-dr2')
    write(`${SET}/copy.en.js`, "export default { title: 'New' }\n")
    write(`${SET}/extra.njk`, '<p>new</p>\n')
    const found = changesNow()
    expect(found.changed).toEqual([`${SET}/copy.en.js`, `${SET}/extra.njk`])
    commit('Edit a frozen release')
    expect(changesNow().changed).toHaveLength(2)
    expect(describeFrozenChange(ID, found)).toMatch(
      /^frozen-release: plants-dr2 was frozen in [0-9a-f]{7}, and 2 files in it changed since/
    )
  })
})
