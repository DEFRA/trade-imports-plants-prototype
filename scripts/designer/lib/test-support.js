import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { gitEnv } from './git-env.js'

export const FIXTURE_OVERRIDES = {
  deleted: ['.mcp.json', 'scripts/lighthouse/**'],
  ours: [
    'overrides.json',
    'PROTOTYPE.md',
    'scripts/designer/**',
    'src/server/app/sets/sample-journey/**',
    'src/server/app/routes-sample-journey.js',
    'src/server/app/sets/plants-working/**',
    'src/server/app/routes-plants-working.js',
    'src/server/app/sets/plants-dr2/**',
    'src/server/app/routes-plants-dr2.js'
  ],
  patched: [
    { path: 'package.json', why: 'prototype scripts' },
    {
      path: 'src/server/app/services/ports/index.js',
      why: 'stub ports in production'
    }
  ]
}

const setJs = (id) =>
  `export const SET_ID = '${id}'\nexport const SET_BASE = \`/\${SET_ID}\`\n`

const pageJs = (exportName, id, slug) =>
  `export const ${exportName} = { id: '${id}', slug: '${slug}' }\n`

const JOURNEY_PAGES = [
  ['dashboard', 'dashboardPage', 'dashboard', ''],
  ['origin', 'originPage', 'origin', 'origin'],
  [
    'arrival-details',
    'arrivalDetailsPage',
    'arrival-details',
    'arrival-details'
  ],
  [
    'check-answers',
    'notificationViewPage',
    'notification-view',
    'notification-view'
  ],
  ['confirmation', 'confirmationPage', 'confirmation', 'confirmation']
]

const JOURNEY_FLOW = `${JOURNEY_PAGES.map(
  ([feature, exportName]) =>
    `import { ${exportName} } from '../features/${feature}/page.js'\n`
).join('')}
export const sections = [
  { id: 'start', pages: [dashboardPage] },
  { id: 'origin', pages: [originPage] },
  { id: 'arrival', pages: [arrivalDetailsPage] },
  { id: 'review', pages: [notificationViewPage, confirmationPage] }
]
`

const PLACEHOLDER_FLOW = `import { welcomePage } from '../features/welcome/page.js'

export const sections = [{ id: 'welcome', pages: [welcomePage] }]
`

const writeFile = (root, repoPath, content) => {
  const file = path.join(root, repoPath)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, content)
}

const writeJourneySet = (root, id) => {
  const base = `src/server/app/sets/${id}`
  writeFile(root, `${base}/set.js`, setJs(id))
  writeFile(root, `${base}/journeys/linear/flow/flow.js`, JOURNEY_FLOW)
  for (const [feature, exportName, pageId, slug] of JOURNEY_PAGES) {
    writeFile(
      root,
      `${base}/journeys/linear/features/${feature}/page.js`,
      pageJs(exportName, pageId, slug)
    )
  }
  writeFile(
    root,
    `src/server/app/routes-${id}.js`,
    'export const routes = []\n'
  )
}

/**
 * A throwaway repo shaped like the prototype: an overrides.json, the real
 * journey, the placeholder, a working release and a frozen release, each
 * with a small flow. `git: true` also makes it a git repo with one commit.
 * Returns `{ root, write, cleanup }`.
 */
export const makeFixtureRepo = ({ git = false } = {}) => {
  // The real path: on macOS tmpdir() is a symlink (/var -> /private/var), and
  // vitest 5 can load one module twice under the two spellings, so the page
  // objects flow.js imports are not the ones page.js exports to pagesOf.
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'designer-lib-')))
  writeFile(root, 'package.json', '{ "type": "module" }\n')
  writeFile(
    root,
    'overrides.json',
    `${JSON.stringify(FIXTURE_OVERRIDES, null, 2)}\n`
  )
  writeJourneySet(root, 'high-risk-plants')
  writeJourneySet(root, 'plants-working')
  writeJourneySet(root, 'plants-dr2')
  writeFile(
    root,
    'src/server/app/sets/plants-working/release.json',
    `${JSON.stringify({ id: 'plants-working', from: 'plants-dr2', purpose: 'working', frozen: false })}\n`
  )
  writeFile(
    root,
    'src/server/app/sets/plants-dr2/release.json',
    `${JSON.stringify({ id: 'plants-dr2', from: 'high-risk-plants', purpose: 'frozen', frozen: true })}\n`
  )
  const placeholder = 'src/server/app/sets/sample-journey'
  writeFile(root, `${placeholder}/set.js`, setJs('sample-journey'))
  writeFile(
    root,
    `${placeholder}/journeys/linear/flow/flow.js`,
    PLACEHOLDER_FLOW
  )
  writeFile(
    root,
    `${placeholder}/journeys/linear/features/welcome/page.js`,
    pageJs('welcomePage', 'welcome', 'welcome')
  )
  if (git) {
    const run = (args) =>
      execFileSync('git', args, { cwd: root, env: gitEnv(), stdio: 'ignore' })
    run(['init', '--quiet', '--initial-branch=main'])
    run(['add', '-A'])
    run([
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
      'fixture'
    ])
  }
  return {
    root,
    write: (repoPath, content) => writeFile(root, repoPath, content),
    cleanup: () => rmSync(root, { recursive: true, force: true })
  }
}
