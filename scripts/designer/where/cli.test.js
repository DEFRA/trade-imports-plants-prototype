import os from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { SENTENCES } from '../lib/ownership.js'
import { REPO_ROOT } from '../lib/repo.js'
import { makeFixtureRepo } from '../lib/test-support.js'
import { USAGE, answer, parseArgs, run, summarise } from './cli.js'

describe('parseArgs', () => {
  it('Should separate paths from flags', () => {
    expect(parseArgs(['a.js', '--changed', 'b.js', '--json'])).toEqual({
      paths: ['a.js', 'b.js'],
      changed: true,
      json: true,
      help: false
    })
  })
})

describe('designer:where', () => {
  let fixture
  beforeAll(() => {
    fixture = makeFixtureRepo()
  })
  afterAll(() => fixture.cleanup())

  const options = (extra = {}) => ({
    root: fixture.root,
    cwd: fixture.root,
    listChanged: () => [],
    ...extra
  })

  it('Should print one line per path with its verdict', () => {
    expect(run(['src/server/app/sets/plants-working/set.js'], options())).toBe(
      `src/server/app/sets/plants-working/set.js - ${SENTENCES.yours}`
    )
  })

  it('Should give every verdict, then a count', () => {
    const output = run(
      [
        'src/server/app/sets/plants-working/set.js',
        'package.json',
        'src/server/app/engine/journey.js',
        '.mcp.json',
        'src/server/app/sets/plants-dr2/set.js'
      ],
      options()
    )
    expect(output.split('\n')).toEqual([
      `src/server/app/sets/plants-working/set.js - ${SENTENCES.yours}`,
      `package.json - ${SENTENCES['shared-on-purpose']}`,
      `src/server/app/engine/journey.js - ${SENTENCES['real-service']}`,
      `.mcp.json - ${SENTENCES.removed}`,
      `src/server/app/sets/plants-dr2/set.js - ${SENTENCES.frozen}`,
      '',
      '1 in a frozen release, 1 yours, 1 shared on purpose, 1 belong to the real service, 1 removed by the weekly update.'
    ])
  })

  it('Should add every changed file with --changed, once each', () => {
    const answers = answer(
      { paths: ['package.json'], changed: true },
      options({ listChanged: () => ['package.json', 'PROTOTYPE.md'] })
    )
    expect(answers.map((entry) => entry.path)).toEqual([
      'package.json',
      'PROTOTYPE.md'
    ])
  })

  it('Should resolve a typed path from the folder the designer is in', () => {
    const cwd = path.join(fixture.root, 'src/server/app')
    const [entry] = answer(
      { paths: ['sets/plants-working/set.js'], changed: false },
      options({ cwd })
    )
    expect(entry.path).toBe('src/server/app/sets/plants-working/set.js')
  })

  it('Should read a repo-relative path from the repo root when run from a parent folder (npm --prefix)', () => {
    const [entry] = answer(
      { paths: ['src/server/app/sets/plants-working/set.js'], changed: false },
      options({ cwd: path.dirname(fixture.root) })
    )
    expect(entry).toMatchObject({
      path: 'src/server/app/sets/plants-working/set.js',
      owner: 'yours'
    })
  })

  it('Should read a repo-relative path from the repo root when it names nothing from the folder the designer is in', () => {
    const cwd = path.join(fixture.root, 'src/server/app')
    const [entry] = answer(
      { paths: ['src/server/app/sets/plants-working/set.js'], changed: false },
      options({ cwd })
    )
    expect(entry.path).toBe('src/server/app/sets/plants-working/set.js')
  })

  it('Should still call a path outside the repo outside', () => {
    const [entry] = answer(
      { paths: [path.join(path.dirname(fixture.root), 'elsewhere.js')] },
      options()
    )
    expect(entry.path).toBeNull()
  })

  it('Should read a workspace-relative repos/<name>/… path against the repo root, whatever the cwd', () => {
    const repoName = path.basename(fixture.root)
    const workspacePath = `repos/${repoName}/src/server/app/sets/plants-working/set.js`
    const fromRepoRoot = answer(
      { paths: [workspacePath] },
      options({ cwd: fixture.root })
    )
    const fromAParentFolder = answer(
      { paths: [workspacePath] },
      options({ cwd: path.dirname(fixture.root) })
    )
    for (const answers of [fromRepoRoot, fromAParentFolder]) {
      expect(answers[0]).toMatchObject({
        path: 'src/server/app/sets/plants-working/set.js',
        owner: 'yours'
      })
    }
  })

  it('Should read a repo-relative path from the repo root when it sits two folders up (a workspace root)', () => {
    const workspaceRoot = path.dirname(path.dirname(fixture.root))
    const [entry] = answer(
      { paths: ['src/server/app/sets/plants-working/set.js'] },
      options({ cwd: workspaceRoot })
    )
    expect(entry).toMatchObject({
      path: 'src/server/app/sets/plants-working/set.js',
      owner: 'yours'
    })
  })

  it('Should say so when --changed finds nothing', () => {
    expect(run(['--changed'], options())).toBe(
      'Nothing has changed since your last save.'
    )
  })

  it('Should print JSON with --json', () => {
    const [entry] = JSON.parse(run(['.mcp.json', '--json'], options()))
    expect(entry).toMatchObject({ path: '.mcp.json', owner: 'removed' })
  })

  it('Should print usage when asked about nothing', () => {
    expect(run([], options())).toBe(USAGE)
  })
})

describe('summarise', () => {
  it('Should say nothing for no answers', () => {
    expect(summarise([])).toBe('')
  })
})

describe('designer:where on the real prototype', () => {
  const file =
    'src/server/app/sets/high-risk-plants/journeys/linear/features/origin/copy/copy.en.js'

  it('Should say a high-risk-plants copy file belongs to the real service', () => {
    expect(run([file], { root: REPO_ROOT, cwd: REPO_ROOT })).toBe(
      `${file} - ${SENTENCES['real-service']}`
    )
  })

  it('Should report the real-service owner for a bare repo-relative path run from the workspace root (npm --prefix)', () => {
    const workspaceRoot = path.resolve(REPO_ROOT, '../..')
    expect(run([file], { root: REPO_ROOT, cwd: workspaceRoot })).toBe(
      `${file} - ${SENTENCES['real-service']}`
    )
  })

  it('Should accept a workspace-relative repos/trade-imports-plants-prototype/… path', () => {
    const workspacePath = `repos/${path.basename(REPO_ROOT)}/${file}`
    expect(run([workspacePath], { root: REPO_ROOT, cwd: REPO_ROOT })).toBe(
      `${file} - ${SENTENCES['real-service']}`
    )
  })

  it('Should accept a tilde path into the repo', () => {
    const tildePath = `~/${path.relative(os.homedir(), path.join(REPO_ROOT, file))}`
    expect(run([tildePath], { root: REPO_ROOT, cwd: REPO_ROOT })).toBe(
      `${file} - ${SENTENCES['real-service']}`
    )
  })
})
