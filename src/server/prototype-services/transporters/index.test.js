import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { withSetContext } from '../../app/shared/set-context.js'
import { clearFakesFor, describeFakes } from '../lib/registry.js'
import {
  addTransporter,
  clear,
  PAGE_SIZE,
  removeTransporter,
  search,
  SERVICE,
  transporter,
  validateTransporter
} from './index.js'

const RELEASE = 'plants-transporters-test'
const ORG = 'org-transporters'
const OTHER_ORG = 'org-elsewhere'
const COPPERFIELD = 'copperfield-couriers'
const QUICK_HAULAGE_ID = 'quick-haulage-ltd'
const MISSING = 'missing'

const STARTERS = JSON.parse(
  readFileSync(new URL('./data.json', import.meta.url), 'utf8')
)

const QUICK_HAULAGE = {
  name: 'Quick Haulage Ltd',
  transporterType: 'commercial',
  addressLine1: '1 Depot Road',
  townOrCity: 'Dover',
  postalOrZipCode: 'CT16 1AA',
  country: 'United Kingdom'
}

const inRelease = (fn) => withSetContext(RELEASE, fn)

const find = (orgId, id) => inRelease(() => transporter(orgId, id))

const idsMatching = async (query) => {
  const found = await inRelease(() => search(ORG, { query }))
  return found.results.map((record) => record.id)
}

describe('#search', () => {
  it('Should answer in the address book picker shape, five to a page', async () => {
    const found = await inRelease(() => search(ORG, { page: 2 }))

    expect(found).toMatchObject({
      total: STARTERS.length,
      page: 2,
      totalPages: Math.ceil(STARTERS.length / PAGE_SIZE),
      pageSize: PAGE_SIZE
    })
    expect(found.results).toHaveLength(STARTERS.length - PAGE_SIZE)
  })

  it('Should find by name, town or approval number', async () => {
    expect(await idsMatching('rotterdam')).toEqual(['north-sea-freight-bv'])
    expect(await idsMatching('UK/KENT')).toEqual([COPPERFIELD])
    expect(await idsMatching('fenland')).toEqual(['fenland-growers-transport'])
  })

  it('Should give every record the fields an address book picker reads', async () => {
    const found = await inRelease(() => search(ORG, { page: 1 }))

    for (const record of found.results) {
      expect(record).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        deleted: false,
        address: expect.objectContaining({ addressLine1: expect.any(String) })
      })
    }
  })
})

describe('#addTransporter', () => {
  it('Should save a new transporter that its organisation can find straight away', async () => {
    const added = await inRelease(() => addTransporter(ORG, QUICK_HAULAGE))

    expect(added).toMatchObject({
      id: QUICK_HAULAGE_ID,
      approvalStatus: 'new',
      address: { townOrCity: 'Dover' }
    })
    expect(await find(ORG, QUICK_HAULAGE_ID)).toMatchObject({
      name: QUICK_HAULAGE.name
    })
    expect(await find(OTHER_ORG, QUICK_HAULAGE_ID)).toBeUndefined()
  })

  it('Should refuse fields that fail validation', async () => {
    const saving = inRelease(() => addTransporter(ORG, { name: 'No address' }))

    await expect(saving).rejects.toThrow('Transporter not saved')
  })

  it('Should be emptied by the chooser’s Reset, through the records wrapper', async () => {
    const resetMe = { ...QUICK_HAULAGE, name: 'Reset Me Ltd' }
    await inRelease(() => addTransporter(ORG, resetMe))

    clearFakesFor(RELEASE)

    expect(await find(ORG, 'reset-me-ltd')).toBeUndefined()
    expect(describeFakes()).toContainEqual(SERVICE)
  })
})

describe('#validateTransporter', () => {
  it('Should name each missing field and an unknown type', () => {
    const boat = { ...QUICK_HAULAGE, transporterType: 'boat' }

    expect(validateTransporter({})).toEqual({
      name: MISSING,
      transporterType: MISSING,
      addressLine1: MISSING,
      townOrCity: MISSING,
      country: MISSING
    })
    expect(validateTransporter(boat)).toEqual({ transporterType: 'unknown' })
    expect(validateTransporter(QUICK_HAULAGE)).toEqual({})
  })
})

describe('#removeTransporter and #clear', () => {
  it('Should hide a starter from one organisation until Reset', async () => {
    const removed = await inRelease(() => removeTransporter(ORG, COPPERFIELD))

    expect(removed).toBe(true)
    expect(await find(ORG, COPPERFIELD)).toBeUndefined()

    inRelease(() => clear())

    expect(await find(ORG, COPPERFIELD)).toMatchObject({ id: COPPERFIELD })
  })
})
