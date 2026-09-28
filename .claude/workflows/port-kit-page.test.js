import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const SCRIPT = readFileSync(
  new URL('./port-kit-page.js', import.meta.url),
  'utf8'
)

// The Workflow tool runs a script as the body of an async function with
// `args`, `agent`, `log` and `phase` in scope. Run it the same way, with
// stand-ins that record every call.
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
const runWorkflow = (args, { agent, log = vi.fn(), phase = vi.fn() }) =>
  new AsyncFunction(
    'args',
    'agent',
    'log',
    'phase',
    SCRIPT.replace('export const meta', 'const meta')
  )(args, agent, log, phase)

const ARGS = {
  set: 'plants-working',
  source:
    '.claude/skills/port-a-kit-page/references/examples/transporter-type.kit.html',
  sourceKind: 'html',
  slug: 'transporter-type',
  after: 'arrival-details',
  reference: null
}

const INVENTORY = {
  title: 'Choose a transporter type',
  pageKind: 'data-collecting',
  headings: [{ level: 1, text: 'Choose a transporter type' }],
  components: ['warning text', 'radios (hand-written)'],
  strings: [{ role: 'heading', text: 'Choose a transporter type' }],
  fields: [{ name: 'transporterType', type: 'radios', label: 'Type' }],
  reveals: [],
  appClasses: ['app-transporter-add-page'],
  links: [],
  scripts: [],
  notes: []
}

const answers = (overrides = {}) => {
  const checks = overrides.checks ?? [true]
  let checkIndex = 0
  const byLabel = {
    preflight: () => overrides.preflight ?? { ok: true, reason: 'Ready.' },
    inventory: () => INVENTORY,
    build: () => ({
      built: true,
      recipe: 'add-a-page',
      filesChanged: ['src/server/app/sets/plants-working/x/template.njk'],
      leftOut: [],
      notes: ''
    }),
    show: () => ({
      ran: true,
      galleryPath: '.cache/designer/show/plants-working/1',
      screenshots: ['transporter-type.png'],
      axeFindings: [],
      summary: 'ok'
    }),
    fidelity: () => ({
      rows: [
        {
          original: 'Warning text',
          built: 'govukWarningText',
          verdict: 'matched',
          why: 'Same component.'
        }
      ],
      gapRows: [
        '| transporter-type | Bespoke heading | govuk-heading-l | No Sass. | x |'
      ],
      summary: 'Close match.'
    }),
    'write records': () => 'done'
  }
  return vi.fn(async (_prompt, opts) => {
    if (opts.label.startsWith('check')) {
      const passed = checks[Math.min(checkIndex, checks.length - 1)]
      checkIndex++
      return {
        passed,
        summary: passed ? 'All passed' : 'Copy shape failed',
        logPath: 'x.log'
      }
    }
    if (opts.label.startsWith('repair')) {
      return byLabel.build()
    }
    return byLabel[opts.label]()
  })
}

const labels = (agent) => agent.mock.calls.map(([, opts]) => opts.label)
const promptFor = (agent, label) =>
  agent.mock.calls.find(([, opts]) => opts.label === label)[0]

