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
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { transformContent, transformPath } from '../../new-set/transform.js'
import { buildHandoff } from './build.js'
import { runHandoff } from './cli.js'
import { git } from './git.js'
import {
  commitAll,
  copyRealJourney,
  editFile,
  makeRepo,
  readFile,
  removeRepo,
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
    'Should write a brief that lists the Welsh marker and the pinned test, plus the Jira version',
    () => {
      scaffoldRelease(root)
      changeHintAndTemplate(root)
      const gallery = '.cache/designer/show/plants-working/latest'
      writeFiles(root, {
        [`${gallery}/arrival-details--before--page--desktop.png`]: 'png',
        [`${gallery}/arrival-details--now--page--desktop.png`]: 'png',
        [`${gallery}/origin--now--page--desktop.png`]: 'png'
      })

      const { dir } = runHandoff(root, {
        set: 'plants-working',
        slug: 'arrival-time-hint',
        date: '2026-09-27',
        folderName: '2026-09-27-arrival-time-hint',
        title: 'Clearer arrival time hint',
        why: 'Traders were unsure about the time format.',
        features: [],
        recipes: []
      })

      expect(dir).toBe(path.join(root, 'handoffs/2026-09-27-arrival-time-hint'))
      const brief = readFile(dir, 'brief.md')
      expect(brief).toContain(`[Welsh needed] followed by the English`)
      expect(brief).toContain(`line 24: "${NEW_HINT}"`)
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
    'Should leave a file that uses a prototype-only service out of the patch and name its data',
    () => {
      writeFiles(root, {
        'src/server/prototype-services/transporters/data.json': JSON.stringify([
          { id: 't1', name: 'Haulage Ltd', country: 'NL' }
        ]),
        [`${RELEASE}/set.js`]: "export const SET_ID = 'plants-working'\n",
        [`${RELEASE}/obligations/sections/arrival.js`]: `export const arrival = {\n  id: '${ORIGINAL}',\n  label: 'Arrival'\n}\n`,
        [`${RELEASE}/journeys/linear/features/transporter/controller.js`]:
          "import { search } from '../../../../../../prototype-services/transporters/index.js'\nexport const controller = search\n",
        [`${RELEASE}/design-gaps.md`]:
          '| Page | Why |\n| --- | --- |\n| transporter | No saved-transporter service |\n'
      })

      const report = buildHandoff({ root, set: 'plants-working' })

      expect(report.files).toEqual([])
      expect(report.cannotShip.services).toEqual([
        expect.objectContaining({
          name: 'transporters',
          kind: 'prototype-services',
          shape: {
            file: 'src/server/prototype-services/transporters/data.json',
            example: { id: 't1', name: 'Haulage Ltd', country: 'NL' }
          }
        })
      ])
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
    'Should refuse a set made from the sample-journey placeholder',
    () => {
      writeFiles(root, {
        [`${RELEASE}/set.js`]: "export const SET_ID = 'plants-working'\n",
        [`${RELEASE}/release.json`]: JSON.stringify({ from: 'sample-journey' })
      })

      expect(() => buildHandoff({ root, set: 'plants-working' })).toThrow(
        'sample-journey placeholder'
      )
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
