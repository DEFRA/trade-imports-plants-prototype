import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  ownedServiceNames,
  serviceFolderOf
} from '../prototype-support/contracts.js'
import { REPO_ROOT } from '../../../scripts/designer/lib/repo.js'
import {
  checkServiceConformance,
  contractFileProblems,
  indexFileProblems
} from './service-conformance.js'

describe('indexFileProblems', () => {
  it('Should say nothing for the house shape', () => {
    expect(
      indexFileProblems(
        "import { isStubDataMode } from '../../../common/services/mode.js'\n\n/** One page of records. */\nexport const listThings = () => []\n"
      )
    ).toEqual([])
  })

  it('Should flag a CONTRACT export', () => {
    const found = indexFileProblems(
      "export const CONTRACT = Object.freeze({ service: 'x' })\n"
    )

    expect(found.map((problem) => problem.rule)).toEqual(['contract-export'])
  })

  it('Should flag a NEEDS_A_REAL_SERVICE export', () => {
    const found = indexFileProblems("export const NEEDS_A_REAL_SERVICE = 'x'\n")

    expect(found.map((problem) => problem.rule)).toEqual(['needs-export'])
  })

  it('Should flag a floating module doc block, never a per-function one', () => {
    const floating = indexFileProblems(
      '/**\n * Prototype-owned service: things.\n */\nexport const listThings = () => []\n'
    )
    const perFunction = indexFileProblems(
      "import { isStubDataMode } from '../../../common/services/mode.js'\n\n/** One page of records. */\nexport const listThings = () => []\n"
    )

    expect(floating.map((problem) => problem.rule)).toEqual([
      'floating-doc-block'
    ])
    expect(perFunction).toEqual([])
  })
})

describe('contractFileProblems', () => {
  it('Should say nothing for a valid contract with an operation', () => {
    expect(
      contractFileProblems(
        JSON.stringify({ operations: [{ name: 'listThings' }] })
      )
    ).toEqual([])
  })

  it('Should flag a missing file', () => {
    expect(contractFileProblems(null).map((p) => p.rule)).toEqual([
      'missing-contract'
    ])
  })

  it('Should flag text that is not valid JSON', () => {
    expect(contractFileProblems('{ not json').map((p) => p.rule)).toEqual([
      'invalid-contract'
    ])
  })

  it('Should flag JSON that is not an object', () => {
    expect(contractFileProblems('[1, 2]').map((p) => p.rule)).toEqual([
      'invalid-contract'
    ])
  })

  it('Should flag an empty or missing operations list', () => {
    expect(contractFileProblems('{}').map((p) => p.rule)).toEqual([
      'no-operations'
    ])
    expect(
      contractFileProblems('{ "operations": [] }').map((p) => p.rule)
    ).toEqual(['no-operations'])
  })
})

describe('checkServiceConformance', () => {
  let root

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'service-conformance-'))
  })

  afterEach(() => rmSync(root, { recursive: true, force: true }))

  const write = (name, file, content) => {
    const folder = path.join(root, name)
    mkdirSync(folder, { recursive: true })
    writeFileSync(path.join(folder, file), content)
  }

  it('Should name the service in every message, folding both files together', () => {
    write(
      'things',
      'index.js',
      "export const CONTRACT = {}\nexport const NEEDS_A_REAL_SERVICE = 'x'\n"
    )

    const { problems } = checkServiceConformance(['things'], (name) =>
      path.join(root, name)
    )

    expect(problems.map((problem) => problem.rule)).toEqual([
      'contract-export',
      'needs-export',
      'missing-contract'
    ])
    for (const problem of problems) {
      expect(problem.message).toMatch(/^things: /)
    }
  })

  it('Should say nothing for a conforming service', () => {
    write(
      'things',
      'index.js',
      "import { isStubDataMode } from '../../../common/services/mode.js'\n\n/** One page. */\nexport const listThings = () => []\n"
    )
    write(
      'things',
      'contract.json',
      JSON.stringify({ operations: [{ name: 'listThings' }] })
    )

    expect(
      checkServiceConformance(['things'], (name) => path.join(root, name))
        .problems
    ).toEqual([])
  })
})

const OWNED = ownedServiceNames(
  JSON.parse(readFileSync(path.join(REPO_ROOT, 'overrides.json'), 'utf8'))
)

describe.runIf(OWNED.length > 0)('every prototype-owned service', () => {
  it('Should conform: no CONTRACT/NEEDS_A_REAL_SERVICE export, no floating doc block, a valid contract.json', () => {
    const { problems } = checkServiceConformance(OWNED, (name) =>
      path.join(REPO_ROOT, serviceFolderOf(name))
    )

    expect(problems.map((problem) => problem.message)).toEqual([])
  })
})
