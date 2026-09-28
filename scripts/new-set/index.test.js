/**
 * `new:set` run for real against a throwaway copy of the files it reads and
 * writes: the real high-risk-plants set and its gateway, the prototype-sets
 * mount, the chooser descriptions and overrides.json.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { remountReleases } from '../designer/release/remount.js'
import { REPO_ROOT, scaffoldSet } from './index.js'
import { listFiles } from './copy-set.js'
import { UUID_PATTERN } from './transform.js'

const NOW = new Date('2026-09-27T10:00:00.000Z')
const REAL_JOURNEY = 'high-risk-plants'

const COPIED_FROM_REPO = [
  `src/server/app/sets/${REAL_JOURNEY}`,
  `src/server/app/routes-${REAL_JOURNEY}.js`,
  'src/server/app/sets/sample-journey',
  'src/server/app/routes-sample-journey.js',
  'src/server/prototype-sets/index.js',
  'src/server/prototype-sets/descriptions.js',
  'overrides.json'
]

let repoRoot

const read = (relativePath) =>
  readFileSync(path.join(repoRoot, relativePath), 'utf8')

const setFiles = (setId) =>
  listFiles(path.join(repoRoot, 'src/server/app/sets', setId))

const readRelease = (setId) =>
  JSON.parse(read(`src/server/app/sets/${setId}/release.json`))

const uuidsIn = (dir) =>
  new Set(
    listFiles(dir).flatMap((file) =>
      [
        ...readFileSync(path.join(dir, file), 'utf8').matchAll(UUID_PATTERN)
      ].map(([uuid]) => uuid.toLowerCase())
    )
  )

beforeEach(() => {
  repoRoot = mkdtempSync(path.join(tmpdir(), 'new-set-'))
  for (const relativePath of COPIED_FROM_REPO) {
    cpSync(
      path.join(REPO_ROOT, relativePath),
      path.join(repoRoot, relativePath),
      { recursive: true }
    )
  }
  // Take out any design release the real checkout has mounted: its folder is
  // not copied, so these tests never depend on which releases exist.
  remountReleases({ repoRoot })
})

afterEach(() => {
  rmSync(repoRoot, { recursive: true, force: true })
})

describe('new:set --from high-risk-plants', () => {
  const scaffold = (overrides = {}) =>
    scaffoldSet(
      {
        setId: 'plants-canary',
        from: REAL_JOURNEY,
        describe: 'A release for the regression test',
        purpose: 'working',
        ...overrides
      },
      { repoRoot, now: NOW }
    )

  it('Should copy no tests, browser specs, docs or requirement digests', () => {
    const { skipped } = scaffold()
    const files = setFiles('plants-canary')

    expect(files.filter((file) => file.endsWith('.test.js'))).toEqual([])
    expect(files.filter((file) => file.endsWith('.spec.js'))).toEqual([])
    expect(files.filter((file) => file.split('/').includes('fit'))).toEqual([])
    expect(files.filter((file) => file.startsWith('spec/'))).toEqual([])
    expect(files.filter((file) => file.endsWith('test-support.js'))).toEqual([])
    expect(skipped.map(({ reason }) => reason)).toEqual(
      expect.arrayContaining([
        'unit test',
        'browser test',
        'docs',
        'spec',
        'used only by tests'
      ])
    )
  })

  it('Should keep the example data fixture', () => {
    scaffold()

    expect(setFiles('plants-canary')).toContain(
      'journeys/linear/flow/fixtures/happy-path.json'
    )
  })

  it('Should replace the docs with one line pointing at the real journey’s', () => {
    scaffold()

    const docs = setFiles('plants-canary').filter((file) =>
      file.startsWith('docs/')
    )
    expect(docs).toEqual(['docs/README.md'])
    expect(read('src/server/app/sets/plants-canary/docs/README.md')).toContain(
      `src/server/app/sets/${REAL_JOURNEY}/docs/`
    )
  })

  it('Should rewrite every id in the copy', () => {
    scaffold()

    const stillNamingTheTemplate = setFiles('plants-canary')
      .filter((file) => !['release.json', 'docs/README.md'].includes(file))
      .filter((file) => {
        const content = read(`src/server/app/sets/plants-canary/${file}`)
        return (
          content.includes(REAL_JOURNEY) || content.includes('highRiskPlants')
        )
      })
    expect(stillNamingTheTemplate).toEqual([])
    expect(read('src/server/app/routes-plants-canary.js')).toContain(
      'export const plantsCanary'
    )
  })

  it('Should mount it, mark it as the prototype’s and describe it', () => {
    scaffold()

    expect(read('src/server/prototype-sets/index.js')).toContain(
      "from '../app/routes-plants-canary.js'"
    )
    expect(JSON.parse(read('overrides.json')).ours).toEqual(
      expect.arrayContaining([
        'src/server/app/sets/plants-canary/**',
        'src/server/app/routes-plants-canary.js'
      ])
    )
    expect(read('src/server/prototype-sets/descriptions.js')).toContain(
      "'plants-canary':\n    'A release for the regression test'"
    )
  })

  it('Should write a release record naming where it came from', () => {
    scaffold({ purpose: 'research' })

    expect(readRelease('plants-canary')).toEqual({
      id: 'plants-canary',
      from: REAL_JOURNEY,
      root: REAL_JOURNEY,
      fromCommit: null,
      upstreamCommit: null,
      createdAt: NOW.toISOString(),
      purpose: 'research',
      frozen: false,
      description: 'A release for the regression test',
      uuidMap: expect.any(Object)
    })
  })

  it('Should map every obligation id of the real journey to one in the release', () => {
    scaffold()

    const realIds = uuidsIn(
      path.join(repoRoot, `src/server/app/sets/${REAL_JOURNEY}/obligations`)
    )
    const releaseIds = uuidsIn(
      path.join(repoRoot, 'src/server/app/sets/plants-canary/obligations')
    )
    const { uuidMap } = readRelease('plants-canary')

    expect(realIds.size).toBeGreaterThan(0)
    for (const realId of realIds) {
      expect(releaseIds).toContain(uuidMap[realId])
    }
    expect([...releaseIds].filter((id) => realIds.has(id))).toEqual([])
  })

  it('Should describe an undescribed release with a dated placeholder', () => {
    scaffold({ describe: undefined })

    expect(readRelease('plants-canary').description).toBe(
      'Copy of high-risk-plants made 27 September 2026'
    )
  })

  it('Should mark a release made frozen as frozen', () => {
    scaffold({ purpose: 'frozen' })

    expect(readRelease('plants-canary').frozen).toBe(true)
  })

  it('Should wrap the release’s records store when the wrapper is present', () => {
    const wrapper = path.join(
      repoRoot,
      'src/server/prototype-services/records/index.js'
    )
    mkdirSync(path.dirname(wrapper), { recursive: true })
    writeFileSync(
      wrapper,
      'export const designerRecords = (_setId, records) => records\n'
    )

    const { records } = scaffold()

    expect(records).toBe('injected')
    const gateway = read('src/server/app/routes-plants-canary.js')
    expect(gateway).toContain(
      "import { designerRecords } from '../prototype-services/records/index.js'"
    )
    expect(gateway).toContain(
      'configureRecords(SET_ID, designerRecords(SET_ID, records))'
    )
  })

  it('Should leave the records store alone when the wrapper is not there', () => {
    const { records } = scaffold()

    expect(records).toBe('unavailable')
    expect(read('src/server/app/routes-plants-canary.js')).toContain(
      'configureRecords(SET_ID, records)'
    )
  })

  it('Should refuse an id the prototype already uses as a path', () => {
    expect(() => scaffold({ setId: 'examples' })).toThrow(
      /already a path the prototype uses/
    )
  })

  it('Should refuse a purpose it does not know', () => {
    expect(() => scaffold({ purpose: 'final' })).toThrow(/is not a purpose/)
  })
})

describe('new:set --from another release', () => {
  it('Should key the new release’s uuidMap by the real journey’s ids', () => {
    scaffoldSet(
      { setId: 'plants-dr2', from: REAL_JOURNEY, purpose: 'working' },
      { repoRoot, now: NOW }
    )
    scaffoldSet(
      { setId: 'plants-dr2-working', from: 'plants-dr2', purpose: 'working' },
      { repoRoot, now: NOW }
    )

    const parent = readRelease('plants-dr2')
    const child = readRelease('plants-dr2-working')
    const childIds = uuidsIn(
      path.join(repoRoot, 'src/server/app/sets/plants-dr2-working/obligations')
    )

    expect(child).toEqual(
      expect.objectContaining({
        id: 'plants-dr2-working',
        from: 'plants-dr2',
        root: REAL_JOURNEY
      })
    )
    expect(Object.keys(child.uuidMap).toSorted()).toEqual(
      Object.keys(parent.uuidMap).toSorted()
    )
    for (const childId of Object.values(child.uuidMap)) {
      expect(childIds).toContain(childId)
    }
    expect(
      existsSync(
        path.join(repoRoot, 'src/server/app/sets/plants-dr2-working/docs')
      )
    ).toBe(true)
  })

  it('Should leave a research release’s session plan and research-mode log out of a working copy of it', () => {
    scaffoldSet(
      { setId: 'plants-research', from: REAL_JOURNEY, purpose: 'research' },
      { repoRoot, now: NOW }
    )
    const researchDir = path.join(
      repoRoot,
      'src/server/app/sets/plants-research'
    )
    writeFileSync(path.join(researchDir, 'research-session.json'), '{}\n')
    writeFileSync(
      path.join(researchDir, 'research-mode.md'),
      '# Research mode\n'
    )

    const working = scaffoldSet(
      {
        setId: 'plants-research-next',
        from: 'plants-research',
        purpose: 'working'
      },
      { repoRoot, now: NOW }
    )
    scaffoldSet(
      {
        setId: 'plants-research-2',
        from: 'plants-research',
        purpose: 'research'
      },
      { repoRoot, now: NOW }
    )

    expect(setFiles('plants-research-next')).not.toContain(
      'research-session.json'
    )
    expect(setFiles('plants-research-next')).not.toContain('research-mode.md')
    expect(working.skipped).toContainEqual({
      path: 'research-mode.md',
      reason: 'research only'
    })
    expect(setFiles('plants-research-2')).toContain('research-session.json')
  })
})

describe('new:set from sample-journey', () => {
  it('Should copy every file and write no docs pointer', () => {
    scaffoldSet(
      { setId: 'citrus-fruit', from: 'sample-journey', purpose: 'working' },
      { repoRoot, now: NOW }
    )

    expect(setFiles('citrus-fruit').toSorted()).toEqual(
      [...setFiles('sample-journey'), 'release.json'].toSorted()
    )
  })
})
