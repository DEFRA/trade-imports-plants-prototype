import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  buildHandoff,
  plantsFrontendApplyCheck,
  REAL_JOURNEY,
  rulingConflictsFor,
  rulingNotesFor,
  setDirOf,
  workspaceSpecDir
} from './build.js'
import { briefOutline, renderBriefMarkdown } from './brief.js'
import { buildPatch, git } from './git.js'
import {
  commitAll,
  copyRealJourney,
  makeRepo,
  OVERRIDES_WITH_TRANSPORTERS,
  removeRepo,
  TRANSPORTERS_SERVICE,
  writeFiles
} from './fixture-repo.js'

const TIMEOUT_MS = 120_000

describe('workspaceSpecDir', () => {
  let workspaceRoot
  let checkout

  beforeEach(() => {
    workspaceRoot = mkdtempSync(path.join(tmpdir(), 'handoff-workspace-'))
    writeFiles(workspaceRoot, { 'repos.json': '{}' })
    checkout = path.join(workspaceRoot, 'repos/trade-imports-plants-prototype')
    mkdirSync(checkout, { recursive: true })
  })

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true })
  })

  it('Should give null for a checkout outside any workspace, with no error (a standalone clone, or CI)', () => {
    const standalone = mkdtempSync(path.join(tmpdir(), 'handoff-standalone-'))
    try {
      expect(workspaceSpecDir(standalone)).toBeNull()
    } finally {
      rmSync(standalone, { recursive: true, force: true })
    }
  })

  it('Should give null for a repos/ checkout whose parent folder holds no repos.json', () => {
    rmSync(path.join(workspaceRoot, 'repos.json'))

    expect(workspaceSpecDir(checkout)).toBeNull()
  })

  it('Should resolve openspec/specs/plants in the workspace clone this checkout sits in, wherever that clone is', () => {
    const specDir = path.join(workspaceRoot, 'openspec/specs/plants')
    mkdirSync(specDir, { recursive: true })

    expect(workspaceSpecDir(checkout)).toBe(specDir)
  })

  it('Should refuse, in plain words, a workspace with no openspec/specs/plants', () => {
    expect(() => workspaceSpecDir(checkout)).toThrow(
      /has no openspec\/specs\/plants/
    )
  })

  it('Should use an override when one is given, regardless of where this checkout sits', () => {
    const specDir = path.join(workspaceRoot, 'a-spec-dir')
    mkdirSync(specDir, { recursive: true })

    expect(workspaceSpecDir('/anywhere', specDir)).toBe(specDir)
    expect(
      workspaceSpecDir('/anywhere', path.join(workspaceRoot, 'missing'))
    ).toBeNull()
  })
})

describe('rulingConflictsFor', () => {
  let root

  beforeEach(() => {
    root = makeRepo()
    copyRealJourney(root)
    commitAll(root, 'The real journey')
  })

  afterEach(() => {
    removeRepo(root)
  })

  it('Should name a conflict when a proposed service matches one the real journey’s own services doc records as removed', () => {
    const conflicts = rulingConflictsFor(root, REAL_JOURNEY, [
      { name: 'transporters' }
    ])

    expect(conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          service: 'transporters',
          matchedTerm: 'transporter',
          source: `${setDirOf(REAL_JOURNEY)}/docs/services.md`
        })
      ])
    )
  })

  it('Should name no conflict for a service the real journey never removed', () => {
    expect(
      rulingConflictsFor(root, REAL_JOURNEY, [{ name: 'countries' }])
    ).toEqual([])
  })
})

describe('rulingNotesFor', () => {
  const RULINGS = 'spec/panel/rulings.json'
  const HINT = 'For example, 27/3/2026. If the potatoes have already arrived.'
  let root

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'handoff-rulings-'))
    writeFiles(root, {
      [RULINGS]: JSON.stringify({
        rulings: [
          {
            id: 'c-002',
            resolution: 'Keep the potato label. Accept a past date.',
            specChanges: [
              {
                target: 'arrivalDate',
                change: `input.hintByState = { potatoes: '${HINT}' }`
              }
            ]
          },
          { id: 'c-003', resolution: 'Something else.', specChanges: [] }
        ]
      })
    })
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('Should name the ruling whose spec changes quote the replaced words', () => {
    expect(
      rulingNotesFor(root, [{ file: RULINGS, line: 3, text: HINT }])
    ).toEqual([
      {
        id: 'c-002',
        target: 'arrivalDate',
        quoted: HINT,
        reason: 'Keep the potato label.',
        source: RULINGS
      }
    ])
  })

  it('Should name no ruling for a hit outside rulings.json', () => {
    expect(
      rulingNotesFor(root, [
        { file: 'spec/journey-spec.json', line: 1, text: HINT }
      ])
    ).toEqual([])
  })
})