describe('port-kit-page workflow', () => {
  let agent

  beforeEach(() => {
    agent = answers()
  })

  it('Should stop before any agent when a required key is missing', async () => {
    const { reference, ...withoutReference } = ARGS
    await expect(runWorkflow(withoutReference, { agent })).rejects.toThrow(
      'port-kit-page: args is missing required key reference. Pass every one in args: this workflow has no defaults'
    )
    expect(agent).not.toHaveBeenCalled()
    expect(reference).toBeNull()
  })

  it('Should name every missing key when args are absent', async () => {
    await expect(runWorkflow(undefined, { agent })).rejects.toThrow(
      'missing required keys set, source, sourceKind, slug, after, reference'
    )
    expect(agent).not.toHaveBeenCalled()
  })

  it('Should log the resolved configuration before anything else', async () => {
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(log.mock.calls[0][0]).toBe(
      `port-kit-page: resolved configuration ${JSON.stringify(ARGS)}`
    )
  })

  it('Should accept args as a JSON string', async () => {
    await runWorkflow(JSON.stringify(ARGS), { agent })
    expect(labels(agent)[0]).toBe('preflight')
  })

  it.each([
    [{ set: 'high-risk-plants' }, 'high-risk-plants is not a design release'],
    [{ set: 'sample-journey' }, 'sample-journey is not a design release'],
    [{ sourceKind: 'pdf' }, 'sourceKind must be one of html, url, screenshot'],
    [{ slug: 'Transporter Type' }, 'slug must be lower-case words'],
    [{ reference: 3 }, 'reference must be an image path or null']
  ])('Should refuse %j before any agent', async (change, message) => {
    await expect(
      runWorkflow({ ...ARGS, ...change }, { agent })
    ).rejects.toThrow(message)
    expect(agent).not.toHaveBeenCalled()
  })

  it('Should change nothing when the preflight says no', async () => {
    agent = answers({
      preflight: { ok: false, reason: 'This is a frozen release.' }
    })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(labels(agent)).toEqual(['preflight'])
    expect(log).toHaveBeenLastCalledWith(
      'Stopped before any change: This is a frozen release.'
    )
  })

  it('Should run inventory, build, check, show and fidelity in order', async () => {
    await runWorkflow(ARGS, { agent })
    expect(labels(agent)).toEqual([
      'preflight',
      'inventory',
      'build',
      'check 1',
      'show',
      'fidelity',
      'write records'
    ])
  })

  it('Should give each step the model its tier names', async () => {
    await runWorkflow(ARGS, { agent })
    const modelOf = (label) =>
      agent.mock.calls.find(([, opts]) => opts.label === label)[1].model
    expect(modelOf('preflight')).toBe('haiku')
    expect(modelOf('inventory')).toBe('opus')
    expect(modelOf('build')).toBe('sonnet')
    expect(modelOf('fidelity')).toBe('opus')
  })

  it('Should route a data-collecting page to the add-a-page recipe', async () => {
    await runWorkflow(ARGS, { agent })
    expect(promptFor(agent, 'build')).toContain(
      "change-the-journey's add-a-page recipe"
    )
    expect(promptFor(agent, 'build')).toContain(
      'comes straight after the page "arrival-details"'
    )
  })

  it('Should run the full check on the release', async () => {
    await runWorkflow(ARGS, { agent })
    expect(promptFor(agent, 'check 1')).toContain(
      'npm run designer:check -- --set plants-working --full'
    )
  })

  it('Should show the page without a reference when none is given', async () => {
    await runWorkflow(ARGS, { agent })
    expect(promptFor(agent, 'show')).toContain(
      'npm run designer:show -- --set plants-working --pages transporter-type\n'
    )
  })

  it('Should use a screenshot source as the reference image', async () => {
    await runWorkflow(
      { ...ARGS, sourceKind: 'screenshot', source: 'old.png' },
      { agent }
    )
    expect(promptFor(agent, 'show')).toContain(
      '--pages transporter-type --reference transporter-type=old.png'
    )
  })

  it('Should repair a failing check and carry on once it passes', async () => {
    agent = answers({ checks: [false, false, true] })
    await runWorkflow(ARGS, { agent })
    expect(labels(agent)).toEqual([
      'preflight',
      'inventory',
      'build',
      'check 1',
      'repair 1',
      'check 2',
      'repair 2',
      'check 3',
      'show',
      'fidelity',
      'write records'
    ])
  })

  it('Should park the port after 3 repairs, without showing or grading it', async () => {
    agent = answers({ checks: [false] })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(labels(agent).filter((label) => label.startsWith('repair'))).toEqual(
      ['repair 1', 'repair 2', 'repair 3']
    )
    expect(labels(agent)).not.toContain('show')
    expect(log.mock.calls.at(-1)[0]).toMatch(/^Parked: /)
  })

  it('Should write the fidelity table and the gap rows', async () => {
    await runWorkflow(ARGS, { agent })
    const prompt = promptFor(agent, 'write records')
    expect(prompt).toContain(
      'src/server/app/sets/plants-working/docs/fidelity-transporter-type.md'
    )
    expect(prompt).toContain(
      '| 1 | Warning text | govukWarningText | matched | Same component. |'
    )
    expect(prompt).toContain(
      'src/server/app/sets/plants-working/design-gaps.md'
    )
    expect(prompt).toContain(
      '| transporter-type | Bespoke heading | govuk-heading-l | No Sass. | x |'
    )
  })
})
