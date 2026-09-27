import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const SCRIPT = readFileSync(
  new URL('./wording-sweep.js', import.meta.url),
  'utf8'
)

// The Workflow tool runs a script as the body of an async function with
// `args`, `agent`, `parallel`, `log` and `phase` in scope. Run it the same
// way, with stand-ins that record every call.
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor

const runInOrder = async (thunks) => {
  const results = []
  for (const thunk of thunks) {
    results.push(await thunk().catch(() => null))
  }
  return results
}

const runWorkflow = (
  args,
  { agent, parallel = vi.fn(runInOrder), log = vi.fn(), phase = vi.fn() }
) =>
  new AsyncFunction(
    'args',
    'agent',
    'parallel',
    'log',
    'phase',
    SCRIPT.replace('export const meta', 'const meta')
  )(args, agent, parallel, log, phase)

const ARGS = {
  set: 'plants-working',
  sweeps: [
    {
      find: 'Consignment parties',
      replace: 'Consignment addresses',
      scope: 'all'
    }
  ],
  welsh: 'mark',
  welshText: null
}

const CAPTIONS =
  'src/server/app/sets/plants-working/journeys/linear/flow/section-captions/copy'

const LEAF = {
  feature: 'section-captions',
  pages: ['consignor-select'],
  alsoOn: [],
  keyPath: 'sections.consignmentParties',
  file: `${CAPTIONS}/copy.en.js`,
  line: 12,
  cyFile: `${CAPTIONS}/copy.cy.js`,
  cyLine: 12,
  en: 'Consignment parties',
  cy: 'Partïon y llwyth',
  kind: 'string',
  welsh: 'translated',
  shared: false
}

const group = (folder, keyPath = 'sections.consignmentParties') => ({
  folder,
  enFile: `${folder}/copy.en.js`,
  cyFile: `${folder}/copy.cy.js`,
  edits: [
    {
      keyPath,
      pages: ['consignor-select'],
      kind: 'string',
      before: 'Consignment parties',
      after: 'Consignment addresses',
      cyBefore: 'Partïon y llwyth',
      cyAfter: '[Welsh needed] Consignment addresses',
      welshNeeded: true
    }
  ]
})

const PLAN = { groups: [group(CAPTIONS)], skipped: [], shared: [] }

const LOCATED = {
  ok: true,
  kind: 'release',
  frozen: false,
  copy: [LEAF],
  templates: []
}

const answers = (overrides = {}) => {
  const checks = overrides.checks ?? [true]
  let checkIndex = 0
  return vi.fn(async (_prompt, opts) => {
    if (opts.label.startsWith('find')) {
      return overrides.locate ?? LOCATED
    }
    if (opts.label === 'plan the sweep') {
      return overrides.plan ?? PLAN
    }
    if (opts.label.startsWith('check')) {
      const passed = checks[Math.min(checkIndex, checks.length - 1)]
      checkIndex++
      return {
        passed,
        summary: passed ? 'All passed' : 'Copy shape failed',
        failures: []
      }
    }
    if (opts.label.startsWith('show')) {
      return { ok: true, galleryPath: '.cache/designer/show/x', summary: 'ok' }
    }
    return { applied: ['sections.consignmentParties'], problems: [] }
  })
}

const labels = (agent) => agent.mock.calls.map(([, opts]) => opts.label)
const promptFor = (agent, label) =>
  agent.mock.calls.find(([, opts]) => opts.label === label)[0]
const modelOf = (agent, label) =>
  agent.mock.calls.find(([, opts]) => opts.label === label)[1].model

describe('wording-sweep workflow: the args contract', () => {
  let agent

  beforeEach(() => {
    agent = answers()
  })

  it('Should stop before any agent when a required key is missing', async () => {
    const { welshText, ...withoutWelshText } = ARGS
    const run = runWorkflow(withoutWelshText, { agent })
    await expect(run).rejects.toThrow(
      'wording-sweep: args is missing required key welshText. Pass every one in args: this workflow has no defaults'
    )
    expect(agent).not.toHaveBeenCalled()
    expect(welshText).toBeNull()
  })

  it('Should name every missing key when args are absent', async () => {
    const run = runWorkflow(undefined, { agent })
    await expect(run).rejects.toThrow(
      'missing required keys set, sweeps, welsh, welshText'
    )
    expect(agent).not.toHaveBeenCalled()
  })

  it('Should log the resolved configuration before anything else', async () => {
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(log.mock.calls[0][0]).toBe(
      `wording-sweep: resolved configuration ${JSON.stringify(ARGS)}`
    )
  })

  it('Should accept args as a JSON string', async () => {
    await runWorkflow(JSON.stringify(ARGS), { agent })
    expect(labels(agent)[0]).toBe('find "Consignment parties"')
  })

  it.each([
    [{ set: 'high-risk-plants' }, 'high-risk-plants is the real service'],
    [{ set: 'sample-journey' }, 'sample-journey is a placeholder'],
    [{ sweeps: [] }, 'sweeps must be a list'],
    [{ sweeps: [{ find: 'A', replace: 'B' }] }, 'sweep 1 needs scope'],
    [{ sweeps: [{ find: '', replace: 'B', scope: 'all' }] }, 'sweep 1 needs'],
    [{ welsh: 'auto' }, 'welsh must be "mark"'],
    [{ welshText: ['Cyfeiriadau'] }, 'welshText must be null'],
    [{ welsh: 'given', welshText: null }, 'one Welsh string per sweep'],
    [{ welsh: 'given', welshText: ['a', 'b'] }, 'one Welsh string per sweep']
  ])('Should refuse %j before any agent', async (change, message) => {
    const run = runWorkflow({ ...ARGS, ...change }, { agent })
    await expect(run).rejects.toThrow(message)
    expect(agent).not.toHaveBeenCalled()
  })
})

