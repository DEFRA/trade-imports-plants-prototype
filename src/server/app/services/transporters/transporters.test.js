import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { withSetContext } from '../../shared/set-context.js'
import { clearFakesFor } from '../../../prototype-support/registry.js'
import * as transporters from './index.js'
import { STARTER_TRANSPORTERS } from './stub.js'

const CONTRACT = JSON.parse(
  readFileSync(
    path.join(fileURLToPath(import.meta.url), '../contract.json'),
    'utf8'
  )
)

const RELEASE = 'plants-transporters-test'
const OTHER_RELEASE = 'plants-transporters-other'
const ORG = 'org-transporters'
const OTHER_ORG = 'org-elsewhere'
const COPPERFIELD = 'copperfield-couriers'
const QUICK_HAULAGE_ID = 'quick-haulage-ltd'
const SERVICE_URL = 'http://localhost:8095'
const TRANSPORTERS_PATH = `/organisation/${ORG}/transporters`

const QUICK_HAULAGE = {
  name: 'Quick Haulage Ltd',
  transporterType: 'commercial',
  addressLine1: '1 Depot Road',
  townOrCity: 'Dover',
  postcode: 'CT16 1AA',
  country: 'GB'
}

const inRelease = (fn) => withSetContext(RELEASE, fn)

const find = (orgId, id, setId = RELEASE) =>
  withSetContext(setId, () => transporters.getTransporter(orgId, id))

const idsMatching = async (search) => {
  const found = await inRelease(() =>
    transporters.listTransporters(ORG, { search })
  )
  return found.results.map((record) => record.id)
}

describe('the stub, in stub mode', () => {
  beforeEach(() => {
    clearFakesFor(RELEASE)
    clearFakesFor(OTHER_RELEASE)
  })

  describe('#listTransporters', () => {
    it('Should answer in the address book picker shape, five to a page', async () => {
      const found = await inRelease(() =>
        transporters.listTransporters(ORG, { page: 2 })
      )

      expect(found).toMatchObject({
        total: STARTER_TRANSPORTERS.length,
        page: 2,
        totalPages: Math.ceil(
          STARTER_TRANSPORTERS.length / transporters.PAGE_SIZE
        ),
        pageSize: transporters.PAGE_SIZE
      })
      expect(found.results).toHaveLength(
        STARTER_TRANSPORTERS.length - transporters.PAGE_SIZE
      )
    })

    it('Should find by name, town or approval number', async () => {
      expect(await idsMatching('rotterdam')).toEqual(['north-sea-freight-bv'])
      expect(await idsMatching('UK/KENT')).toEqual([COPPERFIELD])
      expect(await idsMatching('fenland')).toEqual([
        'fenland-growers-transport'
      ])
    })

    it('Should give every record the fields an address book picker reads', async () => {
      const found = await inRelease(() =>
        transporters.listTransporters(ORG, { page: 1 })
      )

      for (const record of found.results) {
        expect(record).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          deleted: false,
          address: expect.objectContaining({
            addressLine1: expect.any(String)
          })
        })
      }
    })
  })

  describe('#createTransporter', () => {
    it('Should save a transporter only its organisation, in this release, can find', async () => {
      const added = await inRelease(() =>
        transporters.createTransporter(ORG, QUICK_HAULAGE)
      )

      expect(added).toMatchObject({
        id: QUICK_HAULAGE_ID,
        approvalStatus: 'new',
        address: { townOrCity: 'Dover', postalOrZipCode: 'CT16 1AA' }
      })
      expect(await find(ORG, QUICK_HAULAGE_ID)).toMatchObject({
        name: QUICK_HAULAGE.name
      })
      expect(await find(OTHER_ORG, QUICK_HAULAGE_ID)).toBeUndefined()
      expect(await find(ORG, QUICK_HAULAGE_ID, OTHER_RELEASE)).toBeUndefined()
    })

    it('Should refuse with a 400 problem that maps onto the form, the way the address book does', async () => {
      const refusal = await inRelease(() =>
        transporters
          .createTransporter(ORG, {
            name: 'No address',
            transporterType: 'boat'
          })
          .catch((error) => error)
      )

      expect(transporters.isValidationFailure(refusal)).toBe(true)
      expect(transporters.mapApiErrorsToFormErrors(refusal.body)).toEqual({
        transporterType: 'Select the type of transporter',
        addressLine1: 'Enter address line 1',
        townOrCity: 'Enter the town or city',
        country: 'Enter the country'
      })
    })
  })

  describe('#deleteTransporter and Reset', () => {
    it('Should hide a starter from one organisation until its release is reset', async () => {
      expect(
        await inRelease(() => transporters.deleteTransporter(ORG, COPPERFIELD))
      ).toBe(true)
      expect(await find(ORG, COPPERFIELD)).toBeUndefined()
      expect(await find(OTHER_ORG, COPPERFIELD)).toMatchObject({
        id: COPPERFIELD
      })

      clearFakesFor(RELEASE)

      expect(await find(ORG, COPPERFIELD)).toMatchObject({ id: COPPERFIELD })
    })

    it('Should clear only the release that was reset', async () => {
      const resetMe = { ...QUICK_HAULAGE, name: 'Reset Me Ltd' }
      await inRelease(() => transporters.createTransporter(ORG, resetMe))
      await withSetContext(OTHER_RELEASE, () =>
        transporters.createTransporter(ORG, resetMe)
      )

      clearFakesFor(RELEASE)

      expect(await find(ORG, 'reset-me-ltd')).toBeUndefined()
      expect(await find(ORG, 'reset-me-ltd', OTHER_RELEASE)).toMatchObject({
        name: 'Reset Me Ltd'
      })
    })

    it('Should answer false for a transporter it cannot see', async () => {
      expect(
        await inRelease(() => transporters.deleteTransporter(ORG, 'nobody'))
      ).toBe(false)
    })
  })
})

