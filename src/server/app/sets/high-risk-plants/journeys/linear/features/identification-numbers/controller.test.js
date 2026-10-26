import { describe, expect, it } from 'vitest'

import {
  driveHandler,
  expectBackLinkIsPage,
  expectNoRefusalLogged,
  postHandlerOf,
  unavailableBackendError
} from '../../../../../../engine/test-support.js'
import { hubPath } from '../../../../../../shared/paths.js'
import { RUN_ACTIVE } from '../../../../../../flow/run-state.js'
import {
  COMPLETE_NOTIFICATION,
  COMPLETE_PLANTS_NOTIFICATION,
  useStubbedHighRiskPlantsJourney
} from '../../test-support.js'
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
  useStubbedHighRiskPlantsJourney()
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
  it('Should send Back to the consignor for plants or wood while the opening run is on', async () => {
    const result = await driveHandler(get, {
      seed: COMPLETE_PLANTS_NOTIFICATION,
      openingRun: RUN_ACTIVE
    })
    expectBackLinkIsPage(result, 'consignors/select')
  })
  it('Should send Back to the place of destination for potatoes while the opening run is on', async () => {
    const result = await driveHandler(get, {
      seed: COMPLETE_NOTIFICATION,
      openingRun: RUN_ACTIVE
    })
    expectBackLinkIsPage(result, 'destinations/select')
  })
  it('Should keep Back on the consignor when the page is shown again after a refusal in the run', async () => {
    const result = await driveHandler(post, {
      seed: COMPLETE_PLANTS_NOTIFICATION,
      payload: { supplierIdentificationNumber: '' },
      openingRun: RUN_ACTIVE
    })
    expect(result.response.statusCode).toBe(400)
    expectBackLinkIsPage(result, 'consignors/select')
  })
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
      expectNoRefusalLogged(result.logger)
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
  it('Should save a blank mandatory number and go to the overview on Save and return to overview', async () => {
    const result = await driveHandler(post, {
      seed: { commodityType: 'potatoes' },
      payload: { exit: 'hub' }
    })
    expect(result.response.redirect).toBe(hubPath(result.journeyId))
    expect(result.after.producerIdentificationNumber).toBe('')
    expect(result.after.cropIdentificationNumber).toBe('')
  })
  it('Should still refuse an over-long number on Save and return to overview', async () => {
    const result = await driveHandler(post, {
      seed: { commodityType: 'potatoes' },
      payload: { producerIdentificationNumber: 'x'.repeat(59), exit: 'hub' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.producerIdentificationNumber).toBe(
      copy.errors.producerIdentificationNumber.maxLength
    )
    expect(result.after).toEqual(result.before)
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
  useStubbedHighRiskPlantsJourney()

  it('Should re-render a backend request failure at 500 with the banner and the value', async () => {
    const failure = unavailableBackendError('save answers')

    const result = await driveHandler(post, {
      saveFailure: failure,
      seed: { commodityType: WOOD_AND_CUT_TREES },
      payload: { consignmentNumber: 'REF' }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.view.context.values).toEqual({ consignmentNumber: 'REF' })
  })

  it('Should let a programming error escape to the promoted catch-all', async () => {
    await expect(
      driveHandler(post, {
        saveFailure: new TypeError('programming failure'),
        seed: { commodityType: WOOD_AND_CUT_TREES },
        payload: { consignmentNumber: 'REF' }
      })
    ).rejects.toThrow(new TypeError('programming failure'))
  })
})
