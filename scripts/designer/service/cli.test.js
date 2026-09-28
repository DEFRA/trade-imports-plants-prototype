import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { gitEnv } from '../lib/git-env.js'
import { REPO_ROOT } from '../lib/repo.js'
import { makeFixtureRepo } from '../lib/test-support.js'
import {
  ANIMALS_SERVICES,
  importersOf,
  parseArgs,
  run,
  serviceFolderFor,
  upstreamHasService,
  USAGE
} from './cli.js'
import { OWNER_IDS } from './templates.js'

const FOO_FOLDER = 'src/server/app/services/foo'
const FOO_GLOB = `${FOO_FOLDER}/**`
const DESCRIBE = 'A register of foos.'

const newFoo = ['new', 'foo', '--owner', 'new-api', '--describe', DESCRIBE]

const oursOf = (root) =>
  JSON.parse(readFileSync(path.join(root, 'overrides.json'), 'utf8')).ours

describe('parseArgs', () => {
  it('Should read the command, the name and each flag, whatever the order', () => {
    expect(OWNER_IDS).toContain('address-book')
    expect(
      parseArgs([
        '--owner',
        'address-book',
        'new',
        '--describe',
        'A thing.',
        'things'
      ])
    ).toEqual({
      command: 'new',
      name: 'things',
      owner: 'address-book',
      describe: 'A thing.',
      scope: 'platform',
      set: undefined,
      force: false,
      help: false
    })
  })

  it('Should read --scope and --set, for a set-owned service', () => {
    expect(
      parseArgs([
        'new',
        'things',
        '--owner',
        'new-api',
        '--describe',
        'A thing.',
        '--scope',
        'set',
        '--set',
        'plants-working'
      ])
    ).toMatchObject({ scope: 'set', set: 'plants-working' })
  })
})

