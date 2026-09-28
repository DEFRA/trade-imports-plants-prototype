import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { withSetContext } from '../../shared/set-context.js'
import { clearFakesFor } from '../../../prototype-support/registry.js'
import { STUB_BOOK } from '../address-book/stub/index.js'
import * as pickers from '../address-book/index.js'
import * as insAddressBook from './index.js'
import * as thisClient from './client.js'

const CONTRACT = JSON.parse(
  readFileSync(
    path.join(fileURLToPath(import.meta.url), '../contract.json'),
    'utf8'
  )
)

const RELEASE = 'plants-ins-address-book-test'
const OTHER_RELEASE = 'plants-ins-address-book-other'
const ORG = 'org-address-book'
const OTHER_ORG = 'org-elsewhere'
const NORTHGATE = 'northgate-trading-ag'
const GREENHOUSE_ID = 'greenhouse-imports-ltd'
const SERVICE_URL = 'http://localhost:8089'
const ADDRESSES_PATH = `/organisation/${ORG}/addresses`
const EMAIL_FORMAT = 'Enter an email address in the correct format'
const RENAMED = 'Northgate Renamed'

const GREENHOUSE = {
  name: 'Greenhouse Imports Ltd',
  addressLine1: '4 Nursery Lane',
  townOrCity: 'Spalding',
  postcode: 'PE11 1AA',
  countryCode: 'GB',
  phone: '01632 960001',
  email: 'orders@greenhouse.example.com'
}

const inRelease = (fn) => withSetContext(RELEASE, fn)

const pickerIds = async (setId = RELEASE, query = '') => {
  const found = await withSetContext(setId, () =>
    pickers.search(ORG, { query, page: 1 })
  )
  return found.results.map(({ id }) => id)
}

describe('the stub, in stub mode', () => {
  beforeEach(() => {
    clearFakesFor(RELEASE)
    clearFakesFor(OTHER_RELEASE)
  })

  it('Should start from the same addresses the journey’s pickers show, in the INS wire shape', async () => {
    const { items, totalItems, pageSize } = await inRelease(() =>
      insAddressBook.listAddresses(ORG)
    )

    expect(totalItems).toBe(STUB_BOOK.length)
    expect(pageSize).toBe(25)
    expect(items.map(({ id }) => id)).toEqual(STUB_BOOK.map(({ id }) => id))
    expect(items.find(({ id }) => id === NORTHGATE)).toMatchObject({
      name: 'Northgate Trading AG',
      postcode: expect.any(String),
      countryCode: expect.any(String),
      email: `${NORTHGATE}@example.com`,
      deleted: false
    })
  })

  it('Should find by name or address line with q', async () => {
    const { items } = await inRelease(() =>
      insAddressBook.listAddresses(ORG, { q: 'northgate' })
    )

    expect(items.map(({ id }) => id)).toEqual([NORTHGATE])
  })

  it('Should add an address the pickers see at once, in this release only', async () => {
    const created = await inRelease(() =>
      insAddressBook.createAddress(ORG, { ...GREENHOUSE, crumb: 'abc' })
    )

    expect(created).toMatchObject({ id: GREENHOUSE_ID, ...GREENHOUSE })
    expect(created).not.toHaveProperty('crumb')
    expect(await pickerIds(RELEASE, 'spalding')).toContain(GREENHOUSE_ID)
    expect(
      await inRelease(() => pickers.party(ORG, GREENHOUSE_ID))
    ).toMatchObject({
      name: GREENHOUSE.name,
      address: {
        postalOrZipCode: 'PE11 1AA',
        country: 'United Kingdom',
        telephoneNumber: GREENHOUSE.phone,
        emailAddress: GREENHOUSE.email
      }
    })
    expect(await pickerIds(OTHER_RELEASE, 'spalding')).not.toContain(
      GREENHOUSE_ID
    )
    await expect(
      inRelease(() => insAddressBook.getAddress(OTHER_ORG, GREENHOUSE_ID))
    ).rejects.toMatchObject({ status: 404 })
  })

  it('Should refuse what the address book API refuses, with its messages', async () => {
    const refusal = await inRelease(() =>
      insAddressBook
        .createAddress(ORG, { ...GREENHOUSE, postcode: '', email: 'bad' })
        .catch((error) => error)
    )

    expect(insAddressBook.isValidationFailure(refusal)).toBe(true)
    expect(insAddressBook.mapApiErrorsToFormErrors(refusal.body)).toEqual({
      postcode: 'Enter a postcode',
      email: EMAIL_FORMAT
    })
  })

  it('Should change a starter address for its organisation, and the pickers follow', async () => {
    const updated = await inRelease(() =>
      insAddressBook.updateAddress(ORG, NORTHGATE, { name: RENAMED })
    )

    expect(updated).toMatchObject({ id: NORTHGATE, name: RENAMED })
    expect(
      (await inRelease(() => insAddressBook.getAddress(OTHER_ORG, NORTHGATE)))
        .name
    ).toBe('Northgate Trading AG')
    expect((await inRelease(() => pickers.party(ORG, NORTHGATE))).name).toBe(
      RENAMED
    )
  })

  it('Should delete an address from the book and the pickers until Reset', async () => {
    await inRelease(() => insAddressBook.deleteAddress(ORG, NORTHGATE))

    await expect(
      inRelease(() => insAddressBook.getAddress(ORG, NORTHGATE))
    ).rejects.toMatchObject({ status: 404 })
    expect(await pickerIds(RELEASE, 'northgate')).toEqual([])
    expect(await pickerIds(OTHER_RELEASE, 'northgate')).toEqual([NORTHGATE])

    clearFakesFor(RELEASE)

    expect(await pickerIds(RELEASE, 'northgate')).toEqual([NORTHGATE])
  })
})

