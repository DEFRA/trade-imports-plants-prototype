import { describe, expect, it } from 'vitest'

import { STUB_BOOK } from '../../app/services/address-book/stub/index.js'
import * as realAddressBook from '../../app/services/address-book/index.js'
import { withSetContext } from '../../app/shared/set-context.js'
import { clearFakesFor, describeFakes } from '../lib/registry.js'
import {
  addAddress,
  clear,
  PAGE_SIZE,
  party,
  removeAddress,
  search,
  SERVICE,
  validateAddress
} from './index.js'

const RELEASE = 'plants-address-book-test'
const ORG = 'org-address-book'
const OTHER_ORG = 'org-elsewhere'
const NORTHGATE = 'northgate-trading-ag'
const MISSING = 'missing'
const GREENHOUSE_ID = 'greenhouse-imports-ltd'

const GREENHOUSE = {
  name: 'Greenhouse Imports Ltd',
  addressLine1: '4 Nursery Lane',
  townOrCity: 'Spalding',
  postalOrZipCode: 'PE11 1AA',
  country: 'United Kingdom'
}

const inRelease = (fn) => withSetContext(RELEASE, fn)

const find = (orgId, id) => inRelease(() => party(orgId, id))

const idsMatching = async (query) => {
  const found = await inRelease(() => search(ORG, { query }))
  return found.results.map((record) => record.id)
}

describe('#search and #party', () => {
  it('Should start from the stub address book, in the real seam’s shape', async () => {
    const found = await inRelease(() => search(ORG, { page: 1 }))
    const real = await inRelease(() => realAddressBook.search(ORG, { page: 1 }))

    expect(found).toEqual(real)
    expect(found).toMatchObject({
      total: STUB_BOOK.length,
      pageSize: PAGE_SIZE
    })
  })

  it('Should find by name or any line of the address', async () => {
    expect(await idsMatching('northgate')).toEqual([NORTHGATE])
    expect(await idsMatching('innsbruck')).toEqual(['alpine-supplies-gmbh'])
  })

  it('Should read one address as the real seam does', async () => {
    expect(await find(ORG, NORTHGATE)).toEqual(
      await inRelease(() => realAddressBook.party(ORG, NORTHGATE))
    )
  })
})

describe('#addAddress', () => {
  it('Should save an address its organisation can find straight away', async () => {
    const added = await inRelease(() => addAddress(ORG, GREENHOUSE))

    const { name, ...address } = GREENHOUSE
    expect(added).toMatchObject({
      id: GREENHOUSE_ID,
      name,
      deleted: false,
      address
    })
    expect(added.address).not.toHaveProperty('addressLine2')
    expect(await idsMatching('spalding')).toEqual([GREENHOUSE_ID])
    expect(await find(OTHER_ORG, GREENHOUSE_ID)).toBeUndefined()
  })

  it('Should keep extra answers a design asks for, but never the form’s crumb', async () => {
    const added = await inRelease(() =>
      addAddress(ORG, {
        ...GREENHOUSE,
        name: 'Usage Test Ltd',
        usages: ['consignee', 'importer'],
        crumb: 'abc'
      })
    )

    expect(added.usages).toEqual(['consignee', 'importer'])
    expect(added).not.toHaveProperty('crumb')
  })

  it('Should refuse fields that fail validation', async () => {
    const saving = inRelease(() => addAddress(ORG, { name: 'No address' }))

    await expect(saving).rejects.toThrow('Address not saved')
  })

  it('Should be emptied by the chooser’s Reset, through the records wrapper', async () => {
    await inRelease(() => addAddress(ORG, { ...GREENHOUSE, name: 'Reset Me' }))

    clearFakesFor(RELEASE)

    expect(await find(ORG, 'reset-me')).toBeUndefined()
    expect(describeFakes()).toContainEqual(SERVICE)
  })
})

describe('#validateAddress', () => {
  it('Should name each missing field', () => {
    expect(validateAddress({})).toEqual({
      name: MISSING,
      addressLine1: MISSING,
      townOrCity: MISSING,
      country: MISSING
    })
    expect(validateAddress(GREENHOUSE)).toEqual({})
  })
})

describe('#removeAddress and #clear', () => {
  it('Should hide a starter address from one organisation until Reset', async () => {
    const removed = await inRelease(() => removeAddress(ORG, NORTHGATE))

    expect(removed).toBe(true)
    expect(await find(ORG, NORTHGATE)).toBeUndefined()
    expect(await find(OTHER_ORG, NORTHGATE)).toMatchObject({ id: NORTHGATE })

    inRelease(() => clear())

    expect(await find(ORG, NORTHGATE)).toMatchObject({ id: NORTHGATE })
  })

  it('Should say false for an address the organisation cannot see', async () => {
    expect(await inRelease(() => removeAddress(ORG, 'no-such-address'))).toBe(
      false
    )
  })
})
