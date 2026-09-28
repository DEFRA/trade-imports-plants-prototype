import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import {
  isUnmerged,
  mergeUpstream,
  setRepoRoot,
  statusPorcelain
} from './git.js'
import { applyOverrideRules } from './sync.js'
import {
  buildSummary,
  pullRequestDecision,
  arrivedServices
} from './summary.js'

/**
 * The sync's rules against a real git merge, in a throwaway repo: `main` is
 * the prototype, `upstream/main` the real plants service, both grown from
 * one shared commit.
 */

const TRANSPORTERS = 'src/server/app/services/transporters'
const OURS_ONLY_UPSTREAM = 'scripts/sync-upstream/added-upstream.js'

const OVERRIDES = {
  deleted: [],
  ours: ['overrides.json', 'scripts/sync-upstream/**', `${TRANSPORTERS}/**`],
  patched: []
}

const gitEnv = () =>
  Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))
  )

const makeRepo = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'sync-upstream-'))
  const git = (...args) =>
    execFileSync('git', args, { cwd: root, env: gitEnv(), stdio: 'ignore' })
  const write = (file, content) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    writeFileSync(path.join(root, file), content)
  }
  const commitAll = (message) => {
    git('add', '-A')
    git('commit', '--quiet', '--no-verify', '-m', message)
  }
  git('init', '--quiet', '--initial-branch=main')
  // In the repo's own config, not `-c`, so the sync's own git calls (the
  // merge) have an identity too on a CI runner that has none.
  git('config', 'user.name', 'Fixture')
  git('config', 'user.email', 'fixture@example.com')
  git('config', 'commit.gpgsign', 'false')
  write('overrides.json', `${JSON.stringify(OVERRIDES, null, 2)}\n`)
  write('src/server/app/services/countries/index.js', 'export const a = 1\n')
  commitAll('shared history')
  return {
    root,
    git,
    write,
    commitAll,
    read: (file) => readFileSync(path.join(root, file), 'utf8'),
    has: (file) => existsSync(path.join(root, file)),
    cleanup: () => rmSync(root, { recursive: true, force: true })
  }
}

describe('applyOverrideRules against a real merge', () => {
  let repo

  beforeEach(() => {
    repo = makeRepo()
    // The real service: adds its own transporters service, and a file under
    // an `ours` glob the prototype has never had.
    repo.git('switch', '--quiet', '-c', 'upstream-work')
    repo.write(`${TRANSPORTERS}/index.js`, "export const real = 'upstream'\n")
    repo.write(`${TRANSPORTERS}/real-only.js`, 'export const extra = 1\n')
    repo.write(OURS_ONLY_UPSTREAM, 'export const upstream = 1\n')
    repo.commitAll('upstream adds transporters')
    repo.git('update-ref', 'refs/remotes/upstream/main', 'HEAD')
    // The prototype: its own transporters service.
    repo.git('switch', '--quiet', 'main')
    repo.write(`${TRANSPORTERS}/index.js`, "export const ours = 'prototype'\n")
    repo.write(`${TRANSPORTERS}/stub.js`, 'export const stub = 1\n')
    repo.commitAll('prototype adds transporters')
    setRepoRoot(repo.root)
    mergeUpstream()
  })

  afterEach(() => repo.cleanup())

  test('Should keep ours for an add/add clash and an upstream-only add under a service, without throwing', () => {
    const before = statusPorcelain()
    expect(before).toContainEqual({
      code: 'AA',
      path: `${TRANSPORTERS}/index.js`
    })
    expect(before).toContainEqual({
      code: 'A ',
      path: `${TRANSPORTERS}/real-only.js`
    })

    const applied = applyOverrideRules(OVERRIDES)

    expect(repo.read(`${TRANSPORTERS}/index.js`)).toBe(
      "export const ours = 'prototype'\n"
    )
    expect(repo.has(`${TRANSPORTERS}/real-only.js`)).toBe(false)
    expect(repo.read(`${TRANSPORTERS}/stub.js`)).toBe('export const stub = 1\n')
    expect(statusPorcelain().filter(({ code }) => isUnmerged(code))).toEqual([])
    expect(applied).toEqual(
      expect.arrayContaining([
        {
          path: `${TRANSPORTERS}/index.js`,
          rule: 'service-arrived',
          service: 'transporters'
        },
        {
          path: `${TRANSPORTERS}/real-only.js`,
          rule: 'service-arrived',
          service: 'transporters'
        }
      ])
    )
  })

  test('Should remove an ours path added only upstream elsewhere, so ours stays in charge', () => {
    const applied = applyOverrideRules(OVERRIDES)

    expect(repo.has(OURS_ONLY_UPSTREAM)).toBe(false)
    expect(applied).toContainEqual({ path: OURS_ONLY_UPSTREAM, rule: 'ours' })
  })

  test('Should flag the pull request for a person and tell the maintainer to retire the prototype service', () => {
    const applied = applyOverrideRules(OVERRIDES)
    const summary = buildSummary({
      branch: 'sync/upstream-test',
      mergedCommits: [],
      appliedRules: applied,
      conflictedPaths: [],
      checks: [],
      merged: false
    })

    expect(arrivedServices(applied)).toEqual(['transporters'])
    expect(summary).toContain('## Real services that arrived')
    expect(summary).toContain('npm run designer:service -- retire transporters')
    expect(
      pullRequestDecision({
        conflictedPaths: [],
        checks: [],
        arrivedServices: arrivedServices(applied)
      })
    ).toEqual({ draft: true, label: 'needs-person' })
  })
})

describe('applyOverrideRules decisions', () => {
  const recordingGit = (entries) => {
    const calls = []
    return {
      calls,
      git: {
        statusPorcelain: () => entries,
        removePath: (file) => calls.push(['remove', file]),
        restoreOurs: (file, { conflicted }) =>
          calls.push([conflicted ? 'ours' : 'head', file])
      }
    }
  }

  test('Should never ask for our committed copy of a path our side does not have', () => {
    const { calls, git } = recordingGit([
      { code: 'A ', path: OURS_ONLY_UPSTREAM },
      { code: 'UA', path: 'scripts/sync-upstream/renamed-upstream.js' },
      { code: 'DU', path: 'scripts/sync-upstream/deleted-by-us.js' },
      { code: 'M ', path: 'scripts/sync-upstream/sync.js' },
      { code: 'UU', path: 'overrides.json' },
      { code: '??', path: 'scripts/sync-upstream/scratch.js' },
      { code: 'M ', path: 'src/server/app/engine/journey.js' }
    ])

    applyOverrideRules(OVERRIDES, git)

    expect(calls).toEqual([
      ['remove', OURS_ONLY_UPSTREAM],
      ['remove', 'scripts/sync-upstream/renamed-upstream.js'],
      ['remove', 'scripts/sync-upstream/deleted-by-us.js'],
      ['head', 'scripts/sync-upstream/sync.js'],
      ['ours', 'overrides.json']
    ])
  })
})
