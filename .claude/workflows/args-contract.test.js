import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

// Every workflow script in this folder shares one args contract: args may
// arrive as an object or a JSON string, every key is required (no defaults),
// and a missing key stops the script before any agent runs. The block that
// does this is copied byte for byte between the markers below, so a fix to
// it is made once and pasted into every script.

const START = '// >>> args-contract'
const END = '// <<< args-contract'

const FOLDER = new URL('./', import.meta.url)

const workflowFiles = readdirSync(FOLDER)
  .filter((file) => file.endsWith('.js') && !file.endsWith('.test.js'))
  .sort()

const sourceOf = (file) => readFileSync(new URL(file, FOLDER), 'utf8')

const contractBlockOf = (source) => {
  const start = source.indexOf(START)
  const end = source.indexOf(END)
  if (start === -1 || end === -1 || end < start) {
    return null
  }
  return source.slice(start, end + END.length)
}

const requiredKeysOf = (source) => {
  const match = /const REQUIRED_KEYS = \[([^\]]*)\]/.exec(source)
  return match ? [...match[1].matchAll(/'([^']+)'/g)].map(([, key]) => key) : []
}

// The Workflow tool runs a script as the body of an async function with its
// hooks in scope. Run it the same way, with every hook a recording stand-in.
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
const HOOKS = [
  'args',
  'agent',
  'parallel',
  'pipeline',
  'log',
  'phase',
  'workflow',
  'budget'
]

const runWorkflow = (source, args) => {
  const agent = vi.fn(async () => null)
  const stubs = {
    args,
    agent,
    parallel: vi.fn(async (thunks) =>
      Promise.all(thunks.map((thunk) => thunk()))
    ),
    pipeline: vi.fn(async () => []),
    log: vi.fn(),
    phase: vi.fn(),
    workflow: vi.fn(async () => null),
    budget: { total: null, spent: () => 0, remaining: () => Infinity }
  }
  const run = new AsyncFunction(
    ...HOOKS,
    source.replace('export const meta', 'const meta')
  )(...HOOKS.map((name) => stubs[name]))
  return { run, agent }
}

describe('workflow args contract', () => {
  it('finds workflow scripts to check', () => {
    expect(workflowFiles.length).toBeGreaterThan(0)
  })

  it('every workflow carries the same args-contract block, byte for byte', () => {
    const blocks = workflowFiles.map((file) => ({
      file,
      block: contractBlockOf(sourceOf(file))
    }))
    const missing = blocks.filter(({ block }) => block === null)
    expect(missing.map(({ file }) => file)).toEqual([])

    const [first] = blocks
    const different = blocks.filter(({ block }) => block !== first.block)
    expect(
      different.map(({ file }) => file),
      `these differ from ${first.file}`
    ).toEqual([])
  })

  describe.each(workflowFiles)('%s', (file) => {
    const source = sourceOf(file)
    const requiredKeys = requiredKeysOf(source)

    it('opens with a pure-literal meta and names its required keys', () => {
      expect(source.startsWith('export const meta = {')).toBe(true)
      expect(requiredKeys.length).toBeGreaterThan(0)
    })

    it('uses the contract before anything else reads args', () => {
      expect(source).toMatch(/const config = parseArgs\(WORKFLOW_NAME, args\)/)
      expect(source).toMatch(
        /requireKeys\(WORKFLOW_NAME, config, REQUIRED_KEYS\)/
      )
      expect(source).toMatch(/logResolvedConfig\(WORKFLOW_NAME, config\)/)
    })

    it('has one MODELS constant naming runner, builder and judge', () => {
      const models = source.match(/^const MODELS = \{([^}]*)\}/gm) ?? []
      expect(models).toHaveLength(1)
      for (const tier of ['runner', 'builder', 'judge']) {
        expect(models[0]).toMatch(new RegExp(`\\b${tier}:`))
      }
    })

    it('stops before any agent when args is missing', async () => {
      const { run, agent } = runWorkflow(source, undefined)
      await expect(run).rejects.toThrow(/args is missing required/)
      expect(agent).not.toHaveBeenCalled()
    })

    it('stops before any agent when args is a string that is not JSON', async () => {
      const { run, agent } = runWorkflow(source, 'set=plants-working')
      await expect(run).rejects.toThrow(/not JSON/)
      expect(agent).not.toHaveBeenCalled()
    })

    it.each(requiredKeysOf(source))(
      'stops before any agent when "%s" is missing',
      async (key) => {
        const args = Object.fromEntries(
          requiredKeys
            .filter((other) => other !== key)
            .map((other) => [other, 'x'])
        )
        const { run, agent } = runWorkflow(source, JSON.stringify(args))
        await expect(run).rejects.toThrow(
          new RegExp(`missing required key ${key}\\b`)
        )
        expect(agent).not.toHaveBeenCalled()
      }
    )
  })
})