describe('designer:service', () => {
  let fixture
  let tidied
  const options = (extra = {}) => ({
    root: fixture.root,
    upstreamHas: () => false,
    tidy: (files) => {
      tidied.push(...files)
    },
    ...extra
  })

  beforeEach(() => {
    fixture = makeFixtureRepo()
    tidied = []
  })

  afterEach(() => fixture.cleanup())

  it('Should print the usage when asked for nothing', async () => {
    expect(await run([], options())).toEqual({ status: 0, lines: [USAGE] })
  })

  describe('new', () => {
    it('Should write the five files, tidy them, and add one ours line', async () => {
      const result = await run(newFoo, options())

      expect(result.status).toBe(0)
      for (const file of [
        'index.js',
        'client.js',
        'stub.js',
        'contract.json',
        'foo.test.js'
      ]) {
        expect(existsSync(path.join(fixture.root, FOO_FOLDER, file))).toBe(true)
      }
      expect(tidied).toHaveLength(5)
      expect(oursOf(fixture.root).filter((line) => line === FOO_GLOB)).toEqual([
        FOO_GLOB
      ])
      expect(result.lines).toContain(
        `Check it: npm test -- ${FOO_FOLDER} --coverage.enabled=false`
      )
    })

    it('Should build index.js and contract.json on the real pattern, with no prototype plumbing and no CONTRACT export', async () => {
      await run(
        [
          'new',
          'saved-vehicles',
          '--owner',
          'plants-backend',
          '--describe',
          'Saved vehicles.'
        ],
        options()
      )
      const folder = path.join(
        fixture.root,
        'src/server/app/services/saved-vehicles'
      )
      const index = readFileSync(path.join(folder, 'index.js'), 'utf8')
      const client = readFileSync(path.join(folder, 'client.js'), 'utf8')
      const stub = readFileSync(path.join(folder, 'stub.js'), 'utf8')
      const contract = JSON.parse(
        readFileSync(path.join(folder, 'contract.json'), 'utf8')
      )

      expect(index).toContain(
        'const impl = () => (isStubDataMode() ? stub : client)'
      )
      expect(index).toContain('export const listSavedVehicles')
      expect(index).toContain('export const getSavedVehicle')
      expect(index).not.toContain('NEEDS_A_REAL_SERVICE')
      expect(index).not.toMatch(/^export const CONTRACT/m)
      expect(contract).toMatchObject({
        service: 'saved-vehicles',
        owner: 'plants-backend',
        baseUrlEnv: 'TRADE_IMPORTS_PLANTS_BACKEND_URL',
        needsARealService: 'Saved vehicles.'
      })
      expect(contract.operations.length).toBeGreaterThan(0)
      expect(`${index}${client}`).not.toContain('prototype-support')
      expect(stub).toContain('prototype-support/fake-store.js')
    })

    it('Should give an address-book or new-api owner the organisation-scoped path, and plants-backend the flat one', async () => {
      await run(
        [
          'new',
          'saved-addresses',
          '--owner',
          'address-book',
          '--describe',
          'x'
        ],
        options()
      )
      const contract = JSON.parse(
        readFileSync(
          path.join(
            fixture.root,
            'src/server/app/services/saved-addresses/contract.json'
          ),
          'utf8'
        )
      )

      expect(contract.baseUrlEnv).toBe('TRADE_IMPORTS_ADDRESS_BOOK_URL')
      expect(contract.operations[0].path).toBe(
        '/organisation/{organisationId}/saved-addresses'
      )
    })

    it('Should make a set-owned service under the release, with no overrides.json line', async () => {
      fixture.write(
        'src/server/app/sets/plants-working/set.js',
        "export const SET_ID = 'plants-working'\n"
      )
      const before = oursOf(fixture.root)

      const result = await run(
        [
          'new',
          'foo',
          '--owner',
          'new-api',
          '--describe',
          DESCRIBE,
          '--scope',
          'set',
          '--set',
          'plants-working'
        ],
        options()
      )

      const folder = serviceFolderFor({
        name: 'foo',
        scope: 'set',
        set: 'plants-working'
      })
      expect(folder).toBe('src/server/app/sets/plants-working/services/foo')
      expect(result.status).toBe(0)
      expect(existsSync(path.join(fixture.root, folder, 'contract.json'))).toBe(
        true
      )
      expect(oursOf(fixture.root)).toEqual(before)
      expect(result.lines.join('\n')).toContain(
        'Owned by plants-working alone: no overrides.json line needed.'
      )
    })

    it('Should build client.js on the same request shape as the synced services/address-book/client.js', async () => {
      await run(
        [
          'new',
          'saved-vehicles',
          '--owner',
          'plants-backend',
          '--describe',
          'x'
        ],
        options()
      )
      const generated = readFileSync(
        path.join(
          fixture.root,
          'src/server/app/services/saved-vehicles/client.js'
        ),
        'utf8'
      )
      const synced = readFileSync(
        path.join(REPO_ROOT, 'src/server/app/services/address-book/client.js'),
        'utf8'
      )

      // The load-bearing shape every service client shares with the synced
      // real one: the organisation header name, the trace header fallback,
      // and the headers() object's three keys, in the same order.
      const ORG_HEADER = "'Trade-Imports-Organisation-Id'"
      const TRACE_FALLBACK = "process.env.TRACING_HEADER ?? 'x-cdp-request-id'"
      const HEADERS_SHAPE =
        /headers = \(orgId\) => \(\{\s*'Content-Type': 'application\/json',\s*\[[A-Z_]+\]: orgId,\s*\[tracingHeader\]: getTraceId\(\) \?\? ''/

      for (const shared of [ORG_HEADER, TRACE_FALLBACK]) {
        expect(synced).toContain(shared)
        expect(generated).toContain(shared)
      }
      expect(generated).toMatch(HEADERS_SHAPE)
      expect(generated).not.toContain(' || ')
    })

    it('Should refuse a set scope with no --set, or a release that does not exist', async () => {
      const noSet = await run(
        [
          'new',
          'foo',
          '--owner',
          'new-api',
          '--describe',
          DESCRIBE,
          '--scope',
          'set'
        ],
        options()
      )
      const missingRelease = await run(
        [
          'new',
          'foo',
          '--owner',
          'new-api',
          '--describe',
          DESCRIBE,
          '--scope',
          'set',
          '--set',
          'no-such-release'
        ],
        options()
      )

      expect(noSet.status).toBe(1)
      expect(noSet.lines[0]).toContain('--set <release>')
      expect(missingRelease.status).toBe(1)
      expect(missingRelease.lines[0]).toContain('no-such-release')
    })

    it('Should refuse a name the real service already has, and change nothing', async () => {
      const before = oursOf(fixture.root)

      const result = await run(
        ['new', 'countries', '--owner', 'new-api', '--describe', 'x'],
        options({ upstreamHas: (name) => name === 'countries' })
      )

      expect(result.status).toBe(1)
      expect(result.lines[0]).toContain(
        'The real plants service already has src/server/app/services/countries/'
      )
      expect(oursOf(fixture.root)).toEqual(before)
    })

    it('Should refuse a service the real team removed on purpose', async () => {
      const result = await run(
        [
          'new',
          'commercial-transporters',
          '--owner',
          'new-api',
          '--describe',
          'x'
        ],
        options()
      )

      expect(result.status).toBe(1)
      expect(result.lines[0]).toContain('removed a service called')
    })

    it('Should refuse a folder that already exists, a bad name, a missing owner and a missing sentence', async () => {
      fixture.write(`${FOO_FOLDER}/index.js`, 'export {}\n')

      const refusals = await Promise.all([
        run(newFoo, options()),
        run(
          ['new', 'Foo Bar', '--owner', 'new-api', '--describe', 'x'],
          options()
        ),
        run(['new', 'bar', '--describe', 'x'], options()),
        run(['new', 'bar', '--owner', 'new-api'], options())
      ])

      expect(refusals.map(({ status }) => status)).toEqual([1, 1, 1, 1])
      expect(refusals.map(({ lines }) => lines[0])).toEqual([
        expect.stringContaining('already exists'),
        expect.stringContaining('lower-case words joined by hyphens'),
        expect.stringContaining('--owner'),
        expect.stringContaining('--describe')
      ])
    })

    it('Should warn for a name the animals frontend uses, and when it could not check upstream', async () => {
      const result = await run(
        [
          'new',
          'document-uploads',
          '--owner',
          'new-api',
          '--describe',
          'Uploads.'
        ],
        options({ upstreamHas: () => null })
      )

      expect(ANIMALS_SERVICES).toContain('document-uploads')
      expect(result.status).toBe(0)
      expect(result.lines[0]).toContain('upstream/main is not fetched here')
      expect(result.lines[1]).toContain('The animals frontend has a service')
    })
  })

  describe('retire', () => {
    it('Should delete the folder and its ours line', async () => {
      await run(newFoo, options())

      const result = await run(['retire', 'foo'], options())

      expect(result.status).toBe(0)
      expect(existsSync(path.join(fixture.root, FOO_FOLDER))).toBe(false)
      expect(oursOf(fixture.root)).not.toContain(FOO_GLOB)
    })

    it('Should refuse while a release still uses it, unless forced', async () => {
      await run(newFoo, options())
      const page =
        'src/server/app/sets/plants-working/journeys/linear/features/foo-list/controller.js'
      fixture.write(
        page,
        "import * as foo from '../../../../../../services/foo/index.js'\n"
      )

      const refused = await run(['retire', 'foo'], options())
      const forced = await run(['retire', 'foo', '--force'], options())

      expect(importersOf('foo', { root: fixture.root })).toEqual([page])
      expect(refused.status).toBe(1)
      expect(refused.lines).toContain(`  ${page}`)
      expect(forced.status).toBe(0)
    })

    it('Should refuse a service that is not prototype-owned', async () => {
      const result = await run(['retire', 'countries'], options())

      expect(result.status).toBe(1)
      expect(result.lines[0]).toContain('is not a prototype-owned service')
    })
  })

  describe('list', () => {
    it('Should print each prototype-owned service with what it needs', async () => {
      fixture.write(
        `${FOO_FOLDER}/contract.json`,
        JSON.stringify({ owner: 'new-api', needsARealService: DESCRIBE })
      )
      const overridesFile = path.join(fixture.root, 'overrides.json')
      const overrides = JSON.parse(readFileSync(overridesFile, 'utf8'))
      fixture.write(
        'overrides.json',
        JSON.stringify({ ...overrides, ours: [...overrides.ours, FOO_GLOB] })
      )

      expect(await run(['list'], options())).toEqual({
        status: 0,
        lines: [
          `foo (new-api): ${FOO_FOLDER}/`,
          `  Needs a real service: ${DESCRIBE}`
        ]
      })
    })

    it('Should say when there are none', async () => {
      expect((await run(['list'], options())).lines).toEqual([
        'There are no prototype-owned services.'
      ])
    })
  })
})

describe('#upstreamHasService', () => {
  let fixture

  beforeEach(() => {
    fixture = makeFixtureRepo({ git: true })
    fixture.write('src/server/app/services/countries/index.js', 'export {}\n')
    const git = (args) =>
      execFileSync('git', args, {
        cwd: fixture.root,
        env: gitEnv(),
        stdio: 'ignore'
      })
    git(['add', '-A'])
    git([
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.com',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '--quiet',
      '--no-verify',
      '-m',
      'countries'
    ])
    git(['update-ref', 'refs/remotes/upstream/main', 'HEAD'])
  })

  afterEach(() => fixture.cleanup())

  it('Should ask upstream/main whether the real service has the folder', () => {
    expect(upstreamHasService('countries', { root: fixture.root })).toBe(true)
    expect(upstreamHasService('foo', { root: fixture.root })).toBe(false)
  })

  it('Should answer null where upstream/main is not fetched', () => {
    const bare = makeFixtureRepo({ git: true })
    expect(upstreamHasService('countries', { root: bare.root })).toBeNull()
    bare.cleanup()
  })
})

describe('designer:service on the real prototype', () => {
  it('Should refuse to make countries, which the real service has', async () => {
    const result = await run(
      ['new', 'countries', '--owner', 'new-api', '--describe', 'x'],
      { root: REPO_ROOT, upstreamHas: () => null, tidy: () => true }
    )

    expect(result.status).toBe(1)
  })
})