describe('the INS client, against the address book API', () => {
  const originalMode = process.env.STUB_MODE

  const realService = async (answer) => {
    vi.resetModules()
    process.env.STUB_MODE = 'false'
    const fetched = vi.fn(answer)
    vi.stubGlobal('fetch', fetched)
    return { service: await import('./index.js'), fetched }
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalMode === undefined) {
      delete process.env.STUB_MODE
    } else {
      process.env.STUB_MODE = originalMode
    }
  })

  it('Should GET the organisation’s page with the organisation and trace headers', async () => {
    const { service, fetched } = await realService(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        items: [{ id: 'abc', ...GREENHOUSE }],
        page: 1,
        pageSize: 25,
        totalItems: 1,
        totalPages: 1
      })
    }))

    const page = await service.listAddresses(ORG, {
      page: 1,
      q: 'Spalding',
      countryCode: 'GB'
    })

    const [url, options] = fetched.mock.calls[0]
    const asked = new URL(url)
    expect(`${asked.origin}${asked.pathname}`).toBe(
      `${SERVICE_URL}${ADDRESSES_PATH}`
    )
    expect(Object.fromEntries(asked.searchParams)).toEqual({
      page: '1',
      q: 'Spalding',
      countryCode: 'GB'
    })
    expect(options.headers['Trade-Imports-Organisation-Id']).toBe(ORG)
    expect(options.headers).toHaveProperty('x-cdp-request-id')
    expect(page.items[0]).toMatchObject({ id: 'abc', deleted: false })
  })

  it('Should PUT a change and raise the 400 problem as a validation failure', async () => {
    const problem = {
      errors: { email: [EMAIL_FORMAT] }
    }
    const { service, fetched } = await realService(async () => ({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => problem
    }))

    const refusal = await service
      .updateAddress(ORG, 'abc', { ...GREENHOUSE, email: 'bad' })
      .catch((error) => error)

    expect(fetched.mock.calls[0][0]).toBe(`${SERVICE_URL}${ADDRESSES_PATH}/abc`)
    expect(fetched.mock.calls[0][1].method).toBe('PUT')
    expect(service.isValidationFailure(refusal)).toBe(true)
    expect(service.mapApiErrorsToFormErrors(refusal.body)).toEqual({
      email: EMAIL_FORMAT
    })
  })

  it('Should POST, GET and DELETE by the organisation path', async () => {
    const { service, fetched } = await realService(async (_url, options) => ({
      ok: true,
      status: options.method === 'DELETE' ? 204 : 200,
      json: async () => ({ id: 'abc', ...GREENHOUSE })
    }))

    await service.createAddress(ORG, GREENHOUSE)
    await service.getAddress(ORG, 'abc')
    await service.deleteAddress(ORG, 'abc')

    expect(
      fetched.mock.calls.map(([url, options]) => [options.method, url])
    ).toEqual([
      ['POST', `${SERVICE_URL}${ADDRESSES_PATH}`],
      ['GET', `${SERVICE_URL}${ADDRESSES_PATH}/abc`],
      ['DELETE', `${SERVICE_URL}${ADDRESSES_PATH}/abc`]
    ])
  })

  it('Should refuse to reach the address book without an organisation', async () => {
    const { service, fetched } = await realService(async () => ({}))

    await expect(service.listAddresses(undefined)).rejects.toThrow(
      /without an organisation/
    )
    expect(fetched).not.toHaveBeenCalled()
  })
})

