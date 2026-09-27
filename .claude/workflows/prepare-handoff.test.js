import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const SCRIPT = readFileSync(
  new URL('./prepare-handoff.js', import.meta.url),
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
  slug: 'arrival-time-hint',
  scope: 'all',
  paths: null,
  includeDesignGaps: true
}

const REAL_COPY =
  'src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-details/copy/copy.en.js'
const FOLDER = '.cache/designer/handoff/2026-09-27-arrival-time-hint'

const DRY_RUN = {
  startBranch: 'design/plants-working-arrival-hint',
  clean: true,
  handoffBranchExists: false,
  folder: FOLDER,
  report: {
    files: [{ path: REAL_COPY, status: 'changed' }],
    leftOut: [],
    cannotShip: { services: [] }
  },
  problem: ''
}

const TRIAGE = {
  items: [
    { path: REAL_COPY, category: 'upstream-ready', reason: 'Copy only' },
    {
      path: 'design-gaps.md: dashboard chips',
      category: 'design-gap',
      reason: 'No chip component'
    }
  ],
  upstreamReady: [REAL_COPY],
  why: 'Traders were unsure about the "time" format.',
  title: 'Clearer arrival time hint'
}

const answers = (overrides = {}) => {
  const verdicts = overrides.verdicts ?? [true]
  let verdictIndex = 0
  return vi.fn(async (_prompt, opts) => {
    if (opts.label === 'dry run') {
      return overrides.dryRun ?? DRY_RUN
    }
    if (opts.label === 'triage') {
      return overrides.triage ?? TRIAGE
    }
    if (opts.label.startsWith('verify')) {
      const passed = verdicts[Math.min(verdictIndex, verdicts.length - 1)]
      verdictIndex++
      return {
        passed,
        failures: passed
          ? []
          : [{ command: 'npm test', summary: 'copy.test.js', logPath: 'x' }]
      }
    }
    if (opts.label === 'park') {
      return 'Stashed and switched back.'
    }
    return { ok: true, summary: `${opts.label} done`, changedFiles: [] }
  })
}

const labels = (agent) => agent.mock.calls.map(([, opts]) => opts.label)
const promptFor = (agent, label) =>
  agent.mock.calls.find(([, opts]) => opts.label === label)[0]
const modelOf = (agent, label) =>
  agent.mock.calls.find(([, opts]) => opts.label === label)[1].model

describe('prepare-handoff workflow: the args contract', () => {
  let agent

  beforeEach(() => {
    agent = answers()
  })

  it('Should stop before any agent when a required key is missing', async () => {
    const { paths, ...withoutPaths } = ARGS
    await expect(runWorkflow(withoutPaths, { agent })).rejects.toThrow(
      'prepare-handoff: args is missing required key paths. Pass every one in args: this workflow has no defaults'
    )
    expect(agent).not.toHaveBeenCalled()
    expect(paths).toBeNull()
  })

  it('Should name every missing key when args are absent', async () => {
    await expect(runWorkflow(undefined, { agent })).rejects.toThrow(
      'missing required keys set, slug, scope, paths, includeDesignGaps'
    )
    expect(agent).not.toHaveBeenCalled()
  })

  it('Should log the resolved configuration before anything else', async () => {
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(log.mock.calls[0][0]).toBe(
      `prepare-handoff: resolved configuration ${JSON.stringify(ARGS)}`
    )
  })

  it('Should accept args as a JSON string', async () => {
    await runWorkflow(JSON.stringify(ARGS), { agent })
    expect(labels(agent)[0]).toBe('dry run')
  })

  it.each([
    [{ set: 'high-risk-plants' }, 'set is high-risk-plants'],
    [{ set: 'sample-journey' }, 'set is sample-journey'],
    [{ set: 'Plants Working' }, 'set must be a design release id'],
    [{ slug: '../x' }, 'slug must be lower-case words'],
    [{ scope: [] }, 'scope must be "all" or a list'],
    [{ scope: 'some' }, 'scope must be "all" or a list'],
    [{ paths: 'all' }, 'paths must be null'],
    [{ includeDesignGaps: 'yes' }, 'includeDesignGaps must be true or false']
  ])('Should refuse %j before any agent', async (change, message) => {
    await expect(
      runWorkflow({ ...ARGS, ...change }, { agent })
    ).rejects.toThrow(message)
    expect(agent).not.toHaveBeenCalled()
  })
})

