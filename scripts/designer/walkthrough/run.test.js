import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { parseWalkthroughArgs } from './options.js'
import {
  CI_PORT,
  NO_BROWSER,
  WalkthroughProblem,
  chooseSets,
  keepAwakeCommand,
  localWorkers,
  paceEstimateMinutes,
  playwrightArgs,
  playwrightEnv,
  runWalkthrough,
  walkingLine,
  whereLines
} from './run.js'

const ROOT = '/prototype'
const WALK = [{ slug: 'origin', fields: { countryOfOrigin: 'ES' } }]

const setWithExamples = (id) => ({
  id,
  release: { kind: id === 'high-risk-plants' ? 'real-journey' : 'release' },
  hasHappyPath: true,
  scenarios: [],
  examples: [
    {
      label: 'Submitted',
      slug: 'submitted',
      steps: WALK,
      submit: true,
      fixture: 'happy-path/seedPotatoes'
    }
  ]
})

const SETS = [
  setWithExamples('high-risk-plants'),
  setWithExamples('plants-working'),
  { id: 'sample-journey', hasHappyPath: false, scenarios: [], examples: [] }
]

const optionsFrom = (argv) => parseWalkthroughArgs(argv).options

const walkedReport = (setIds) => ({
  suites: [
    {
      title: 'walkthroughs.walkthrough.spec.js',
      suites: setIds.map((setId) => ({
        title: `${setId} title`,
        specs: [
          {
            title: 'Submitted',
            tags: ['walkthrough', setId],
            tests: [
              {
                status: 'expected',
                results: [{ status: 'passed', errors: [] }]
              }
            ]
          }
        ]
      }))
    }
  ],
  errors: []
})

/** Fake side effects that record what the run asked for. */
const fakeDeps = ({
  report = walkedReport(['high-risk-plants']),
  ...overrides
} = {}) => {
  const calls = {
    playwright: [],
    removed: [],
    summaries: [],
    served: [],
    built: 0,
    awake: []
  }
  const deps = {
    keepAwake: () => {
      calls.awake.push('held')
      return () => calls.awake.push('released')
    },
    readSets: () => SETS,
    workingRelease: () => null,
    chromiumInstalled: () => true,
    findFreePort: async () => 3203,
    needsClientBuild: () => false,
    buildClientAssets: async () => {
      calls.built += 1
    },
    runPlaywright: async (args, { env }) => {
      calls.playwright.push({ args, env })
      return 1
    },
    readReport: () => report,
    removeFile: (file) => calls.removed.push(file),
    exists: () => true,
    serveReport: async (folder) => {
      calls.served.push(folder)
      return 0
    },
    appendSummary: (file, text) => calls.summaries.push({ file, text }),
    buildDemoSite: async (input) => {
      calls.demoSite = calls.demoSite ?? []
      calls.demoSite.push(input)
    },
    localWorkers: () => 1,
    ...overrides
  }
  return { deps, calls }
}

const run = (argv, fake, env = {}) => {
  const said = []
  return runWalkthrough(optionsFrom(argv), {
    root: ROOT,
    say: (line) => said.push(line),
    env,
    deps: fake.deps
  }).then((code) => ({ code, said: said.join('\n') }))
}

describe('chooseSets', () => {
  it('Should walk the working release when none is named', () => {
    expect(
      chooseSets(optionsFrom([]), {
        sets: SETS,
        workingRelease: 'plants-working'
      })
    ).toEqual(['plants-working'])
  })

  it('Should walk the real journey when there is no working release', () => {
    expect(
      chooseSets(optionsFrom([]), { sets: SETS, workingRelease: null })
    ).toEqual(['high-risk-plants'])
  })

  it('Should walk every set with --all, and on CI unless sets are named', () => {
    const context = { sets: SETS, workingRelease: 'plants-working' }

    expect(chooseSets(optionsFrom(['--all']), context)).toBeNull()
    expect(chooseSets(optionsFrom(['--ci']), context)).toBeNull()
    expect(
      chooseSets(optionsFrom(['--ci', '--set', 'plants-working']), context)
    ).toEqual(['plants-working'])
  })

  it('Should refuse a set it cannot walk, naming the ones it can', () => {
    expect(() =>
      chooseSets(optionsFrom(['--set', 'sample-journey']), {
        sets: SETS,
        workingRelease: null
      })
    ).toThrow(
      new WalkthroughProblem(
        'There is no set called "sample-journey" with examples to walk. The sets it can walk are: high-risk-plants, plants-working.'
      )
    )
  })
})

