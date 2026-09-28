import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for the high-risk-plants feature coverage and journey smoke.
 * Fully self-contained - STUB_MODE=true is set for the webServer below, which
 * serves stub data and skips the Defra ID OIDC exchange, so no other service
 * needs to be running.
 */
const port = Number(process.env.PORT ?? 3003)

// Prototype: the walkthrough report (fit/walkthroughs) is a project only
// when asked for, so the test:fit* scripts never run it. And for the
// published report, every project can record video, trace and screenshots.
const walkthroughsOn = process.env.PROTOTYPE_WALKTHROUGHS === 'true'
const recordEverything = process.env.PLAYWRIGHT_RECORD_EVERYTHING === 'true'
const recorded = recordEverything
  ? { video: 'on', trace: 'on', screenshot: 'on' }
  : {}
const WALKTHROUGH_SIZE = { width: 1280, height: 720 }

export default defineConfig({
  testDir: './fit',
  testMatch: '**/*.spec.js',
  // Journeys are independent (each owns its own quote id) and the JSON store is
  // synchronous, so they can run in parallel even though each is slow.
  fullyParallel: true,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'journeys',
      // Journey smoke and the sets-chooser boot check both live directly
      // under ./fit and need the same baseURL - the features project below
      // covers the per-feature specs nested under each set.
      testMatch: '**/*.fit.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${port}`,
        // Slow each action down so the recorded journey is watchable. Override with
        // DEMO_SLOWMO (e.g. DEMO_SLOWMO=0 for a fast run).
        launchOptions: {
          slowMo:
            process.env.DEMO_SLOWMO !== undefined
              ? Number(process.env.DEMO_SLOWMO)
              : 600
        },
        // Retain a video for every run, not just failures.
        video: 'on',
        trace: 'on',
        ...recorded
      }
    },
    {
      name: 'features',
      testDir:
        './src/server/app/sets/high-risk-plants/journeys/linear/features',
      testMatch: '**/*.fit.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${port}`,
        video: 'off',
        trace: 'retain-on-failure',
        ...recorded
      }
    },
    ...(walkthroughsOn
      ? [
          {
            name: 'walkthroughs',
            testDir: './fit/walkthroughs',
            testMatch: '**/*.walkthrough.spec.js',
            timeout: 300_000,
            use: {
              ...devices['Desktop Chrome'],
              baseURL: `http://localhost:${port}`,
              viewport: WALKTHROUGH_SIZE,
              video: { mode: 'on', size: WALKTHROUGH_SIZE },
              trace: 'on',
              screenshot: 'on',
              launchOptions: {
                slowMo: Number(process.env.WALKTHROUGH_SLOWMO ?? 250)
              }
            }
          }
        ]
      : [])
  ],
  webServer: [
    {
      command: 'npm run fit:start',
      url: `http://localhost:${port}/health`,
      // The service default is real; this suite runs against stub data and a
      // locally signed session, so it opts in explicitly here. Auth stays
      // enforced either way (see server/auth/stub-sign-in.js).
      env: { PORT: String(port), STUB_MODE: 'true', PROTOTYPE_SEED: 'false' },
      timeout: 180_000,
      reuseExistingServer: false
    }
  ]
})
