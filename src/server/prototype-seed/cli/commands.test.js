import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { describe, expect, it } from 'vitest'

import { createServer } from '../../server.js'
import { copy as originCopy } from '../../app/sets/high-risk-plants/journeys/linear/features/origin/copy/copy.en.js'
import { loadExamples } from '../examples.js'
import { loadFixturePool } from '../fixtures.js'
import { validateExamples } from '../grammar.js'
import { examples as highRiskPlantsExamples } from '../scenarios/high-risk-plants.js'
import { main } from './commands.js'

const SET_ID = 'high-risk-plants'

/** Runs one command and keeps what it printed. */
const run = async (argv, overrides = {}) => {
  const out = []
  const err = []
  const code = await main(argv, {
    out: (line) => out.push(line),
    err: (line) => err.push(line),
    ...overrides
  })
  return { code, out: out.join('\n'), err: err.join('\n') }
}

const startedServer = async () => {
  const server = await createServer()
  await server.initialize()
  return server
}

describe('npm run designer:examples', () => {
  it('Should explain itself when given no command', async () => {
    const { code, out } = await run([])

    expect(code).toBe(0)
    expect(out).toContain(
      'Usage: npm run designer:examples -- <command> <set-id>'
    )
  })

  it('Should refuse an unknown command and a missing set', async () => {
    expect((await run(['tidy', SET_ID])).code).toBe(1)

    const missing = await run(['list'])
    expect(missing.code).toBe(1)
    expect(missing.err).toContain(
      'Say which set, for example: npm run designer:examples -- list high-risk-plants'
    )
  })

  it('Should say plainly when a set has no examples', async () => {
    const { code, out } = await run(['list', 'sample-journey'])

    expect(code).toBe(0)
    expect(out).toContain('sample-journey has no examples')
  })

  describe('list', () => {
    it('Should list every example with what it will be and where it stops', async () => {
      const { code, out } = await run(['list', SET_ID])

      expect(code).toBe(0)
      for (const { slug } of highRiskPlantsExamples) {
        expect(out).toContain(`  ${slug}: `)
      }
      expect(out).toContain(
        'draft-just-started: Draft, just started (draft; stops on commodities/details)'
      )
      expect(out).toContain(
        '(submitted, for example-organisation-b only; goes to the end)'
      )
    })

    it('Should print the problems when an example is written wrongly', async () => {
      const { code, err } = await run(['list', SET_ID], {
        loadExamples: () =>
          validateExamples([{ label: 'No slug', fixture: 'warePotatoes' }], {
            pool: loadFixturePool(SET_ID),
            source: 'src/server/prototype-seed/scenarios/high-risk-plants.js'
          })
      })

      expect(code).toBe(1)
      expect(err).toContain("Example 1 ('No slug') needs a slug")
    })
  })

  describe('links', () => {
    it('Should print a stable link per example', async () => {
      const { code, out } = await run(['links', SET_ID])

      expect(code).toBe(0)
      expect(out).toContain(
        'http://localhost:3103/examples/high-risk-plants/submitted-late'
      )
    })

    it('Should sign in as another organisation first for that organisation’s example', async () => {
      const { out } = await run(['links', SET_ID])

      expect(out).toContain(
        'http://localhost:3103/auth/stub-sign-in?organisationId=example-organisation-b&redirect=%2Fexamples%2Fhigh-risk-plants%2Fanother-organisation'
      )
    })

    it('Should use another address when given --base', async () => {
      const { out } = await run([
        'links',
        SET_ID,
        '--base',
        'https://plants-prototype.example'
      ])

      expect(out).toContain(
        'https://plants-prototype.example/examples/high-risk-plants/copied'
      )
    })
  })

  describe('check', () => {
    it('Should report a refused example as stopped, with what the page said, and fail', async () => {
      const [bad] = validateExamples(
        [
          {
            label: 'Bad origin',
            slug: 'bad-origin',
            fixture: 'warePotatoes',
            answers: { origin: { countryOfOrigin: 'ZZ' } }
          }
        ],
        { pool: loadFixturePool(SET_ID), source: 'this test' }
      )
      const [good] = loadExamples(SET_ID)

      const { code, out } = await run(['check', SET_ID], {
        loadExamples: () => [good, bad],
        createServer: startedServer
      })

      expect(code).toBe(1)
      expect(out).toContain(
        `Reached  ${good.slug}: ${good.label} (draft, stops on commodities/details)`
      )
      expect(out).toContain(
        `Stopped  bad-origin: Example 'Bad origin' stopped at origin: the page said '${originCopy.errors.countryRequired}'`
      )
      expect(out).toContain('1 of 2 examples reached their page.')
    })

    it('Should pass when every example reaches its page', async () => {
      const { code, out } = await run(['check', SET_ID], {
        createServer: startedServer
      })

      expect(code).toBe(0)
      expect(out).toContain(
        `${highRiskPlantsExamples.length} of ${highRiskPlantsExamples.length} examples reached their page.`
      )
    })

    it('Should explain when the prototype will not start', async () => {
      const { code, err } = await run(['check', SET_ID], {
        createServer: async () => {
          throw new Error('Cannot find the assets manifest')
        }
      })

      expect(code).toBe(1)
      expect(err).toContain(
        'The prototype would not start, so the examples cannot be checked'
      )
    })
  })

  describe('fixtures', () => {
    it('Should list each fixture with its pages and say where they differ', async () => {
      const { code, out } = await run(['fixtures', SET_ID])

      expect(code).toBe(0)
      expect(out).toContain('warePotatoes')
      expect(out).toContain('plantsForPlanting')
      expect(out).toMatch(/commodity-type > /)
      expect(out).toContain('Where they differ:')
    })
  })

  describe('init', () => {
    it('Should start a scenario file from the four default examples, once', async () => {
      const file = join(
        mkdtempSync(join(tmpdir(), 'scenarios-')),
        'plants-dr2.js'
      )
      const io = { scenarioFileFor: () => file }
      const release = SET_ID

      const first = await run(['init', release], io)
      const second = await run(['init', release], io)

      expect(first.code).toBe(0)
      const text = readFileSync(file, 'utf8')
      expect(text).toContain('export const examples = [')
      expect(text).toContain("slug: 'draft-midway'")
      expect(text).toContain("fixture: 'plantsForPlanting'")
      expect(text).not.toContain('happy-path')
      expect(second.code).toBe(1)
      expect(second.err).toContain('already exists')
    })

    it('Should write a file Prettier leaves as it is, and the seed can read', async () => {
      const { format, resolveConfig } = await import('prettier')
      const dir = mkdtempSync(join(tmpdir(), 'scenarios-'))
      const file = join(dir, 'plants-dr2.js')
      await run(['init', SET_ID], { scenarioFileFor: () => file })
      const text = readFileSync(file, 'utf8')

      const options = await resolveConfig(
        fileURLToPath(
          new URL('../scenarios/high-risk-plants.js', import.meta.url)
        )
      )
      expect(await format(text, { ...options, filepath: file })).toBe(text)
      const { examples } = await import(pathToFileURL(file).href)
      expect(() =>
        validateExamples(examples, {
          pool: loadFixturePool(SET_ID),
          source: 'the new file'
        })
      ).not.toThrow()
    })
  })
})