describe('playwrightArgs and playwrightEnv', () => {
  it('Should switch the walkthroughs on, at the human pace, and keep a designer’s run under .cache', () => {
    const options = optionsFrom(['--set', 'plants-working'])

    expect(playwrightArgs(options)).toEqual([
      'test',
      '--project=walkthroughs',
      '--reporter=list,html,json',
      `--output=${path.join('.cache', 'designer', 'walkthrough', 'test-results')}`
    ])
    expect(
      playwrightEnv(options, {
        root: ROOT,
        port: 3203,
        setIds: ['plants-working']
      })
    ).toEqual({
      PROTOTYPE_WALKTHROUGHS: 'true',
      WALKTHROUGH_PACE: 'human',
      PORT: '3203',
      WALKTHROUGH_SETS: 'plants-working',
      PLAYWRIGHT_JSON_OUTPUT_FILE: path.join(
        ROOT,
        '.cache/designer/walkthrough/report.json'
      ),
      PLAYWRIGHT_HTML_OUTPUT_DIR: path.join(
        ROOT,
        '.cache/designer/walkthrough/site/tests'
      ),
      PLAYWRIGHT_HTML_OPEN: 'never',
      PLAYWRIGHT_HTML_TITLE: 'Walkthrough: plants-working'
    })
  })

  it('Should set the fast pace with --fast', () => {
    expect(
      playwrightEnv(optionsFrom(['--fast']), {
        root: ROOT,
        port: 3203,
        setIds: null
      })
    ).toMatchObject({ WALKTHROUGH_PACE: 'fast' })
  })

  it('Should write a blob report to merge and a JSON report on CI, with 4 workers and the wider timeout', () => {
    const options = optionsFrom(['--ci'])

    expect(playwrightArgs(options)).toEqual([
      'test',
      '--project=walkthroughs',
      '--reporter=list,blob,json',
      '--output=test-results',
      '--global-timeout=2400000',
      '--workers=4'
    ])
    expect(
      playwrightEnv(options, { root: ROOT, port: CI_PORT, setIds: null })
    ).toEqual({
      PROTOTYPE_WALKTHROUGHS: 'true',
      WALKTHROUGH_PACE: 'human',
      PORT: '3054',
      PLAYWRIGHT_JSON_OUTPUT_FILE: path.join(
        ROOT,
        'walkthrough-results/report.json'
      ),
      PLAYWRIGHT_BLOB_OUTPUT_DIR: path.join(ROOT, 'blob-report')
    })
  })
})

describe('paceEstimateMinutes', () => {
  it('Should reckon about two minutes per story, shared across the workers', () => {
    expect(paceEstimateMinutes(10, 1)).toBe(20)
    expect(paceEstimateMinutes(10, 4)).toBe(5)
  })

  it('Should never say less than the longest story takes on its own', () => {
    expect(paceEstimateMinutes(10, 8)).toBe(3)
    expect(paceEstimateMinutes(1, 4)).toBe(3)
  })
})

describe('localWorkers', () => {
  it('Should match Playwright’s default of half the processors, and at least one', () => {
    expect(localWorkers(16)).toBe(8)
    expect(localWorkers(1)).toBe(1)
  })
})

describe('walkingLine', () => {
  it('Should give a pace-based estimate at the human pace, shared across the local workers', () => {
    expect(
      walkingLine(['high-risk-plants'], 3203, {
        storyCount: 10,
        ci: false,
        workers: 4
      })
    ).toBe(
      "Walking high-risk-plants through, on port 3203. At a person's pace this takes about 5 minutes. Your own prototype on 3103 is not touched."
    )
  })

  it('Should use the 4 CI workers on CI, whatever the machine has', () => {
    expect(
      walkingLine(['high-risk-plants'], 3203, {
        storyCount: 10,
        ci: true,
        workers: 1
      })
    ).toContain('about 5 minutes')
  })

  it('Should say it is the quick check with --fast', () => {
    expect(
      walkingLine(['high-risk-plants'], 3203, { fast: true, storyCount: 10 })
    ).toContain('This is the quick check, so it should take a few minutes.')
  })
})

describe('whereLines', () => {
  it('Should point at the demo page and the technical report', () => {
    expect(whereLines()).toEqual([
      '',
      `Demo page: ${path.join('.cache', 'designer', 'walkthrough', 'site', 'index.html')}`,
      `Technical report (every step, trace): ${path.join('.cache', 'designer', 'walkthrough', 'site', 'tests', 'index.html')}`,
      'To watch it: npm run designer:walkthrough -- --show'
    ])
  })
})

