import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  describeServices,
  ownedGlobOf,
  ownedServiceNames,
  serviceFolderOf
} from './contracts.js'

const repoWith = ({ ours, services }) => {
  const root = mkdtempSync(path.join(tmpdir(), 'contracts-'))
  writeFileSync(
    path.join(root, 'overrides.json'),
    JSON.stringify({ deleted: [], ours, patched: [] })
  )
  for (const [name, source] of Object.entries(services)) {
    const folder = path.join(root, serviceFolderOf(name))
    mkdirSync(folder, { recursive: true })
    writeFileSync(path.join(folder, 'index.js'), source)
  }
  return root
}

describe('#ownedServiceNames', () => {
  it('Should read only the service folders that have their own ours line', () => {
    expect(
      ownedServiceNames({
        ours: [
          'src/server/prototype-support/**',
          ownedGlobOf('transporters'),
          'src/server/app/services/**',
          'src/server/app/services/address-book/index.js',
          ownedGlobOf('saved-vehicles')
        ]
      })
    ).toEqual(['transporters', 'saved-vehicles'])
  })
})

describe('#describeServices', () => {
  it('Should read each owned service’s sentence and contract, and say which it could not read', async () => {
    const root = repoWith({
      ours: [ownedGlobOf('vehicles'), ownedGlobOf('missing')],
      services: {
        vehicles:
          "export const NEEDS_A_REAL_SERVICE = 'Saved vehicles.'\nexport const CONTRACT = { service: 'vehicles', owner: 'new-api' }\n",
        countries: "export const NEEDS_A_REAL_SERVICE = 'Not owned.'\n"
      }
    })

    expect(await describeServices({ root })).toEqual([
      {
        name: 'vehicles',
        folder: 'src/server/app/services/vehicles',
        needsARealService: 'Saved vehicles.',
        contract: { service: 'vehicles', owner: 'new-api' }
      },
      {
        name: 'missing',
        folder: 'src/server/app/services/missing',
        needsARealService: null,
        contract: null,
        problem: 'src/server/app/services/missing/index.js does not exist'
      }
    ])
  })
})
