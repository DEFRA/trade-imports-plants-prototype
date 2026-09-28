/**
 * End to end: a real copy of high-risk-plants in a throwaway repository, a
 * design release made from it with the real `new:set` copier, one hint and
 * one template changed, then the hand-off. The patch must apply to the real
 * journey with `git apply --check` in a separate scratch copy.
 */
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { REPO_ROOT } from '../lib/repo.js'

import { transformContent, transformPath } from '../../new-set/transform.js'
import { briefOutline, renderBriefMarkdown } from './brief.js'
import { buildHandoff } from './build.js'
import { runHandoff } from './cli.js'
import { checkPatchApplies, git, resolveCommit, showFile } from './git.js'
import {
  commitAll,
  copyRealJourney,
  editFile,
  makeRepo,
  OVERRIDES_WITH_TRANSPORTERS,
  readFile,
  removeRepo,
  TRANSPORTERS_SERVICE,
  writeFiles
} from './fixture-repo.js'

const SETS = 'src/server/app/sets'
const REAL = `${SETS}/high-risk-plants`
const RELEASE = `${SETS}/plants-working`
const FEATURE = 'journeys/linear/features/arrival-details'
const OLD_HINT = 'Use the 24-hour clock. For example, 14:30.'
const NEW_HINT = 'Use the 24-hour clock, for example 14:30.'
const OLD_WELSH = 'Defnyddiwch y cloc 24 awr. Er enghraifft, 14:30.'
const TIMEOUT_MS = 120_000

const RENAME = { fromId: 'high-risk-plants', newId: 'plants-working' }

/** A scratch repository has no examples or engine to load: stand in for them. */
const TEST_SOURCES = {
  examples: () => [{ slug: 'complete', label: 'Complete' }],
  journeyFlow: async () => ({ rows: [], before: null, error: null })
}

/** The real plants-frontend beside the prototype, as the workspace lays it
 * out. Present on a workspace checkout, absent in CI. */
const PLANTS_FRONTEND = path.resolve(
  REPO_ROOT,
  '../trade-imports-plants-frontend'
)
const hasPlantsFrontend =
  existsSync(path.join(PLANTS_FRONTEND, '.git')) &&
  resolveCommit(PLANTS_FRONTEND, 'main') !== null

/** `tim`'s own CLI, beside the prototype as the workspace lays it out.
 * Present on a workspace checkout, absent in the prototype's own CI. */
const TIM_CLI = path.resolve(REPO_ROOT, '../../tim/src/cli.js')
const hasTim = existsSync(TIM_CLI)

/** The prototype's hand-off settings, fixed for these scratch repos, which
 * have no `scripts/designer/prototype.json` of their own. */
const TEST_PROTOTYPE_CONFIG = {
  handOff: { jiraProject: 'EUDPA', parentEpic: null, labels: ['UCD'] }
}

/** Copies the real journey the way `new:set` does: every path and file
 * rewritten by the real transform, each UUID given a fresh value. Tests and
 * docs are dropped, as `new:set` drops them for a design release. */
const scaffoldRelease = (root) => {
  for (const relative of listFiles(path.join(root, REAL))) {
    if (!/\.test\.js$|\.fit\.spec\.js$|^docs\/|^spec\//.test(relative)) {
      writeFiles(root, {
        [`${RELEASE}/${transformPath(relative, RENAME)}`]: transformContent(
          readFile(root, `${REAL}/${relative}`),
          RENAME
        )
      })
    }
  }
  return commitAll(root, 'Start design release plants-working')
}

const listFiles = (dir, prefix = '') =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    return entry.isDirectory()
      ? listFiles(path.join(dir, entry.name), relative)
      : [relative]
  })

const changeHintAndTemplate = (root) => {
  editFile(root, `${RELEASE}/${FEATURE}/copy/copy.en.js`, OLD_HINT, NEW_HINT)
  editFile(
    root,
    `${RELEASE}/${FEATURE}/copy/copy.cy.js`,
    OLD_WELSH,
    `[Welsh needed] ${NEW_HINT}`
  )
  editFile(
    root,
    `${RELEASE}/${FEATURE}/template.njk`,
    '<h1 class="govuk-heading-l">',
    '<h1 class="govuk-heading-xl">'
  )
}

