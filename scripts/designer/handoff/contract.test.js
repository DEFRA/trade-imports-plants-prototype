import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { REPO_ROOT } from '../lib/repo.js'
import { ownedServicesFrom } from './impact.js'
import {
  asRealServiceFile,
  describeService,
  prototypeOnlyImportsOf,
  readContract
} from './contract.js'

const DIR = 'src/server/app/services/transporters'

const TRANSPORTERS_INDEX = `import { isStubDataMode } from '../../../common/services/mode.js'
import * as client from './client.js'
import * as stub from './stub.js'

const impl = () => (isStubDataMode() ? stub : client)

export const listTransporters = (orgId, options) =>
  impl().listTransporters(orgId, options)
`

const TRANSPORTERS_STUB = `import { createFakeStore } from '../../../prototype-support/fake-store.js'

const store = createFakeStore({ name: 'transporters', starters: [] })
`

const TRANSPORTERS_CONTRACT = JSON.stringify({
  service: 'transporters',
  owner: 'new-api',
  baseUrlEnv: 'TRADE_IMPORTS_TRANSPORTERS_URL',
  needsARealService: 'A transporter register: search, add and delete one.',
  operations: [
    { name: 'listTransporters', method: 'GET', path: '/transporters' },
    { name: 'createTransporter', method: 'POST', path: '/transporters' }
  ],
  record: {
    fields: [
      { name: 'id', type: 'string', required: true },
      {
        name: 'transporterType',
        type: 'string',
        required: true,
        enum: ['commercial', 'private']
      }
    ]
  }
})

const FILES = {
  [`${DIR}/index.js`]: TRANSPORTERS_INDEX,
  [`${DIR}/client.js`]: 'export const listTransporters = async () => []\n',
  [`${DIR}/stub.js`]: TRANSPORTERS_STUB,
  [`${DIR}/contract.json`]: TRANSPORTERS_CONTRACT
}
const read = (filePath) => FILES[filePath] ?? null

describe('readContract', () => {
  it('Should read a service’s contract.json as data', () => {
    const { contract, needs } = readContract(TRANSPORTERS_CONTRACT)

    expect(needs).toContain('A transporter register')
    expect(contract.owner).toBe('new-api')
    expect(contract.operations.map((op) => op.name)).toEqual([
      'listTransporters',
      'createTransporter'
    ])
  })

  it('Should give no contract and no needs sentence when there is none', () => {
    expect(readContract(null)).toEqual({ contract: null, needs: null })
  })

  it('Should give no contract, not throw, for text that is not valid JSON', () => {
    expect(readContract('{ not json')).toEqual({ contract: null, needs: null })
  })

  it('Should give no contract for JSON that is not an object', () => {
    expect(readContract('[1, 2, 3]')).toEqual({ contract: null, needs: null })
    expect(readContract('"just a string"')).toEqual({
      contract: null,
      needs: null
    })
  })
})

const OWNED = [
  ...ownedServicesFrom(
    JSON.parse(readFileSync(path.join(REPO_ROOT, 'overrides.json'), 'utf8'))
  )
].filter((name) =>
  existsSync(
    path.join(REPO_ROOT, `src/server/app/services/${name}/contract.json`)
  )
)

describe.runIf(OWNED.length > 0)('the prototype’s own services', () => {
  it.each(OWNED)(
    'Should read src/server/app/services/%s/contract.json as data',
    (name) => {
      const service = describeService(
        name,
        (filePath) => {
          const full = path.join(REPO_ROOT, filePath)
          return existsSync(full) ? readFileSync(full, 'utf8') : null
        },
        []
      )

      expect(
        service.contractReadable,
        'service contract.json: must exist and parse as a JSON object'
      ).toBe(true)
      expect(
        service.contract.operations.length,
        'service contract.json: must list at least one operation'
      ).toBeGreaterThan(0)
      expect(
        service.proposedPrototypeImports,
        'service contract.json: index.js and client.js must import nothing from prototype-support/ or prototype-data/'
      ).toEqual([])
    }
  )
})

describe('prototypeOnlyImportsOf', () => {
  it('Should name the stub’s import of the prototype’s stub plumbing', () => {
    expect(prototypeOnlyImportsOf(`${DIR}/stub.js`, TRANSPORTERS_STUB)).toEqual(
      ['src/server/prototype-support/fake-store.js']
    )
  })

  it('Should find none in the files that travel', () => {
    expect(
      prototypeOnlyImportsOf(`${DIR}/index.js`, TRANSPORTERS_INDEX)
    ).toEqual([])
  })
})

describe('asRealServiceFile', () => {
  it('Should ask plants-frontend’s mode switch in place of the prototype’s', () => {
    const real = asRealServiceFile(TRANSPORTERS_INDEX)

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

  it('Should name where it goes, who uses it, its contract and the stub’s one prototype import', () => {
    expect(service).toMatchObject({
      target: DIR,
      usedBy: ['a.js', 'b.js'],
      contractReadable: true,
      needs: 'A transporter register: search, add and delete one.',
      stubPrototypeImports: ['src/server/prototype-support/fake-store.js'],
      proposedPrototypeImports: []
    })
    expect(service.contract.owner).toBe('new-api')
  })

  it('Should give a null contract and no problem when contract.json is missing', () => {
    const withoutContract = describeService(
      'transporters',
      (filePath) =>
        filePath === `${DIR}/contract.json` ? null : read(filePath),
      []
    )

    expect(withoutContract.contract).toBeNull()
    expect(withoutContract.contractReadable).toBe(false)
    expect(withoutContract.needs).toBeNull()
  })
})