describe('keepAwakeCommand', () => {
  it('Should hold a Mac awake until this process ends', () => {
    expect(keepAwakeCommand('darwin', 4321)).toEqual({
      command: 'caffeinate',
      args: ['-i', '-w', '4321']
    })
  })

  it('Should do nothing on other computers', () => {
    expect(keepAwakeCommand('linux', 4321)).toBeNull()
  })
})

describe('runWalkthrough', () => {
  it('Should walk, summarise and point at the report, whatever Playwright’s own exit code', async () => {
    const fake = fakeDeps()

    const { code, said } = await run(['--no-open'], fake)

    expect(code).toBe(0)
    expect(fake.calls.playwright).toHaveLength(1)
    expect(fake.calls.removed).toEqual([
      path.join(ROOT, '.cache/designer/walkthrough/report.json')
    ])
    expect(said).toContain(
      'high-risk-plants title: 1 of 1 stories walked to the end.'
    )
    expect(said).toContain(
      'To watch it: npm run designer:walkthrough -- --show'
    )
    expect(fake.calls.served).toEqual([])
    expect(fake.calls.demoSite).toEqual([
      {
        root: ROOT,
        reportFile: path.join(ROOT, '.cache/designer/walkthrough/report.json'),
        resultsDir: path.join(ROOT, '.cache/designer/walkthrough/test-results'),
        siteDir: path.join(ROOT, '.cache/designer/walkthrough/site')
      }
    ])
  })

  it('Should build the demo site on CI too, through a separate reports:demo step, not by calling buildDemoSite itself', async () => {
    const fake = fakeDeps()

    await run(['--ci'], fake)

    expect(fake.calls.demoSite ?? []).toEqual([])
  })

  it('Should not build the demo site with --show, which only opens what is already there', async () => {
    const fake = fakeDeps()

    await run(['--show'], fake)

    expect(fake.calls.demoSite ?? []).toEqual([])
  })

  it('Should keep the computer awake while Playwright runs, and let it sleep after', async () => {
    const order = []
    const fake = fakeDeps({
      keepAwake: () => {
        order.push('held')
        return () => order.push('released')
      },
      runPlaywright: async () => {
        order.push('walked')
        return 0
      }
    })

    await run(['--no-open'], fake)

    expect(order).toEqual(['held', 'walked', 'released'])
  })

  it('Should let the computer sleep again even when Playwright cannot start', async () => {
    const fake = fakeDeps({
      runPlaywright: async () => {
        throw new Error('spawn failed')
      }
    })

    await expect(run(['--no-open'], fake)).rejects.toThrow('spawn failed')
    expect(fake.calls.awake).toEqual(['held', 'released'])
  })

  it('Should open the report when done unless told not to', async () => {
    const fake = fakeDeps()

    const { said } = await run([], fake)

    expect(fake.calls.served).toEqual([
      path.join(ROOT, '.cache/designer/walkthrough/site')
    ])
    expect(said).toContain(
      'Your walkthrough is open at http://localhost:9323. Press Ctrl+C here when you have finished looking.'
    )
  })

  it('Should build the styles first when they are out of date', async () => {
    const fake = fakeDeps({ needsClientBuild: () => true })

    await run(['--no-open'], fake)

    expect(fake.calls.built).toBe(1)
  })

  it('Should fail on CI only when the run crashed, and write the job summary', async () => {
    const fake = fakeDeps({ report: null })

    const { code } = await run(['--ci'], fake, {
      GITHUB_STEP_SUMMARY: '/summary.md'
    })

    expect(code).toBe(1)
    expect(fake.calls.playwright[0].env.PORT).toBe('3054')
    expect(fake.calls.summaries).toEqual([
      {
        file: '/summary.md',
        text: expect.stringContaining('The walkthroughs did not run')
      }
    ])
  })

  it('Should pass on CI when every set was walked', async () => {
    const fake = fakeDeps({
      report: walkedReport(['high-risk-plants', 'plants-working'])
    })

    const { code } = await run(['--ci'], fake)

    expect(code).toBe(0)
    expect(fake.calls.playwright[0].env.WALKTHROUGH_SETS).toBeUndefined()
  })

  it('Should say how to install the browser when it is missing', async () => {
    const fake = fakeDeps({ chromiumInstalled: () => false })

    await expect(run([], fake)).rejects.toThrow(NO_BROWSER)
  })

  it('Should open the last report with --show, without walking', async () => {
    const fake = fakeDeps()

    await run(['--show'], fake)

    expect(fake.calls.playwright).toEqual([])
    expect(fake.calls.served).toHaveLength(1)
  })

  it('Should say there is no report yet when --show has nothing to open', async () => {
    const fake = fakeDeps({ exists: () => false })

    await expect(run(['--show'], fake)).rejects.toThrow(
      'There is no walkthrough report yet'
    )
  })
})
