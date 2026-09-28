import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { scaffoldSet } from '../../new-set/index.js'
import { run } from './cli.js'
import { formatDrift, releaseDrift } from './drift.js'
import { commitAll, makeTestRepo, removeTestRepo } from './test-repo.js'

const REAL = 'src/server/app/sets/high-risk-plants'
const FEATURES = `${REAL}/journeys/linear/features`

let repoRoot

const touch = (relativePath) =>
  appendFileSync(path.join(repoRoot, relativePath), '// changed\n')

const release = (setId, from = 'high-risk-plants') =>
  scaffoldSet(
    { setId, from, purpose: 'working' },
    { repoRoot, now: new Date('2026-06-01T09:00:00.000Z') }
  )

beforeAll(() => {
  repoRoot = makeTestRepo()
  release('plants-dr1')
  release('plants-lost-commit')
  const recordFile = path.join(
    repoRoot,
    'src/server/app/sets/plants-lost-commit/release.json'
  )
  const record = JSON.parse(readFileSync(recordFile, 'utf8'))
  writeFileSync(
    recordFile,
    `${JSON.stringify({ ...record, fromCommit: 'f'.repeat(40) }, null, 2)}\n`
  )
  commitAll(repoRoot, 'Start plants-dr1 and plants-lost-commit')

  touch(`${FEATURES}/arrival-details/page.js`)
  touch(`${FEATURES}/consignor-select/controller.js`)
  touch(`${FEATURES}/arrival-details/controller.test.js`)
  touch(`${REAL}/journeys/linear/flow/flow.js`)
  appendFileSync(path.join(repoRoot, `${REAL}/docs/README.md`), 'More.\n')
  commitAll(repoRoot, 'Weekly update from the real service')

  release('plants-research', 'plants-dr1')
  release('plants-dr2')
  commitAll(repoRoot, 'Start plants-research and plants-dr2')
})

afterAll(() => {
  removeTestRepo(repoRoot)
})

afterEach(() => {
  vi.restoreAllMocks()
  process.exitCode = undefined
})

describe('releaseDrift', () => {
  it('Should find no drift in a release copied after the real team’s last change', () => {
    expect(releaseDrift('plants-dr2', { repoRoot })).toMatchObject({
      applies: true,
      startedFrom: 'plants-dr2',
      files: [],
      pages: [],
      otherParts: [],
      count: 0
    })
  })

  it('Should name the changed pages and parts of a release copied before it', () => {
    const drift = releaseDrift('plants-dr1', { repoRoot })

    expect(drift).toMatchObject({
      applies: true,
      startedFrom: 'plants-dr1',
      pages: ['arrival-details', 'consignors/select'],
      otherParts: ['the order of the pages and the task list'],
      unseenFiles: [
        `${REAL}/docs/README.md`,
        `${FEATURES}/arrival-details/controller.test.js`
      ],
      count: 3
    })
    expect(drift.files).toHaveLength(5)
  })

  it('Should count from the real-journey copy at the start of a chain of releases', () => {
    expect(releaseDrift('plants-research', { repoRoot })).toMatchObject({
      startedFrom: 'plants-dr1',
      pages: ['arrival-details', 'consignors/select'],
      count: 3
    })
  })

  it('Should fall back to the commit that saved the release when its recorded commit is gone', () => {
    expect(releaseDrift('plants-lost-commit', { repoRoot })).toMatchObject({
      applies: true,
      count: 3
    })
  })

  it('Should not apply to the real journey or the placeholder', () => {
    expect(releaseDrift('high-risk-plants', { repoRoot }).applies).toBe(false)
    expect(releaseDrift('sample-journey', { repoRoot }).applies).toBe(false)
  })

  it('Should refuse a release that does not exist', () => {
    expect(() => releaseDrift('plants-nope', { repoRoot })).toThrow(
      /There is no release called "plants-nope"/
    )
  })
})

describe('formatDrift', () => {
  it('Should say there is nothing to pick up when no page changed', () => {
    expect(formatDrift(releaseDrift('plants-dr2', { repoRoot }))).toBe(
      '"plants-dr2" was copied from the real journey on 1 June 2026. The real team has not changed any page since, so there is nothing to pick up.'
    )
  })

  it('Should list the changed pages in plain English and offer to pick them up', () => {
    const text = formatDrift(releaseDrift('plants-research', { repoRoot }))

    expect(text).toContain(
      '"plants-research" was made from "plants-dr1", which was copied from the real journey on 1 June 2026.'
    )
    expect(text).toContain('changed 3 things you would see')
    expect(text).toContain('Pages:\n  - arrival-details\n  - consignors/select')
    expect(text).toContain(
      'Also:\n  - the order of the pages and the task list'
    )
    expect(text).toContain('2 more file(s) changed that nobody sees on a page')
    expect(text).toContain('say "pick up the real team\'s changes"')
  })
})

describe('designer:release drift', () => {
  it('Should print the changed pages for the release named', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    await run(['drift', 'plants-dr1'], { repoRoot })

    expect(log.mock.calls[0][0]).toContain('  - consignors/select')
  })

  it('Should ask which release when none is named', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    await run(['drift'], { repoRoot })

    expect(error.mock.calls[0][0]).toBe(
      'Say which release: npm run designer:release -- drift <release>'
    )
    expect(process.exitCode).toBe(1)
  })
})
