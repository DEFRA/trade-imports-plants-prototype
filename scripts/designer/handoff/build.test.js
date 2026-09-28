import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  buildHandoff,
  CANONICAL_WORKSPACE_ROOT,
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
  let canonicalRoot

  beforeEach(() => {
    canonicalRoot = mkdtempSync(path.join(tmpdir(), 'handoff-canonical-'))
  })

  afterEach(() => {
    rmSync(canonicalRoot, { recursive: true, force: true })
  })

  it('Should give null for a checkout outside the canonical workspace, with no error (a standalone clone, or CI)', () => {
    const standalone = mkdtempSync(path.join(tmpdir(), 'handoff-standalone-'))
    try {
      expect(workspaceSpecDir(standalone, undefined, canonicalRoot)).toBeNull()
    } finally {
      rmSync(standalone, { recursive: true, force: true })
    }
  })

  it('Should resolve openspec/specs/plants inside the canonical workspace when this checkout sits inside it', () => {
    const specDir = path.join(canonicalRoot, 'openspec/specs/plants')
    mkdirSync(specDir, { recursive: true })
    const root = path.join(
      canonicalRoot,
      'repos/trade-imports-plants-prototype'
    )
    mkdirSync(root, { recursive: true })

    expect(workspaceSpecDir(root, undefined, canonicalRoot)).toBe(specDir)
  })

  it('Should refuse, in plain words, a canonical workspace with no openspec/specs/plants', () => {
    const root = path.join(
      canonicalRoot,
      'repos/trade-imports-plants-prototype'
    )
    mkdirSync(root, { recursive: true })

    expect(() => workspaceSpecDir(root, undefined, canonicalRoot)).toThrow(
      /has no openspec\/specs\/plants/
    )
  })

  it('Should use an override when one is given, regardless of where this checkout sits', () => {
    const specDir = path.join(canonicalRoot, 'a-spec-dir')
    mkdirSync(specDir, { recursive: true })

    expect(workspaceSpecDir('/anywhere', specDir, canonicalRoot)).toBe(specDir)
    expect(
      workspaceSpecDir(
        '/anywhere',
        path.join(canonicalRoot, 'missing'),
        canonicalRoot
      )
    ).toBeNull()
  })

  it('Should default to the real ~/git/defra/trade-imports-workspace when no canonical root is injected', () => {
    expect(
      CANONICAL_WORKSPACE_ROOT.endsWith('git/defra/trade-imports-workspace')
    ).toBe(true)
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