describe('a hand-off for a service matching a removed plants service', () => {
  const SETS = 'src/server/app/sets'
  const RELEASE = `${SETS}/plants-working`
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
    'Should land the transporters service as a conflict for the product owner in report.rulingConflicts and in the brief',
    () => {
      writeFiles(root, {
        'overrides.json': OVERRIDES_WITH_TRANSPORTERS,
        ...TRANSPORTERS_SERVICE
      })
      commitAll(root, 'The prototype-owned transporters service')
      writeFiles(root, {
        [`${RELEASE}/set.js`]: "export const SET_ID = 'plants-working'\n",
        [`${RELEASE}/journeys/linear/features/transporter/controller.js`]:
          "import * as transporters from '../../../../../../services/transporters/index.js'\n\nexport const list = (orgId) => transporters.listTransporters(orgId)\n"
      })

      const report = buildHandoff({ root, set: 'plants-working' })

      expect(
        report.rulingConflicts.some(
          (conflict) =>
            conflict.service === 'transporters' &&
            conflict.matchedTerm === 'transporter'
        )
      ).toBe(true)

      const brief = renderBriefMarkdown(
        briefOutline(report, {
          title: 'Save a transporter you use often',
          date: '2026-09-28',
          branch: 'feat/EUDPA-456-saved-transporters',
          screenshots: [],
          examples: []
        })
      )

      expect(brief).toContain(
        'Ruling conflict: transporters matches "transporter"'
      )
      expect(brief).toContain('clashes with a standing ruling')
      expect(brief).toContain('.claude/skills/requirements-pipeline/SKILL.md')
    },
    TIMEOUT_MS
  )

  it(
    'Should still write the patch: a ruling conflict is a conflict for the product owner, not a build blocker',
    () => {
      writeFiles(root, {
        'overrides.json': OVERRIDES_WITH_TRANSPORTERS,
        ...TRANSPORTERS_SERVICE
      })
      commitAll(root, 'The prototype-owned transporters service')
      writeFiles(root, {
        [`${RELEASE}/set.js`]: "export const SET_ID = 'plants-working'\n",
        [`${RELEASE}/journeys/linear/features/transporter/controller.js`]:
          "import * as transporters from '../../../../../../services/transporters/index.js'\n\nexport const list = (orgId) => transporters.listTransporters(orgId)\n"
      })

      const report = buildHandoff({ root, set: 'plants-working' })

      expect(report.patch.length).toBeGreaterThan(0)
      expect(report.applyCheck.ok).toBe(true)
    },
    TIMEOUT_MS
  )
})

describe('plantsFrontendApplyCheck', () => {
  const REAL = 'src/server/app/sets/high-risk-plants'
  let root

  beforeEach(() => {
    root = makeRepo()
    copyRealJourney(root)
    commitAll(root, 'The real journey')
  })

  afterEach(() => {
    removeRepo(root)
  })

  it('Should give no check, and no error, when there is no sibling plants-frontend checkout to look in', () => {
    expect(
      plantsFrontendApplyCheck(root, [], 'a patch', false, '/no/such/checkout')
    ).toBeNull()
  })

  it('Should give no check for a brief-only hand-off or an empty patch, even with a sibling checkout', () => {
    const sibling = makeRepo()
    try {
      writeFiles(sibling, { 'README.md': 'plants-frontend\n' })
      commitAll(sibling, 'plants-frontend has something')
      expect(plantsFrontendApplyCheck(root, [], '', false, sibling)).toBeNull()
      expect(
        plantsFrontendApplyCheck(root, [], 'a patch', true, sibling)
      ).toBeNull()
    } finally {
      removeRepo(sibling)
    }
  })

  it(
    'Should check the patch against the sibling’s origin/main, never its working tree',
    () => {
      const sibling = makeRepo()
      try {
        const hintPath = `${REAL}/journeys/linear/features/arrival-details/copy/copy.en.js`
        writeFiles(sibling, {
          [hintPath]: "export const copy = {\n  hint: 'Old hint'\n}\n"
        })
        const sha = commitAll(sibling, 'plants-frontend main')
        git(['update-ref', 'refs/remotes/origin/main', sha], { cwd: sibling })
        git(['switch', '-q', '-c', 'some-other-branch'], { cwd: sibling })
        writeFiles(sibling, {
          [hintPath]:
            "export const copy = {\n  hint: 'A branch in progress, not main'\n}\n"
        })
        commitAll(sibling, 'work in progress on another branch')

        const patchChanges = [
          {
            path: hintPath,
            before: "export const copy = {\n  hint: 'Old hint'\n}\n",
            after: "export const copy = {\n  hint: 'New hint'\n}\n"
          }
        ]
        const patch = buildPatch(patchChanges)

        const check = plantsFrontendApplyCheck(
          root,
          patchChanges,
          patch,
          false,
          sibling
        )

        expect(check).toMatchObject({ ref: 'origin/main', ok: true })
      } finally {
        removeRepo(sibling)
      }
    },
    TIMEOUT_MS
  )
})