describe('prepare-handoff workflow: the run', () => {
  it('Should dry run, triage, apply, verify, show, write and switch back in order', async () => {
    const agent = answers()
    const result = await runWorkflow(ARGS, { agent })
    expect(labels(agent)).toEqual([
      'dry run',
      'triage',
      'apply',
      'verify 1',
      'show',
      'write',
      'switch back'
    ])
    expect(result.status).toBe('ready')
    expect(result.handoffBranch).toBe('handoff/arrival-time-hint')
    expect(result.next).toContain('Nothing was pushed')
  })

  it('Should give each step the model its role names', async () => {
    const agent = answers()
    await runWorkflow(ARGS, { agent })
    expect(modelOf(agent, 'dry run')).toBe('haiku')
    expect(modelOf(agent, 'triage')).toBe('opus')
    expect(modelOf(agent, 'apply')).toBe('sonnet')
    expect(modelOf(agent, 'verify 1')).toBe('haiku')
    expect(modelOf(agent, 'write')).toBe('sonnet')
  })

  it('Should dry run designer:handoff on the release with the scope', async () => {
    const agent = answers()
    await runWorkflow(
      { ...ARGS, scope: ['arrival-details', 'origin'] },
      {
        agent
      }
    )
    expect(promptFor(agent, 'dry run')).toContain(
      'npm run designer:handoff -- --set plants-working --features arrival-details,origin --slug arrival-time-hint --dry-run'
    )
  })

  it('Should branch from main and apply only the upstream-ready files', async () => {
    const agent = answers()
    await runWorkflow(ARGS, { agent })
    const prompt = promptFor(agent, 'apply')
    expect(prompt).toContain('git switch -c handoff/arrival-time-hint main')
    expect(prompt).toContain(
      `git apply --3way --include=${REAL_COPY} ${FOLDER}/upstream.patch`
    )
  })

  it('Should run the real service checks the hand-off promises', async () => {
    const agent = answers()
    await runWorkflow(ARGS, { agent })
    const prompt = promptFor(agent, 'verify 1')
    expect(prompt).toContain('npm test >')
    expect(prompt).toContain('npm run lint >')
    expect(prompt).toContain('npm run test:fit:features >')
  })

  it('Should show high-risk-plants against main before committing, then write the folder', async () => {
    const agent = answers()
    await runWorkflow(ARGS, { agent })
    expect(promptFor(agent, 'show')).toContain(
      'npm run designer:show -- --set high-risk-plants --pages changed --before'
    )
    const write = promptFor(agent, 'write')
    expect(write).toContain(
      `npm run designer:handoff -- --set high-risk-plants --base main --slug arrival-time-hint --title "Clearer arrival time hint" --why "Traders were unsure about the 'time' format." --gaps-from plants-working`
    )
    expect(write).toContain('design-gaps.md: dashboard chips')
  })

  it('Should leave design gaps out when asked', async () => {
    const agent = answers()
    await runWorkflow({ ...ARGS, includeDesignGaps: false }, { agent })
    expect(promptFor(agent, 'write')).not.toContain('--gaps-from')
  })

  it('Should never push, force or reset in any prompt', async () => {
    const agent = answers()
    await runWorkflow(ARGS, { agent })
    for (const [prompt] of agent.mock.calls) {
      expect(prompt).not.toMatch(/`git push|--force`|`git reset/)
      expect(prompt).toContain('Never push')
    }
  })

  it('Should repair a failing check at most 3 times, then park the work', async () => {
    const agent = answers({ verdicts: [false] })
    const result = await runWorkflow(ARGS, { agent })
    expect(labels(agent).slice(3)).toEqual([
      'verify 1',
      'repair 1',
      'verify 2',
      'repair 2',
      'verify 3',
      'repair 3',
      'verify 4',
      'park'
    ])
    expect(result.status).toBe('stopped')
    expect(result.reason).toContain('after 3 repair(s)')
    expect(promptFor(agent, 'park')).toContain(
      'git switch design/plants-working-arrival-hint'
    )
  })

  it('Should carry on once a repair makes the checks pass', async () => {
    const agent = answers({ verdicts: [false, true] })
    const result = await runWorkflow(ARGS, { agent })
    expect(labels(agent)).toContain('show')
    expect(result.repairs).toBe(1)
  })

  it.each([
    [{ clean: false }, 'There are unsaved changes'],
    [{ handoffBranchExists: true }, 'already exists'],
    [{ startBranch: 'handoff/other' }, 'on a handoff branch already'],
    [{ problem: 'npm ERR! missing script' }, 'npm ERR! missing script']
  ])('Should stop after the dry run when %j', async (change, reason) => {
    const agent = answers({ dryRun: { ...DRY_RUN, ...change } })
    const result = await runWorkflow(ARGS, { agent })
    expect(result.status).toBe('stopped')
    expect(result.reason).toContain(reason)
    expect(labels(agent)).toEqual(['dry run'])
  })

  it('Should stop when nothing differs from the real journey', async () => {
    const agent = answers({
      dryRun: { ...DRY_RUN, report: { files: [], leftOut: [] } }
    })
    const result = await runWorkflow(ARGS, { agent })
    expect(result.reason).toContain('nothing to hand over')
  })

  it('Should send the designer to route 1 when nothing is upstream-ready', async () => {
    const agent = answers({ triage: { ...TRIAGE, upstreamReady: [] } })
    const result = await runWorkflow(ARGS, { agent })
    expect(result.reason).toContain('Use route 1')
    expect(labels(agent)).toEqual(['dry run', 'triage'])
  })
})