describe('the proposed client, against a transporters API', () => {
  const originalMode = process.env.STUB_MODE

  const okResponse = (body, status = 200) => ({
    ok: true,
    status,
    json: async () => body
  })

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

  it('Should list with the organisation in the path and header, and map the page', async () => {
    const { service, fetched } = await realService(async () =>
      okResponse({
        items: [STARTER_TRANSPORTERS[0]],
        page: 2,
        pageSize: 5,
        totalItems: 6,
        totalPages: 2
      })
    )

    const found = await service.listTransporters(ORG, {
      search: 'felix',
      page: 2
    })

    const [url, options] = fetched.mock.calls[0]
    const asked = new URL(url)
    expect(`${asked.origin}${asked.pathname}`).toBe(
      `${SERVICE_URL}${TRANSPORTERS_PATH}`
    )
    expect(Object.fromEntries(asked.searchParams)).toEqual({
      page: '2',
      pageSize: '5',
      q: 'felix'
    })
    expect(options.headers['Trade-Imports-Organisation-Id']).toBe(ORG)
    expect(options.headers).toHaveProperty('x-cdp-request-id')
    expect(found).toEqual({
      results: [
        {
          id: 'harbourline-haulage-ltd',
          name: 'Harbourline Haulage Ltd',
          deleted: false,
          address: {
            addressLine1: '4 Quayside Park',
            addressLine2: '',
            townOrCity: 'Felixstowe',
            county: 'Suffolk',
            postalOrZipCode: 'IP11 3QT',
            country: 'GB'
          },
          approvalNumber: 'UK/SUFFOLK/T1/00092001',
          transporterType: 'commercial',
          approvalStatus: 'approved'
        }
      ],
      total: 6,
      page: 2,
      totalPages: 2,
      pageSize: 5
    })
  })

  it('Should POST a new transporter and raise the 400 problem as a validation failure', async () => {
    const problem = { errors: { name: ['Enter the transporter’s name'] } }
    const { service, fetched } = await realService(async () => ({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => problem
    }))

    const refusal = await service
      .createTransporter(ORG, { ...QUICK_HAULAGE, name: '' })
      .catch((error) => error)

    const [url, options] = fetched.mock.calls[0]
    expect(url).toBe(`${SERVICE_URL}${TRANSPORTERS_PATH}`)
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toMatchObject({ townOrCity: 'Dover' })
    expect(service.isValidationFailure(refusal)).toBe(true)
    expect(service.mapApiErrorsToFormErrors(refusal.body)).toEqual({
      name: 'Enter the transporter’s name'
    })
  })

  it('Should answer undefined for a transporter the API does not have', async () => {
    const { service } = await realService(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    }))

    expect(await service.getTransporter(ORG, 'nobody')).toBeUndefined()
    expect(await service.deleteTransporter(ORG, 'nobody')).toBe(false)
  })

  it('Should DELETE by id and raise on an outage', async () => {
    const { service, fetched } = await realService(async (_url, options) =>
      options.method === 'DELETE'
        ? okResponse(undefined, 204)
        : { ok: false, status: 503, statusText: 'Service Unavailable' }
    )

    expect(await service.deleteTransporter(ORG, COPPERFIELD)).toBe(true)
    expect(fetched.mock.calls[0][0]).toBe(
      `${SERVICE_URL}${TRANSPORTERS_PATH}/${COPPERFIELD}`
    )
    await expect(service.getTransporter(ORG, COPPERFIELD)).rejects.toThrow(
      'Failed to get transporter: 503 Service Unavailable'
    )
  })

  it('Should refuse to call the API without an organisation', async () => {
    const { service, fetched } = await realService(async () => okResponse({}))

    await expect(service.listTransporters(undefined)).rejects.toThrow(
      /without an organisation/
    )
    expect(fetched).not.toHaveBeenCalled()
  })
})

describe('what it says it needs', () => {
  it('Should name the real service it stands in for, and its contract, in contract.json', () => {
    expect(CONTRACT.needsARealService).toMatch(/transporter register/)
    expect(CONTRACT).toMatchObject({
      service: 'transporters',
      owner: 'new-api',
      baseUrlEnv: 'TRADE_IMPORTS_TRANSPORTERS_URL'
    })
    expect(CONTRACT.operations.map(({ name }) => name)).toEqual([
      'listTransporters',
      'getTransporter',
      'createTransporter',
      'deleteTransporter'
    ])
  })

  it('Should export neither CONTRACT nor NEEDS_A_REAL_SERVICE from index.js', () => {
    expect(transporters.CONTRACT).toBeUndefined()
    expect(transporters.NEEDS_A_REAL_SERVICE).toBeUndefined()
  })
})