/** Whether `npm run format` would leave the files as they are, so a save
 * after the hand-off has nothing to tidy. */
const prettierLeavesAlone = (root, dir, files) =>
  spawnSync(
    process.execPath,
    [
      path.join(REPO_ROOT, 'node_modules/prettier/bin/prettier.cjs'),
      '--check',
      ...files.map((file) => path.join(dir, file))
    ],
    { cwd: root, encoding: 'utf8' }
  ).status === 0

/** `git apply --check` in a fresh copy of the real journey, as a developer would. */
const applyCheckInScratchCopy = (root, patch) => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'handoff-apply-'))
  try {
    cpSync(path.join(root, REAL), path.join(scratch, REAL), { recursive: true })
    git(['init', '-q'], { cwd: scratch })
    const patchFile = path.join(scratch, 'upstream.patch')
    writeFileSync(patchFile, patch)
    git(['apply', '--check', patchFile], { cwd: scratch })
    return true
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

describe('designer:handoff end to end', () => {
  let root

  beforeEach(() => {
    root = makeRepo()
    copyRealJourney(root)
    commitAll(root, 'The real journey')
  })

  afterEach(() => {
    removeRepo(root)
  })

  it(
    'Should hand over one hint and one template as a patch that applies to the real journey',
    () => {
      scaffoldRelease(root)
      changeHintAndTemplate(root)

      const report = buildHandoff({ root, set: 'plants-working' })

      expect(report.files.map((file) => file.path).sort()).toEqual([
        `${REAL}/${FEATURE}/copy/copy.cy.js`,
        `${REAL}/${FEATURE}/copy/copy.en.js`,
        `${REAL}/${FEATURE}/template.njk`
      ])
      expect(report.patch).not.toContain('plants-working')
      expect(report.patch).toContain(`+    hint: '${NEW_HINT}'`)
      expect(report.applyCheck.ok).toBe(true)
      expect(applyCheckInScratchCopy(root, report.patch)).toBe(true)
    },
    TIMEOUT_MS
  )

  it(
    'Should write a story and a brief that lists the Welsh marker and the pinned test, plus the Jira version',
    async () => {
      scaffoldRelease(root)
      changeHintAndTemplate(root)
      const gallery = '.cache/designer/show/plants-working/latest'
      writeFiles(root, {
        [`${gallery}/arrival-details--before--page--desktop.png`]: 'png',
        [`${gallery}/arrival-details--now--page--desktop.png`]: 'png',
        [`${gallery}/origin--now--page--desktop.png`]: 'png',
        '.cache/designer/handoff/arrival.criteria.txt': `Given I am on the Arrival details page\nWhen I look at the time question\nThen the hint says "${NEW_HINT}"\n`
      })

      const { dir, story } = await runHandoff(
        root,
        {
          set: 'plants-working',
          slug: 'arrival-time-hint',
          date: '2026-09-27',
          folderName: '2026-09-27-arrival-time-hint',
          title: 'Clearer arrival time hint',
          why: 'Traders were unsure about the time format.',
          as: 'a trader notifying potatoes',
          want: 'to know how to write the arrival time',
          soThat: 'I get it right the first time',
          criteria: '.cache/designer/handoff/arrival.criteria.txt',
          features: [],
          recipes: [],
          links: []
        },
        TEST_SOURCES
      )

      expect(dir).toBe(path.join(root, 'handoffs/2026-09-27-arrival-time-hint'))
      expect(story.placeholders).toEqual([])
      expect(story.criteriaSource).toBe('the designer')
      const jira = readFile(dir, 'brief.jira.txt')
      expect(jira).toMatch(
        /^\*Summary:\* Clearer arrival time hint\n\n\*As\* a trader notifying potatoes,\n/
      )
      expect(jira).toContain(
        `+*Acceptance Criteria*+\n*Given* I am on the Arrival details page\n*When* I look at the time question\n*Then* the hint says "${NEW_HINT}"`
      )
      expect(jira).toContain('{panel:title=Tech Notes|bgColor=#deebff}')
      expect(jira).toContain(
        '||Page||Field||Rule||English error||Welsh error||\n|arrival-details|{{arrivalDate}}|Must be answered|Enter the arrival date|'
      )
      const brief = readFile(dir, 'brief.md')
      expect(brief).toContain(`[Welsh needed] followed by the English`)
      expect(brief).toContain(
        `line 24 (once the patch is applied): "${NEW_HINT}"`
      )
      expect(brief).toContain(`| \`time.hint\` | ${OLD_WELSH} | ${NEW_HINT} |`)
      expect(brief).toContain(
        `\`${REAL}/${FEATURE}/copy/copy.test.js\` line 89: "${OLD_HINT}"`
      )
      expect(brief).toContain(`| \`time.hint\` | ${OLD_HINT} | ${NEW_HINT} |`)
      expect(brief).toContain(
        '![arrival-details: before](screenshots/arrival-details--before--page--desktop.png)'
      )
      expect(
        existsSync(
          path.join(dir, 'screenshots/arrival-details--now--page--desktop.png')
        )
      ).toBe(true)
      expect(
        existsSync(path.join(dir, 'screenshots/origin--now--page--desktop.png'))
      ).toBe(false)
      expect(existsSync(path.join(dir, 'brief.jira.txt'))).toBe(true)
      expect(readFile(dir, 'upstream.patch')).toContain(
        `+    hint: '${NEW_HINT}'`
      )
      expect(JSON.parse(readFile(dir, 'report.json')).set).toBe(
        'plants-working'
      )
      expect(prettierLeavesAlone(root, dir, ['brief.md', 'report.json'])).toBe(
        true
      )
    },
    TIMEOUT_MS
  )

  it(
    'Should write ticket.json and ticket.description.jira.txt, and report.json’s story.ready',
    async () => {
      scaffoldRelease(root)
      changeHintAndTemplate(root)
      const gallery = '.cache/designer/show/plants-working/latest'
      writeFiles(root, {
        [`${gallery}/arrival-details--before--page--desktop.png`]: 'png',
        [`${gallery}/arrival-details--now--page--desktop.png`]: 'png',
        '.cache/designer/handoff/arrival.criteria.txt':
          'Given I am on the Arrival details page\nWhen I look at the time question\nThen the hint is clearer\n'
      })

      const { dir, ticketManifest } = await runHandoff(
        root,
        {
          set: 'plants-working',
          slug: 'arrival-time-hint',
          date: '2026-09-27',
          folderName: '2026-09-27-arrival-time-hint',
          title: 'Clearer arrival time hint',
          why: 'Traders were unsure about the time format.',
          as: 'a trader notifying potatoes',
          want: 'to know how to write the arrival time',
          soThat: 'I get it right the first time',
          criteria: '.cache/designer/handoff/arrival.criteria.txt',
          features: [],
          recipes: [],
          links: []
        },
        {
          ...TEST_SOURCES,
          prototype: () => TEST_PROTOTYPE_CONFIG
        }
      )

      expect(ticketManifest).toEqual({
        schema: 'tim-ticket/1',
        project: 'EUDPA',
        type: 'Story',
        summary: 'Clearer arrival time hint',
        descriptionFile: 'ticket.description.jira.txt',
        labels: ['UCD'],
        attachments: [
          'screenshots/arrival-details--before--page--desktop.png',
          'screenshots/arrival-details--now--page--desktop.png',
          'upstream.patch',
          'brief.md'
        ],
        relates: []
      })
      const ticketJson = JSON.parse(readFile(dir, 'ticket.json'))
      expect(ticketJson).toEqual(ticketManifest)

      const description = readFile(dir, 'ticket.description.jira.txt')
      expect(description).not.toMatch(/^\*Summary:\*/)
      expect(description).not.toContain('(attach')
      expect(description).toContain('*As* a trader notifying potatoes')

      const reportStory = JSON.parse(readFile(dir, 'report.json')).story
      expect(reportStory.ready).toBe(true)
      expect(reportStory.placeholders).toEqual([])
    },
    TIMEOUT_MS
  )

  it.runIf(hasTim)(
    'Should let tim jira create --from ticket.json --json plan the ticket as a dry run, with zero requests',
    async () => {
      scaffoldRelease(root)
      changeHintAndTemplate(root)
      const gallery = '.cache/designer/show/plants-working/latest'
      writeFiles(root, {
        [`${gallery}/arrival-details--before--page--desktop.png`]: 'png'
      })

      const { dir } = await runHandoff(
        root,
        {
          set: 'plants-working',
          slug: 'arrival-time-hint',
          date: '2026-09-27',
          folderName: '2026-09-27-arrival-time-hint',
          title: 'Clearer arrival time hint',
          features: [],
          recipes: [],
          links: []
        },
        {
          ...TEST_SOURCES,
          prototype: () => TEST_PROTOTYPE_CONFIG
        }
      )

      const stdout = execFileSync(
        process.execPath,
        [
          TIM_CLI,
          'jira',
          'create',
          '--from',
          path.join(dir, 'ticket.json'),
          '--json'
        ],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            JIRA_USER: '',
            JIRA_TOKEN: '',
            JIRA_BASE_URL: ''
          }
        }
      )
      const payload = JSON.parse(stdout.trim())

      expect(payload).toMatchObject({ ok: true, result: { mode: 'dry-run' } })
      expect(payload.result.planId).toMatch(/^[0-9a-f]{64}$/)
      expect(payload.result.fields.project).toEqual({ key: 'EUDPA' })
      expect(payload.result.attachments.map((a) => a.filename)).toEqual([
        'arrival-details--before--page--desktop.png',
        'upstream.patch',
        'brief.md'
      ])
    },
    TIMEOUT_MS
  )

  it(
    'Should report the real journey moving on elsewhere without breaking the patch',
    () => {
      scaffoldRelease(root)
      editFile(
        root,
        `${REAL}/journeys/linear/features/origin/template.njk`,
        '{% block journeyContent %}',
        '{% block journeyContent %}\n  {# moved on #}'
      )
      commitAll(root, 'The real journey moves on')
      changeHintAndTemplate(root)

      const report = buildHandoff({ root, set: 'plants-working' })

      expect(report.drift.elsewhere).toEqual([
        `${REAL}/journeys/linear/features/origin/template.njk`
      ])
      expect(report.drift.overlapping).toEqual([])
      expect(report.applyCheck.ok).toBe(true)
    },
    TIMEOUT_MS
  )

  it(
    'Should say the patch does not apply when the real journey changed the same line',
    () => {
      scaffoldRelease(root)
      editFile(
        root,
        `${REAL}/${FEATURE}/copy/copy.en.js`,
        OLD_HINT,
        'Use the 24-hour clock. For example, 09:30.'
      )
      commitAll(root, 'The real journey rewords the same hint')
      changeHintAndTemplate(root)

      const report = buildHandoff({ root, set: 'plants-working' })

      expect(report.drift.overlapping).toContain(
        `${REAL}/${FEATURE}/copy/copy.en.js`
      )
      expect(report.applyCheck.ok).toBe(false)
    },
    TIMEOUT_MS
  )

  const TRANSPORTER_PAGES = {
    [`${RELEASE}/journeys/linear/features/transporter/page.js`]:
      "export const transporterPage = { id: 'transporter', slug: 'transporter' }\n",
    [`${RELEASE}/journeys/linear/features/transporter/controller.js`]:
      "import * as transporters from '../../../../../../services/transporters/index.js'\nimport { transporterPage as page } from './page.js'\n\nexport const meta = { ...page }\n\nexport const list = (orgId) => transporters.listTransporters(orgId)\n",
    [`${RELEASE}/journeys/linear/features/transporter-add/controller.js`]:
      "import { list } from '../transporter/controller.js'\n\nexport const add = list\n"
  }

  const releaseUsingTransporters = () => {
    writeFiles(root, {
      'overrides.json': OVERRIDES_WITH_TRANSPORTERS,
      ...TRANSPORTERS_SERVICE
    })
    commitAll(root, 'The prototype-owned transporters service')
    scaffoldRelease(root)
    writeFiles(root, TRANSPORTER_PAGES)
    return buildHandoff({ root, set: 'plants-working' })
  }

  it(
    'Should hand over a page that uses a prototype-owned service with the service’s index.js and client.js, and keep the pages that depend on it',
    () => {
      const report = releaseUsingTransporters()
      const FEATURES = `${REAL}/journeys/linear/features`

      expect(report.files.map((file) => file.path).sort()).toEqual([
        'src/server/app/services/transporters/client.js',
        'src/server/app/services/transporters/index.js',
        `${FEATURES}/transporter-add/controller.js`,
        `${FEATURES}/transporter/controller.js`,
        `${FEATURES}/transporter/page.js`
      ])
      expect(
        report.files.filter((file) => file.proposed).map((file) => file.path)
      ).toEqual([
        'src/server/app/services/transporters/index.js',
        'src/server/app/services/transporters/client.js'
      ])
      expect(report.leftOut).toEqual([])
      expect(report.patch).toContain(
        "+import { isStubMode } from '../../../common/services/mode.js'"
      )
      expect(report.patch).not.toContain('isStubDataMode')
      expect(report.patch).not.toContain('transporters/stub.js b/')
      expect(report.patch).not.toContain('plants-working')
      expect(report.servicesToBuild).toEqual([
        expect.objectContaining({
          name: 'transporters',
          target: 'src/server/app/services/transporters',
          usedBy: [`${FEATURES}/transporter/controller.js`],
          stubPrototypeImports: ['src/server/prototype-support/fake-store.js'],
          proposedFiles: [
            'src/server/app/services/transporters/index.js',
            'src/server/app/services/transporters/client.js'
          ]
        })
      ])
      expect(report.servicesToBuild[0].contract.baseUrlEnv).toBe(
        'TRADE_IMPORTS_TRANSPORTERS_URL'
      )
      expect(report.applyCheck.ok).toBe(true)
      expect(applyCheckInScratchCopy(root, report.patch)).toBe(true)
    },
    TIMEOUT_MS
  )

  it.runIf(hasPlantsFrontend)(
    'Should give a patch with the service and its pages that applies cleanly to plants-frontend main',
    () => {
      const report = releaseUsingTransporters()
      const plantsFrontendMain = Object.fromEntries(
        report.files.map((file) => [
          file.path,
          showFile(PLANTS_FRONTEND, 'main', file.path)
        ])
      )

      expect(checkPatchApplies(report.patch, plantsFrontendMain)).toMatchObject(
        { ok: true, empty: false }
      )
    },
    TIMEOUT_MS
  )

  it(
    'Should hand over only the chosen features',
    () => {
      scaffoldRelease(root)
      changeHintAndTemplate(root)
      editFile(
        root,
        `${RELEASE}/journeys/linear/features/origin/template.njk`,
        '{% block journeyContent %}',
        '{% block journeyContent %}\n  {# origin change #}'
      )

      const report = buildHandoff({
        root,
        set: 'plants-working',
        features: ['origin']
      })

      expect(report.files.map((file) => file.path)).toEqual([
        `${REAL}/journeys/linear/features/origin/template.njk`
      ])
      expect(report.leftOut).toHaveLength(3)
    },
    TIMEOUT_MS
  )
})

