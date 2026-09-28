import os from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  OWNERS,
  SENTENCES,
  explainOwner,
  ownerOf,
  ownershipOf
} from './ownership.js'
import { REPO_ROOT, readOverrides } from './repo.js'
import { FIXTURE_OVERRIDES, makeFixtureRepo } from './test-support.js'

describe('ownerOf against a fixture overrides.json', () => {
  let fixture
  beforeAll(() => {
    fixture = makeFixtureRepo()
  })
  afterAll(() => fixture.cleanup())

  const owner = (filePath) => ownerOf(filePath, { root: fixture.root })

  it('Should call a path in ours yours', () => {
    expect(owner('src/server/app/sets/plants-working/set.js')).toBe(
      OWNERS.yours
    )
  })

  it('Should call a path declared in patched shared on purpose', () => {
    expect(owner('src/server/app/services/ports/index.js')).toBe(
      OWNERS.sharedOnPurpose
    )
  })

  it('Should call an undeclared upstream path the real service, never shared on purpose', () => {
    expect(owner('src/server/app/services/countries/index.js')).toBe(
      OWNERS.realService
    )
    expect(
      owner(
        'src/server/app/sets/high-risk-plants/journeys/linear/features/origin/copy/copy.en.js'
      )
    ).toBe(OWNERS.realService)
  })

  it('Should call a path in deleted removed', () => {
    expect(owner('scripts/lighthouse/run-audit.js')).toBe(OWNERS.removed)
  })

  it('Should accept an absolute path inside the repo', () => {
    expect(owner(path.join(fixture.root, 'PROTOTYPE.md'))).toBe(OWNERS.yours)
  })

  it('Should answer null for a path outside the repo', () => {
    expect(owner('/somewhere/else/file.js')).toBeNull()
  })

  it('Should read a workspace-relative repos/<name>/… path against the repo root, whatever the cwd', () => {
    const workspacePath = `repos/${path.basename(fixture.root)}/PROTOTYPE.md`
    expect(
      ownerOf(workspacePath, { root: fixture.root, cwd: fixture.root })
    ).toBe(OWNERS.yours)
    expect(
      ownerOf(workspacePath, {
        root: fixture.root,
        cwd: path.dirname(path.dirname(fixture.root))
      })
    ).toBe(OWNERS.yours)
  })

  it('Should accept a tilde path into the repo', () => {
    const tildePath = `~/${path.relative(os.homedir(), path.join(fixture.root, 'PROTOTYPE.md'))}`
    expect(owner(tildePath)).toBe(OWNERS.yours)
  })

  it('Should classify against overrides passed in rather than the file', () => {
    const overrides = { ...FIXTURE_OVERRIDES, ours: [], patched: [] }
    expect(ownerOf('PROTOTYPE.md', { root: fixture.root, overrides })).toBe(
      OWNERS.realService
    )
  })
})

describe('ownershipOf', () => {
  let fixture
  beforeAll(() => {
    fixture = makeFixtureRepo()
  })
  afterAll(() => fixture.cleanup())

  const details = (filePath) => ownershipOf(filePath, { root: fixture.root })

  it('Should mark a file in a frozen release as frozen, with the frozen sentence', () => {
    expect(
      details(
        'src/server/app/sets/plants-dr2/journeys/linear/features/origin/page.js'
      )
    ).toEqual({
      path: 'src/server/app/sets/plants-dr2/journeys/linear/features/origin/page.js',
      input:
        'src/server/app/sets/plants-dr2/journeys/linear/features/origin/page.js',
      owner: OWNERS.yours,
      setId: 'plants-dr2',
      isRelease: true,
      frozen: true,
      sentence: SENTENCES.frozen
    })
  })

  it("Should treat a frozen release's routes file as frozen too", () => {
    expect(details('src/server/app/routes-plants-dr2.js').frozen).toBe(true)
  })

  it('Should mark a working release as a release that is not frozen', () => {
    expect(details('src/server/app/sets/plants-working/set.js')).toMatchObject({
      owner: OWNERS.yours,
      setId: 'plants-working',
      isRelease: true,
      frozen: false,
      sentence: SENTENCES.yours
    })
  })

  it('Should not call the real journey or the placeholder a release', () => {
    expect(
      details('src/server/app/sets/high-risk-plants/set.js')
    ).toMatchObject({
      setId: 'high-risk-plants',
      isRelease: false,
      frozen: false
    })
    expect(details('src/server/app/sets/sample-journey/set.js')).toMatchObject({
      setId: 'sample-journey',
      isRelease: false
    })
  })

  it('Should say a path outside the repo is outside', () => {
    expect(details('/elsewhere/notes.md')).toMatchObject({
      path: null,
      owner: null,
      sentence: SENTENCES.outside
    })
  })
})

describe('explainOwner', () => {
  let fixture
  beforeAll(() => {
    fixture = makeFixtureRepo()
  })
  afterAll(() => fixture.cleanup())

  it.each([
    ['src/server/app/sets/plants-working/set.js', SENTENCES.yours],
    ['package.json', SENTENCES['shared-on-purpose']],
    ['src/server/app/engine/journey.js', SENTENCES['real-service']],
    ['.mcp.json', SENTENCES.removed],
    ['src/server/app/sets/plants-dr2/set.js', SENTENCES.frozen]
  ])('Should explain %s in one plain sentence', (filePath, sentence) => {
    expect(explainOwner(filePath, { root: fixture.root })).toBe(sentence)
  })

  it('Should offer the two safe routes for a real-service file', () => {
    expect(SENTENCES['real-service']).toContain(
      'Make it in your design release'
    )
    expect(SENTENCES['real-service']).toContain('hand it to the real team')
  })
})

describe('ownerOf against the real overrides.json', () => {
  const overrides = readOverrides({ root: REPO_ROOT })

  it('Should agree with the sync rules for the prototype itself', () => {
    expect(ownerOf('overrides.json', { overrides })).toBe(OWNERS.yours)
    expect(ownerOf('package.json', { overrides })).toBe(OWNERS.sharedOnPurpose)
    expect(ownerOf('.mcp.json', { overrides })).toBe(OWNERS.removed)
    expect(
      ownerOf(
        'src/server/app/sets/high-risk-plants/journeys/linear/features/origin/copy/copy.en.js',
        { overrides }
      )
    ).toBe(OWNERS.realService)
  })
})
