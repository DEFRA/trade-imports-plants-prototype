import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

const SCRIPT = readFileSync(
  new URL('./design-session.js', import.meta.url),
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

const SET = 'plants-working'
const FEATURES = `src/server/app/sets/${SET}/journeys/linear/features`

const ARGS = {
  set: SET,
  requests: [
    "Change the hint on origin to 'The country the plants were grown in'",
    'Add a draft example stopped at commodities',
    "Make the task list's 'Arrival' group 'Arrival and transport'"
  ]
}

const FILES = {
  1: [
    `${FEATURES}/origin/copy/copy.en.js`,
    `${FEATURES}/origin/copy/copy.cy.js`
  ],
  2: [`src/server/prototype-seed/scenarios/${SET}.js`],
  3: [`${FEATURES}/hub/copy/copy.en.js`, `${FEATURES}/hub/copy/copy.cy.js`]
}

const ROUTES = [
  { index: 1, skill: 'change-the-words', pages: ['origin'] },
  { index: 2, skill: 'example-data', pages: ['commodities'] },
  { index: 3, skill: 'change-the-words', pages: ['hub'] }
].map((route) => ({ ...route, refused: false, reason: '' }))

const numberIn = (label) => Number(/(\d+)$/.exec(label)?.[1])

/**
 * An agent stand-in that answers each step by its label. `overrides` maps a
 * label to an answer (or a function of the call count) to steer one step.
 */
const makeAgent = (overrides = {}, files = FILES) => {
  const changed = new Set()
  const calls = []
  const answer = (label) => {
    if (label === 'classify') {
      return {
        releaseOk: true,
        releaseReason: '',
        sessionSlug: 'Crit notes Friday',
        requests: ROUTES
      }
    }
    if (label === 'prepare') {
      return {
        ready: true,
        branch: `design/${SET}-crit-notes-friday`,
        reason: ''
      }
    }
    if (label.startsWith('build') || label.startsWith('repair')) {
      const paths = files[numberIn(label)]
      paths.forEach((filePath) => changed.add(filePath))
      return {
        built: true,
        filesChanged: paths,
        recipe: 'none',
        welshNeeded: true,
        notes: 'Done.'
      }
    }
    if (
      label.startsWith('check') ||
      label.startsWith('recheck') ||
      label === 'full check'
    ) {
      return {
        passed: true,
        summary: 'Passed',
        logPath: '.cache/designer/check/x.log',
        changed: [...changed].map((path) => ({
          path,
          owner: path.includes('/app/shared/') ? 'real-service' : 'yours'
        }))
      }
    }
    if (
      label.startsWith('keep') ||
      label.startsWith('put away') ||
      label === 'start release'
    ) {
      return { done: true, reason: '' }
    }
    if (label === 'show') {
      return {
        ran: true,
        galleryPath: `.cache/designer/show/${SET}/latest/index.html`,
        pagesShown: ['origin', 'hub'],
        summary: 'Pictured 2 pages.'
      }
    }
    if (label.startsWith('save')) {
      return {
        committed: true,
        commit: `abc${label.slice(5)}`,
        message: `${SET}: a change`,
        reason: ''
      }
    }
    throw new Error(`unexpected agent label ${label}`)
  }
  const agent = vi.fn(async (prompt, opts) => {
    calls.push({ prompt, opts })
    const override = overrides[opts.label]
    if (override !== undefined) {
      const count = calls.filter((call) => call.opts.label === opts.label)
      return typeof override === 'function' ? override(count.length) : override
    }
    return answer(opts.label)
  })
  return { agent, calls }
}

const labels = (calls) => calls.map((call) => call.opts.label)
const logText = (log) => log.mock.calls.map(([line]) => line).join('\n')

describe('design-session', () => {
  describe('refuses before any agent runs', () => {
    it.each([
      ['a missing requests key', { set: SET }, /missing required key requests/],
      [
        'the real journey',
        { ...ARGS, set: 'high-risk-plants' },
        /not a design release/
      ],
      [
        'the placeholder',
        { ...ARGS, set: 'sample-journey' },
        /not a design release/
      ],
      ['a set id with capitals', { ...ARGS, set: 'Plants' }, /set must be/],
      ['no requests', { ...ARGS, requests: [] }, /requests must be/],
      ['a blank request', { ...ARGS, requests: ['  '] }, /requests must be/]
    ])('%s', async (_, args, message) => {
      const { agent } = makeAgent()
      await expect(runWorkflow(args, { agent })).rejects.toThrow(message)
      expect(agent).not.toHaveBeenCalled()
    })
  })

  it('accepts args as a JSON string', async () => {
    const { agent } = makeAgent()
    await runWorkflow(JSON.stringify(ARGS), { agent })
    expect(agent).toHaveBeenCalled()
  })

  it('lands three requests as three commits and one gallery', async () => {
    const { agent, calls } = makeAgent()
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })

    expect(labels(calls)).toEqual([
      'classify',
      'prepare',
      'build 1',
      'check 1',
      'keep 1',
      'build 2',
      'check 2',
      'keep 2',
      'build 3',
      'check 3',
      'keep 3',
      'show',
      'full check',
      'save 1',
      'save 2',
      'save 3'
    ])
    const showCall = calls.find((call) => call.opts.label === 'show')
    expect(showCall.prompt).toContain(
      `npm run designer:show -- --set ${SET} --pages changed,dashboard --examples`
    )
    const text = logText(log)
    expect(text).toContain('1. Landed (change-the-words), saved as abc1')
    expect(text).toContain('3. Landed (change-the-words), saved as abc3')
    expect(text).toContain(
      `Gallery: .cache/designer/show/${SET}/latest/index.html`
    )
    expect(text).toContain('Saved 3 commits. Nothing was pushed')
  })

  it('shows only the changed pages when no example was added', async () => {
    const routes = [ROUTES[0], { ...ROUTES[1], skill: 'match-the-design' }]
    const { agent, calls } = makeAgent({
      classify: {
        releaseOk: true,
        releaseMissing: false,
        releaseReason: '',
        sessionSlug: 'x',
        requests: [...routes, ROUTES[2]]
      }
    })
    await runWorkflow(ARGS, { agent })
    const showCall = calls.find((call) => call.opts.label === 'show')
    expect(showCall.prompt).toContain(
      `npm run designer:show -- --set ${SET} --pages changed --before`
    )
  })

  it('saves each commit from the staged files, never with a path list', async () => {
    const { agent, calls } = makeAgent()
    await runWorkflow(ARGS, { agent })
    const save = calls.find((call) => call.opts.label === 'save 1').prompt
    expect(save).toContain('Run: git restore --staged -- .')
    expect(save).toContain(`Run: git add -A -- ${FILES[1].join(' ')}`)
    expect(save).toContain('Run: git commit -m "<first line>" -m "<body>"\n')
    expect(save).not.toMatch(/git commit [^\n]* -- /)
  })

  it('starts a release that does not exist yet, then carries on', async () => {
    const { agent, calls } = makeAgent({
      classify: {
        releaseOk: true,
        releaseMissing: true,
        releaseReason: 'plants-working does not exist yet',
        sessionSlug: 'x',
        requests: ROUTES
      }
    })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    const order = labels(calls)
    expect(order.slice(0, 4)).toEqual([
      'classify',
      'prepare',
      'start release',
      'build 1'
    ])
    const start = calls.find((call) => call.opts.label === 'start release')
    expect(start.prompt).toContain(
      `npm run new:set -- ${SET} --from high-risk-plants --purpose working`
    )
    expect(logText(log)).toContain(`Started ${SET} from the real journey`)
  })

  it('stops when the new release cannot be started', async () => {
    const { agent, calls } = makeAgent({
      classify: {
        releaseOk: true,
        releaseMissing: true,
        releaseReason: '',
        sessionSlug: 'x',
        requests: ROUTES
      },
      'start release': { done: false, reason: 'The hook failed.' }
    })
    await runWorkflow(ARGS, { agent })
    expect(labels(calls)).toEqual(['classify', 'prepare', 'start release'])
  })

  it('makes the branch name from the judge’s slug', async () => {
    const { agent, calls } = makeAgent()
    await runWorkflow(ARGS, { agent })
    const prepareCall = calls.find((call) => call.opts.label === 'prepare')
    expect(prepareCall.prompt).toContain(
      `git switch -c design/${SET}-crit-notes-friday`
    )
  })

  it('points each kind of step at its model', async () => {
    const { agent, calls } = makeAgent()
    await runWorkflow(ARGS, { agent })
    const modelOf = (label) =>
      calls.find((call) => call.opts.label === label).opts.model
    expect(modelOf('classify')).toBe('opus')
    expect(modelOf('build 1')).toBe('sonnet')
    expect(modelOf('check 1')).toBe('haiku')
    expect(modelOf('save 1')).toBe('sonnet')
  })

  it('uses the full check for journey changes and the quick one for words', async () => {
    const routes = [
      { ...ROUTES[0] },
      { ...ROUTES[1], skill: 'change-the-journey' },
      { ...ROUTES[2] }
    ]
    const { agent, calls } = makeAgent({
      classify: {
        releaseOk: true,
        releaseReason: '',
        sessionSlug: 'x',
        requests: routes
      }
    })
    await runWorkflow(ARGS, { agent })
    const promptOf = (label) =>
      calls.find((call) => call.opts.label === label).prompt
    expect(promptOf('check 1')).toContain('--quick')
    expect(promptOf('check 2')).toContain('--full')
  })

  it('stops before any change when the release is frozen', async () => {
    const { agent, calls } = makeAgent({
      classify: {
        releaseOk: false,
        releaseReason:
          'This is a frozen release. Start a working release from it instead.',
        sessionSlug: 'x',
        requests: []
      }
    })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(labels(calls)).toEqual(['classify'])
    expect(logText(log)).toContain('This is a frozen release')
  })

  it('repairs once, then parks and puts the request’s files away', async () => {
    const failing = {
      passed: false,
      summary: 'Welsh key missing',
      logPath: '.cache/designer/check/y.log',
      changed: FILES[2].map((path) => ({ path, owner: 'yours' }))
    }
    const { agent, calls } = makeAgent({
      'check 2': failing,
      'recheck 2': failing
    })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })

    const order = labels(calls)
    expect(order).toContain('repair 2')
    expect(order.filter((label) => label.startsWith('repair'))).toEqual([
      'repair 2'
    ])
    expect(order).toContain('put away 2')
    expect(order).not.toContain('keep 2')
    expect(order).not.toContain('save 2')
    expect(order).toContain('save 3')
    const putAway = calls.find((call) => call.opts.label === 'put away 2')
    expect(putAway.prompt).toContain(FILES[2][0])
    expect(logText(log)).toContain(
      '2. Parked: Add a draft example stopped at commodities. It still fails its check after one repair: Welsh key missing'
    )
  })

  it('parks a request that changed a file that is not yours', async () => {
    const shared = 'src/server/app/shared/copy.en.js'
    const { agent, calls } = makeAgent({}, { ...FILES, 1: [shared] })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(labels(calls)).toContain('put away 1')
    expect(labels(calls)).not.toContain('save 1')
    expect(logText(log)).toContain('changed files that are not yours')
  })

  it('does not build a request the judge refused', async () => {
    const routes = [
      ROUTES[0],
      {
        index: 2,
        skill: 'none',
        pages: [],
        refused: true,
        reason:
          'Starting a release is a separate step: say "start a new design release".'
      },
      ROUTES[2]
    ]
    const { agent, calls } = makeAgent({
      classify: {
        releaseOk: true,
        releaseReason: '',
        sessionSlug: 'x',
        requests: routes
      }
    })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(labels(calls)).not.toContain('build 2')
    expect(logText(log)).toContain('2. Not done: Add a draft example')
  })

  it('refuses a skill a session cannot run', async () => {
    const routes = [
      { ...ROUTES[0], skill: 'design-release' },
      ROUTES[1],
      ROUTES[2]
    ]
    const { agent, calls } = makeAgent({
      classify: {
        releaseOk: true,
        releaseReason: '',
        sessionSlug: 'x',
        requests: routes
      }
    })
    await runWorkflow(ARGS, { agent })
    expect(labels(calls)).not.toContain('build 1')
  })

  it('saves requests that changed the same file in one commit', async () => {
    const { agent, calls } = makeAgent({}, { ...FILES, 3: FILES[1] })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(labels(calls).filter((label) => label.startsWith('save'))).toEqual([
      'save 1+3',
      'save 2'
    ])
    expect(logText(log)).toContain('Saved 2 commits')
  })

  it('saves nothing when the full check fails', async () => {
    const { agent, calls } = makeAgent({
      'full check': {
        passed: false,
        summary: 'Lint failed',
        logPath: 'z.log',
        changed: []
      }
    })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(labels(calls).some((label) => label.startsWith('save'))).toBe(false)
    expect(logText(log)).toContain('Not saved: the full check failed')
  })

  it('stops when there are unsaved changes before the session', async () => {
    const { agent, calls } = makeAgent({
      prepare: {
        ready: false,
        branch: 'main',
        reason: 'You have unsaved changes.'
      }
    })
    await runWorkflow(ARGS, { agent })
    expect(labels(calls)).toEqual(['classify', 'prepare'])
  })

  it('makes no gallery when nothing lands', async () => {
    const { agent, calls } = makeAgent({
      'build 1': {
        built: false,
        filesChanged: [],
        recipe: 'none',
        welshNeeded: false,
        notes: 'Which page?'
      },
      'build 2': {
        built: false,
        filesChanged: [],
        recipe: 'none',
        welshNeeded: false,
        notes: 'Which page?'
      },
      'build 3': {
        built: false,
        filesChanged: [],
        recipe: 'none',
        welshNeeded: false,
        notes: 'Which page?'
      }
    })
    const log = vi.fn()
    await runWorkflow(ARGS, { agent, log })
    expect(labels(calls)).not.toContain('show')
    expect(logText(log)).toContain('Nothing landed')
  })
})