describe('designer:handoff on small releases', () => {
  let root
  const ORIGINAL = '9c1f5d3a-7b24-4e18-9a6d-0f3b8c2e5a71'
  const COPY = 'aaaaaaaa-1111-4222-8333-444444444444'

  beforeEach(() => {
    root = makeRepo()
    writeFiles(root, {
      [`${REAL}/set.js`]: "export const SET_ID = 'high-risk-plants'\n",
      [`${REAL}/obligations/sections/arrival.js`]: `export const arrival = {\n  id: '${ORIGINAL}',\n  label: 'Arrival'\n}\n`
    })
    commitAll(root, 'The real journey')
  })

  afterEach(() => {
    removeRepo(root)
  })

  it(
    'Should map UUIDs back through the uuidMap in release.json',
    () => {
      writeFiles(root, {
        [`${RELEASE}/set.js`]: "export const SET_ID = 'plants-working'\n",
        [`${RELEASE}/obligations/sections/arrival.js`]: `export const arrival = {\n  id: '${COPY}',\n  label: 'Arrival and transport'\n}\n`,
        [`${RELEASE}/release.json`]: JSON.stringify({
          id: 'plants-working',
          from: 'high-risk-plants',
          uuidMap: { [ORIGINAL]: COPY }
        })
      })

      const report = buildHandoff({ root, set: 'plants-working' })

      expect(report.chain[0].uuidSource).toBe('release.json')
      expect(report.patch).toContain(`  id: '${ORIGINAL}',`)
      expect(report.patch).not.toContain(COPY)
      expect(report.patch).toContain("+  label: 'Arrival and transport'")
      expect(report.files).toEqual([
        {
          path: `${REAL}/obligations/sections/arrival.js`,
          releasePath: `${RELEASE}/obligations/sections/arrival.js`,
          status: 'changed'
        }
      ])
      expect(report.applyCheck.ok).toBe(true)
    },
    TIMEOUT_MS
  )

  it(
    'Should reverse a release made from another release, whose uuidMap is keyed by the real journey ids',
    () => {
      const SECOND_COPY = 'bbbbbbbb-5555-4666-8777-888888888888'
      const DR2 = `${SETS}/plants-dr2`
      const DR21 = `${SETS}/plants-dr2-1`
      writeFiles(root, {
        [`${DR2}/set.js`]: "export const SET_ID = 'plants-dr2'\n",
        [`${DR2}/obligations/sections/arrival.js`]: `export const arrival = {\n  id: '${COPY}',\n  label: 'Arrival'\n}\n`,
        [`${DR2}/release.json`]: JSON.stringify({
          from: 'high-risk-plants',
          uuidMap: { [ORIGINAL]: COPY }
        }),
        [`${DR21}/set.js`]: "export const SET_ID = 'plants-dr2-1'\n",
        [`${DR21}/obligations/sections/arrival.js`]: `export const arrival = {\n  id: '${SECOND_COPY}',\n  label: 'Arrival and transport'\n}\n`,
        [`${DR21}/release.json`]: JSON.stringify({
          from: 'plants-dr2',
          uuidMap: { [ORIGINAL]: SECOND_COPY }
        })
      })

      const report = buildHandoff({ root, set: 'plants-dr2-1' })

      expect(report.chain.map((hop) => hop.fromId)).toEqual([
        'plants-dr2',
        'high-risk-plants'
      ])
      expect(report.patch).toContain(`  id: '${ORIGINAL}',`)
      expect(report.patch).toContain("+  label: 'Arrival and transport'")
      expect(report.patch).not.toContain('plants-dr2')
      expect(report.applyCheck.ok).toBe(true)
    },
    TIMEOUT_MS
  )

  it(
    'Should leave a file that uses the prototype’s own example data out of the patch',
    () => {
      writeFiles(root, {
        [`${RELEASE}/set.js`]: "export const SET_ID = 'plants-working'\n",
        [`${RELEASE}/obligations/sections/arrival.js`]: `export const arrival = {\n  id: '${ORIGINAL}',\n  label: 'Arrival'\n}\n`,
        [`${RELEASE}/journeys/linear/features/transporter/controller.js`]:
          "import { withExtraParties } from '../../../../../../../prototype-data/index.js'\nexport const controller = withExtraParties\n",
        [`${RELEASE}/design-gaps.md`]:
          '| Page | Why |\n| --- | --- |\n| transporter | No saved-transporter service |\n'
      })

      const report = buildHandoff({ root, set: 'plants-working' })

      expect(report.files).toEqual([])
      expect(report.cannotShip.services).toEqual([
        {
          file: `${RELEASE}/journeys/linear/features/transporter/controller.js`,
          specifier: '../../../../../../../prototype-data/index.js',
          kind: 'prototype-data',
          name: 'index'
        }
      ])
      expect(report.servicesToBuild).toEqual([])
      expect(report.leftOut[0].path).toBe(
        `${RELEASE}/journeys/linear/features/transporter/controller.js`
      )
      expect(report.cannotShip.designGaps).toEqual([
        { page: 'transporter', why: 'No saved-transporter service' }
      ])
      expect(report.applyCheck.empty).toBe(true)
    },
    TIMEOUT_MS
  )

  it(
    'Should also leave out every file that imports a left-out file, so the patch never points at a missing module',
    () => {
      const FEATURES = `${RELEASE}/journeys/linear/features`
      writeFiles(root, {
        [`${RELEASE}/set.js`]: "export const SET_ID = 'plants-working'\n",
        [`${RELEASE}/obligations/sections/arrival.js`]: `export const arrival = {\n  id: '${ORIGINAL}',\n  label: 'Arrival'\n}\n`,
        [`${FEATURES}/transporter-picker/render.js`]:
          "import { createFakeStore } from '../../../../../../../prototype-support/fake-store.js'\nexport const render = createFakeStore\n",
        [`${FEATURES}/transporter-picker/controller.js`]:
          "import { render } from './render.js'\nexport const controller = render\n",
        [`${FEATURES}/transporter-add/controller.js`]:
          "import { controller as picker } from '../transporter-picker/controller.js'\nexport const controller = picker\n",
        [`${FEATURES}/origin/hint.js`]: "export const hint = 'A new hint'\n"
      })

      const report = buildHandoff({ root, set: 'plants-working' })

      expect(report.files.map((file) => file.releasePath)).toEqual([
        `${FEATURES}/origin/hint.js`
      ])
      const reasons = Object.fromEntries(
        report.leftOut.map((item) => [item.path, item.reason])
      )
      expect(reasons[`${FEATURES}/transporter-add/controller.js`]).toContain(
        `Imports ${REAL}/journeys/linear/features/transporter-picker/controller.js`
      )
      expect(reasons[`${FEATURES}/transporter-picker/controller.js`]).toContain(
        'would not start'
      )
    },
    TIMEOUT_MS
  )

  it(
    'Should list the real journey’s requirement files that quote the old words, and call a copy-only change words only',
    () => {
      writeFiles(root, {
        [`${REAL}/journeys/linear/features/hub/copy/copy.en.js`]:
          "export const copy = {\n  groups: { parties: '3. Consignment parties' }\n}\n",
        [`${REAL}/spec/journey-spec.json`]:
          '{\n  "hub": "3. Consignment parties"\n}\n'
      })
      commitAll(root, 'The real hub and its spec')
      writeFiles(root, {
        [`${RELEASE}/set.js`]: "export const SET_ID = 'plants-working'\n",
        [`${RELEASE}/obligations/sections/arrival.js`]: `export const arrival = {\n  id: '${ORIGINAL}',\n  label: 'Arrival'\n}\n`,
        [`${RELEASE}/journeys/linear/features/hub/copy/copy.en.js`]:
          "export const copy = {\n  groups: { parties: '3. Consignment addresses' }\n}\n"
      })

      const report = buildHandoff({ root, set: 'plants-working' })

      expect(report.specImpact).toEqual([
        {
          file: `${REAL}/spec/journey-spec.json`,
          line: 2,
          text: '3. Consignment parties'
        }
      ])
      expect(report.wordsOnly).toBe(true)
      const brief = renderBriefMarkdown(
        briefOutline(report, {
          title: 'Consignment addresses',
          why: '',
          date: '2026-09-28',
          branch: 'feat/x'
        })
      )
      expect(brief).toContain(
        '## Spec and requirement files that quote the old words'
      )
      expect(brief).toContain('Words only (change-the-words)')
    },
    TIMEOUT_MS
  )

  it(
    'Should refuse, in plain words, a release that changes nothing',
    () => {
      scaffoldRelease(root)

      expect(() => buildHandoff({ root, set: 'plants-working' })).toThrow(
        /there is nothing to hand over\. If the change you mean is not made yet/
      )
    },
    TIMEOUT_MS
  )

  it(
    'Should hand over a release made from the sample-journey placeholder as a brief only, not refuse it',
    async () => {
      const WELCOME = `${RELEASE}/journeys/linear/features/welcome`
      writeFiles(root, {
        [`${RELEASE}/set.js`]: "export const SET_ID = 'plants-working'\n",
        [`${RELEASE}/release.json`]: JSON.stringify({ from: 'sample-journey' }),
        [`${WELCOME}/page.js`]:
          "export const welcomePage = { id: 'welcome', slug: 'welcome' }\n",
        [`${WELCOME}/copy/copy.en.js`]:
          "export const copy = { title: 'Save a vehicle you use often' }\n"
      })

      const report = buildHandoff({ root, set: 'plants-working' })

      expect(report.briefOnly.reason).toContain(
        'made from the sample-journey placeholder'
      )
      expect(report.patch).toBe('')
      expect(report.files).toEqual([])
      expect(report.pages.map((page) => page.feature)).toEqual(['welcome'])

      const { dir } = await runHandoff(
        root,
        {
          set: 'plants-working',
          slug: 'saved-vehicles',
          date: '2026-09-28',
          folderName: '2026-09-28-saved-vehicles',
          title: 'Save a vehicle you use often',
          features: [],
          recipes: [],
          links: []
        },
        TEST_SOURCES
      )
      expect(existsSync(path.join(dir, 'upstream.patch'))).toBe(false)
      const jira = readFile(dir, 'brief.jira.txt')
      expect(jira).toMatch(/^\*Summary:\* Save a vehicle you use often\n/)
      expect(jira).toContain('* Patch: No patch. It was made from the')
      expect(
        JSON.parse(readFile(dir, 'report.json')).story.placeholders
      ).toEqual([
        'As (who it is for)',
        'I want (what they need to do)',
        'So that (why they need it)',
        'Description (what the change is and why)',
        'Acceptance criteria'
      ])
    },
    TIMEOUT_MS
  )

  it(
    'Should write no patch for a brief only, while still finding the pages',
    () => {
      writeFiles(root, {
        [`${RELEASE}/set.js`]: "export const SET_ID = 'plants-working'\n",
        [`${RELEASE}/obligations/sections/arrival.js`]: `export const arrival = {\n  id: '${ORIGINAL}',\n  label: 'Arrival and transport'\n}\n`
      })

      const report = buildHandoff({
        root,
        set: 'plants-working',
        briefOnly: true
      })

      expect(report.briefOnly.reason).toContain('Brief only, as asked')
      expect(report.patch).toBe('')
      expect(report.pages).toHaveLength(1)
    },
    TIMEOUT_MS
  )

  it(
    'Should hand over a change made to the real journey on a handoff branch',
    () => {
      git(['switch', '-q', '-c', 'handoff/arrival-label'], { cwd: root })
      editFile(
        root,
        `${REAL}/obligations/sections/arrival.js`,
        "label: 'Arrival'",
        "label: 'Arrival and transport'"
      )
      commitAll(root, 'Rename the arrival group')

      const report = buildHandoff({
        root,
        set: 'high-risk-plants',
        base: 'main'
      })

      expect(report.mode).toBe('real-journey')
      expect(report.files.map((file) => file.path)).toEqual([
        `${REAL}/obligations/sections/arrival.js`
      ])
      expect(report.applyCheck.ok).toBe(true)
    },
    TIMEOUT_MS
  )
})
