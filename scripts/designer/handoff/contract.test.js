import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { REPO_ROOT } from '../lib/repo.js'
import { ownedServicesFrom } from './impact.js'
import {
  asRealServiceFile,
  describeService,
  prototypeOnlyImportsOf,
  readServiceExports
} from './contract.js'
import { TRANSPORTERS_SERVICE } from './fixture-repo.js'

const DIR = 'src/server/app/services/transporters'
const INDEX = TRANSPORTERS_SERVICE[`${DIR}/index.js`]
const read = (filePath) => TRANSPORTERS_SERVICE[filePath] ?? null

describe('readServiceExports', () => {
  it('Should read CONTRACT and NEEDS_A_REAL_SERVICE without running the service', () => {
    const exported = readServiceExports(INDEX)

    expect(exported.needs).toContain('A transporter register')
    expect(exported.contract.owner).toBe('new-api')
    expect(exported.contract.operations.map((op) => op.name)).toEqual([
      'listTransporters',
      'createTransporter'
    ])
  })

  it('Should resolve a constant the contract names from the same file', () => {
    const { contract } = readServiceExports(INDEX)

    expect(contract.record.fields[1]).toEqual({
      name: 'transporterType',
      type: 'string',
      required: true,
      enum: ['commercial', 'private']
    })
  })

  it('Should give no contract, not fail, when a service has none', () => {
    expect(
      readServiceExports("import x from './y.js'\nexport const a = x")
    ).toEqual({ contract: null, needs: null })
  })

  it('Should give null for a file that cannot be read as data', () => {
    expect(
      readServiceExports("import { make } from './make.js'\nconst v = make()")
    ).toBeNull()
  })
})

const OWNED = [
  ...ownedServicesFrom(
    JSON.parse(readFileSync(path.join(REPO_ROOT, 'overrides.json'), 'utf8'))
  )
].filter((name) =>
  existsSync(path.join(REPO_ROOT, `src/server/app/services/${name}/index.js`))
)

describe.runIf(OWNED.length > 0)('the prototype’s own services', () => {
  it.each(OWNED)('Should read the CONTRACT of %s as data', (name) => {
    const service = describeService(
      name,
      (filePath) => {
        const full = path.join(REPO_ROOT, filePath)
        return existsSync(full) ? readFileSync(full, 'utf8') : null
      },
      []
    )

    expect(service.contractReadable).toBe(true)
    expect(service.contract.operations.length).toBeGreaterThan(0)
    expect(service.proposedPrototypeImports).toEqual([])
  })
})

describe('prototypeOnlyImportsOf', () => {
  it('Should name the stub’s import of the prototype’s stub plumbing', () => {
    expect(
      prototypeOnlyImportsOf(
        `${DIR}/stub.js`,
        TRANSPORTERS_SERVICE[`${DIR}/stub.js`]
      )
    ).toEqual(['src/server/prototype-support/fake-store.js'])
  })

  it('Should find none in the files that travel', () => {
    expect(prototypeOnlyImportsOf(`${DIR}/index.js`, INDEX)).toEqual([])
  })
})

describe('asRealServiceFile', () => {
  it('Should ask plants-frontend’s mode switch in place of the prototype’s', () => {
    const real = asRealServiceFile(INDEX)

    expect(real).toContain(
      "import { isStubMode } from '../../../common/services/mode.js'"
    )
    expect(real).not.toContain('isStubDataMode')
  })
})

describe('describeService', () => {
  const service = describeService('transporters', read, [
    'b.js',
    'a.js',
    'a.js'
  ])

  it('Should propose index.js and client.js, never stub.js', () => {
    expect(service.proposed.map((file) => file.path)).toEqual([
      `${DIR}/index.js`,
      `${DIR}/client.js`
    ])
    expect(service.proposed[0].after).toContain('isStubMode()')
    expect(service.modeSwitchRenamed).toBe(true)
  })

  it('Should name where it goes, who uses it and the stub’s one prototype import', () => {
    expect(service).toMatchObject({
      target: DIR,
      usedBy: ['a.js', 'b.js'],
      contractReadable: true,
      stubPrototypeImports: ['src/server/prototype-support/fake-store.js'],
      proposedPrototypeImports: []
    })
  })
})