describe('wording-sweep workflow: the run', () => {
  it('Should locate, plan, edit, check and show in order', async () => {
    const agent = answers()
    await runWorkflow(ARGS, { agent })
    expect(labels(agent)).toEqual([
      'find "Consignment parties"',
      'plan the sweep',
      `edit ${CAPTIONS}`,
      'check',
      'show the changed pages'
    ])
  })

  it('Should give each step the model its tier names', async () => {
    const agent = answers()
    await runWorkflow(ARGS, { agent })
    expect(modelOf(agent, 'find "Consignment parties"')).toBe('haiku')
    expect(modelOf(agent, 'plan the sweep')).toBe('opus')
    expect(modelOf(agent, `edit ${CAPTIONS}`)).toBe('sonnet')
    expect(modelOf(agent, 'check')).toBe('haiku')
  })

  it('Should find the words with designer:words in the named release', async () => {
    const agent = answers()
    await runWorkflow(ARGS, { agent })
    expect(promptFor(agent, 'find "Consignment parties"')).toContain(
      'npm run designer:words -- find "Consignment parties" --set plants-working --json'
    )
  })

  it('Should tell the planner to mark the Welsh', async () => {
    const agent = answers()
    await runWorkflow(ARGS, { agent })
    expect(promptFor(agent, 'plan the sweep')).toContain(
      'The Welsh policy is "mark"'
    )
  })

  it('Should return the page, before, after and Welsh needed table', async () => {
    const result = await runWorkflow(ARGS, { agent: answers() })
    expect(result.table).toEqual([
      {
        page: 'consignor-select',
        key: 'sections.consignmentParties',
        before: 'Consignment parties',
        after: 'Consignment addresses',
        welshNeeded: true
      }
    ])
    expect(result.welshNeeded).toBe(1)
    expect(result.check).toEqual({
      passed: true,
      repairs: 0,
      summary: 'All passed'
    })
    expect(result.gallery).toBe('.cache/designer/show/x')
  })

  it('Should refuse a frozen release after the find, changing nothing', async () => {
    const agent = answers({ locate: { ...LOCATED, frozen: true } })
    const result = await runWorkflow(ARGS, { agent })
    expect(result.refused).toContain('plants-working is a frozen release')
    expect(labels(agent)).toEqual(['find "Consignment parties"'])
  })

  it('Should stop with a note when nothing matched', async () => {
    const agent = answers({
      locate: { ok: true, kind: 'release', copy: [], templates: [] }
    })
    const result = await runWorkflow(ARGS, { agent })
    expect(result.note).toContain('Nothing matched')
    expect(labels(agent)).toEqual(['find "Consignment parties"'])
  })

  it('Should run at most 6 builders at once', async () => {
    const folders = Array.from({ length: 8 }, (_, index) => `folder-${index}`)
    const agent = answers({
      plan: { groups: folders.map((f) => group(f)), skipped: [], shared: [] }
    })
    const parallel = vi.fn(runInOrder)
    await runWorkflow(ARGS, { agent, parallel })
    const sizes = parallel.mock.calls.map(([thunks]) => thunks.length)
    expect(sizes).toEqual([1, 6, 2])
  })

  it('Should repair a failing check and show once it passes', async () => {
    const agent = answers({ checks: [false, false, true] })
    await runWorkflow(ARGS, { agent })
    expect(labels(agent).slice(3)).toEqual([
      'check',
      'repair 1',
      'check again (1)',
      'repair 2',
      'check again (2)',
      'show the changed pages'
    ])
  })

  it('Should stop repairing after 3 tries and skip the gallery', async () => {
    const agent = answers({ checks: [false] })
    const result = await runWorkflow(ARGS, { agent })
    const repairs = labels(agent).filter((label) => label.startsWith('repair'))
    expect(repairs).toEqual(['repair 1', 'repair 2', 'repair 3'])
    expect(labels(agent)).not.toContain('show the changed pages')
    expect(result.check.passed).toBe(false)
  })

  it('Should show error states when an error message changed', async () => {
    const agent = answers({
      plan: {
        groups: [group('arrival', 'errors.arrivalDate.required')],
        skipped: [],
        shared: []
      }
    })
    await runWorkflow(ARGS, { agent })
    expect(promptFor(agent, 'show the changed pages')).toContain(
      'npm run designer:show -- --set plants-working --pages changed --errors'
    )
  })

  it('Should log shared chrome as a design gap, never edit it', async () => {
    const shared = {
      keyPath: 'saveActions.saveAndContinue',
      file: 'src/server/app/shared/copy.en.js',
      before: 'Save and continue',
      after: 'Save and go on'
    }
    const agent = answers({ plan: { ...PLAN, shared: [shared] } })
    const result = await runWorkflow(ARGS, { agent })
    const prompt = promptFor(agent, 'log shared chrome as design gaps')
    expect(prompt).toContain(
      'src/server/app/sets/plants-working/design-gaps.md'
    )
    expect(prompt).toContain('saveActions.saveAndContinue')
    expect(labels(agent)).not.toContain('edit src/server/app/shared')
    expect(result.sharedChrome).toEqual([shared])
  })
})