describe('what it says it needs', () => {
  it('Should say whose service it is, and give its contract, in contract.json', () => {
    expect(CONTRACT.needsARealService).toMatch(/Import Notification Service/)
    expect(CONTRACT).toMatchObject({
      service: 'ins-address-book',
      owner: 'ins',
      baseUrlEnv: 'TRADE_IMPORTS_ADDRESS_BOOK_URL'
    })
  })

  it('Should export neither CONTRACT nor NEEDS_A_REAL_SERVICE from index.js', () => {
    expect(insAddressBook.CONTRACT).toBeUndefined()
    expect(insAddressBook.NEEDS_A_REAL_SERVICE).toBeUndefined()
  })
})

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPOS_DIR = path.join(HERE, '../../../../../..')
const SIBLING_DIR = path.join(
  REPOS_DIR,
  'trade-imports-ins-frontend/src/server/app/services/address-book'
)
const SIBLING_INDEX = path.join(SIBLING_DIR, 'index.js')
const SIBLING_CLIENT = path.join(SIBLING_DIR, 'client.js')

/** A function's exported shape: how many parameters come before the first
 * one with a default (or none at all), which is what changes when a call
 * site's argument list would stop matching. */
const shapeOf = (moduleExports) =>
  Object.fromEntries(
    Object.entries(moduleExports)
      .filter(([, value]) => typeof value === 'function')
      .map(([name, fn]) => [name, fn.length])
  )

/** Only the shape entries the sibling has, from ours: extra exports of our
 * own (a helper such as `toRecord`) are not drift, only a missing or
 * changed sibling operation is. */
const sharedShapeOf = (ours, sibling) => {
  const siblingShape = shapeOf(sibling)
  const oursShape = shapeOf(ours)
  return {
    sibling: siblingShape,
    ours: Object.fromEntries(
      Object.keys(siblingShape).map((name) => [name, oursShape[name]])
    )
  }
}

describe.runIf(existsSync(SIBLING_INDEX))(
  'the sibling in trade-imports-ins-frontend',
  () => {
    it('Should keep the same operations, with the same argument counts, as the INS frontend’s own address-book barrel', async () => {
      const sibling = await import(pathToFileURL(SIBLING_INDEX).href)

      const { sibling: siblingShape, ours } = sharedShapeOf(
        insAddressBook,
        sibling
      )
      expect(ours).toEqual(siblingShape)
    })
  }
)

describe.runIf(existsSync(SIBLING_CLIENT))(
  'the sibling client in trade-imports-ins-frontend',
  () => {
    it('Should keep the same request-making operations, with the same argument counts, as the INS frontend’s own address book client', async () => {
      const sibling = await import(pathToFileURL(SIBLING_CLIENT).href)

      const { sibling: siblingShape, ours } = sharedShapeOf(thisClient, sibling)
      expect(ours).toEqual(siblingShape)
    })
  }
)
