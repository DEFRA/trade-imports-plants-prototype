import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { records as realRecords } from '../../../../../../services/persistence/records/real/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  postHandlerOf
} from '../../../../../../engine/test-support.js'
import { hubPath } from '../../../../../../shared/paths.js'
import { installHighRiskPlantsJourney } from '../../test-support.js'
import { copy } from './copy/copy.en.js'
import * as identificationNumbers from './controller.js'

import * as state from '../../../../../../engine/index.js'
import { IDENTIFICATION_FIELDS } from './fields.js'
const WOOD_AND_CUT_TREES = 'wood-and-cut-trees'

const get = identificationNumbers.routes.find(
  (route) => route.method === 'GET'
).handler
const post = postHandlerOf(identificationNumbers)
const branches = [
  [
    'plants-for-planting',
    ['supplierIdentificationNumber', 'consignmentNumber']
  ],
  [
    'potatoes',
    [
      'producerIdentificationNumber',
      'cropIdentificationNumber',
      'consignmentNumber'
    ]
  ],
  [WOOD_AND_CUT_TREES, ['consignmentNumber']]
]
const payloadFor = (fields) =>
  Object.fromEntries(fields.map((name) => [name, 'ID_123']))
describe('identification numbers', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })
  beforeEach(() => store.clear())
  it.each(branches)(
    'Should prefill only the fields in scope for %s',
    async (commodityType, fields) => {
      const result = await driveHandler(get, {
        seed: { commodityType, ...payloadFor(IDENTIFICATION_FIELDS) }
      })
      expect(result.view.context.values).toEqual(payloadFor(fields))
      expect(result.view.context.fields).toEqual(fields)
      expect(result.view.context.pageTitle).toBe(copy.title)
      expect(result.view.context.caption).toBe('Consignment parties')
      expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
    }
  )
  it.each(branches)(
    'Should trim, persist and ignore hidden payload fields for %s',
    async (commodityType, fields) => {
      const result = await driveHandler(post, {
        seed: { commodityType, countryOfOrigin: 'FR' },
        payload: Object.fromEntries(
          IDENTIFICATION_FIELDS.map((name) => [name, ' ID_123 '])
        )
      })
      for (const name of IDENTIFICATION_FIELDS) {
        expect(result.after[name]).toBe(
          fields.includes(name) ? 'ID_123' : undefined
        )
      }
      expect(result.response.redirect).toBe(hubPath(result.journeyId))
    }
  )
  const required = branches
    .slice(0, 2)
    .flatMap(([commodityType, fields]) =>
      fields
        .filter((name) => name !== 'consignmentNumber')
        .map((name) => ({ commodityType, fields, name }))
    )
  for (const { commodityType, fields, name } of required) {
    it.each([
      ['', 'required'],
      [' '.repeat(3), 'required'],
      ['x'.repeat(59), 'maxLength']
    ])(`Should reject ${name} %s`, async (invalid, error) => {
      const payload = { ...payloadFor(fields), [name]: invalid }
      const result = await driveHandler(post, {
        seed: { commodityType },
        payload
      })
      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors[name]).toBe(copy.errors[name][error])
      expect(result.view.context.values).toEqual(payload)
      expect(result.after).toEqual(result.before)
    })
  }
  it.each([
    ['x'.repeat(59), 'maxLength'],
    ['bad-reference', 'pattern']
  ])(
    'Should reject an invalid optional reference %s',
    async (invalid, error) => {
      const result = await driveHandler(post, {
        seed: { commodityType: WOOD_AND_CUT_TREES },
        payload: { consignmentNumber: invalid }
      })
      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors.consignmentNumber).toBe(
        copy.errors.consignmentNumber[error]
      )
      expect(result.after).toEqual(result.before)
    }
  )
  it('Should accept a blank optional reference', async () => {
    const result = await driveHandler(post, {
      seed: { commodityType: WOOD_AND_CUT_TREES },
      payload: {}
    })
    expect(result.response.redirect).toBe(hubPath(result.journeyId))
  })
  it('Should accept the maximum length for every field', async () => {
    for (const [commodityType, fields] of branches) {
      const result = await driveHandler(post, {
        seed: { commodityType },
        payload: Object.fromEntries(
          fields.map((name) => [name, 'x'.repeat(58)])
        )
      })
      for (const name of fields) {
        expect(result.after[name]).toBe('x'.repeat(58))
      }
    }
  })
  it('Should purge conditional numbers on a type change without resurrecting them', async () => {
    const change = async (request, h) => {
      await state.commit(request, h, { commodityType: WOOD_AND_CUT_TREES })
      await state.commit(request, h, { commodityType: 'potatoes' })
      return h.redirect('/')
    }
    const result = await driveHandler(change, {
      seed: {
        commodityType: 'potatoes',
        producerIdentificationNumber: 'P1',
        cropIdentificationNumber: 'C1',
        consignmentNumber: 'REF'
      }
    })
    expect(result.after.producerIdentificationNumber).toBeUndefined()
    expect(result.after.cropIdentificationNumber).toBeUndefined()
    expect(result.after.consignmentNumber).toBe('REF')
  })
})
describe('POST identification-numbers — save failures', () => {
  beforeAll(() => {
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })

  beforeEach(() => {
    store.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      }))
    )
  })

  afterEach(() => {
    configureRecords(recordsStub)
    vi.unstubAllGlobals()
  })

  const failingOnControllerCommit = (failure) => {
    let replaceCalls = 0
    configureRecords({
      ...recordsStub,
      replaceFulfilment: (...args) => {
        replaceCalls += 1
        return replaceCalls === 1
          ? recordsStub.replaceFulfilment(...args)
          : failure(...args)
      }
    })
  }

  it('Should re-render a backend request failure at 500 with the banner and the value', async () => {
    failingOnControllerCommit(realRecords.replaceFulfilment)

    const result = await driveHandler(post, {
      seed: { commodityType: WOOD_AND_CUT_TREES },
      payload: { consignmentNumber: 'REF' }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.view.context.values).toEqual({ consignmentNumber: 'REF' })
  })

  it('Should let a programming error escape to the promoted catch-all', async () => {
    failingOnControllerCommit(async () => {
      throw new TypeError('programming failure')
    })

    await expect(
      driveHandler(post, {
        seed: { commodityType: WOOD_AND_CUT_TREES },
        payload: { consignmentNumber: 'REF' }
      })
    ).rejects.toThrow(new TypeError('programming failure'))
  })
})
