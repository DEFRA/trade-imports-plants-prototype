import { describe, expect, it } from 'vitest'

import * as commodityTypeController from '../commodity-type/controller.js'
import {
  driveHandler,
  expectOneRefusalLogged,
  postHandlerOf
} from '../../../../../../engine/test-support.js'
import { hubPath } from '../../../../../../shared/paths.js'
import {
  COMPLETE_PLANTS_NOTIFICATION,
  useStubbedHighRiskPlantsJourney
} from '../../test-support.js'
import {
  copied,
  describeAddressBookPickerController
} from '../address-book-picker/controller-test-support.js'
import { copy } from './copy/copy.en.js'
import * as consignor from './controller.js'

const get = consignor.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(consignor)

const PLANTS_FOR_PLANTING = 'plants-for-planting'
const CONSIGNOR_SELECT = 'consignor-select'
const TECH_IMPORTS = 'tech-imports-ltd'
const EDITED_NAME = 'Tech Imports (UK) Ltd'

const plants = (answers = {}) => ({
  commodityType: PLANTS_FOR_PLANTING,
  ...answers
})

describe('#meta', () => {
  it('Should own the consignor-select obligation at its own slug', () => {
    expect(consignor.meta).toEqual({
      id: CONSIGNOR_SELECT,
      slug: 'consignors/select',
      collects: ['consignor']
    })
  })
})

describe('GET consignor-select — the question it asks', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should title and head the page Consignor and caption the consignment parties section', async () => {
    const result = await driveHandler(get, { seed: plants() })

    expect(result.view.context.pageTitle).toBe('Consignor')
    expect(result.view.context.heading).toBe('Consignor')
    expect(result.view.context.caption).toBe('Consignment parties')
  })
})

describeAddressBookPickerController({
  pickerName: CONSIGNOR_SELECT,
  template:
    'high-risk-plants/journeys/linear/features/address-book-picker/template.njk',
  get,
  post,
  seed: plants,
  previousStep: {
    slug: 'destinations/select',
    seed: COMPLETE_PLANTS_NOTIFICATION
  },
  fieldName: 'consignor',
  errorText: copy.errors.consignor
})

describe('GET consignor-select — the address this notification holds', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should show the copy, as edited, with a link to edit its details', async () => {
    const edited = { ...copied(TECH_IMPORTS), name: EDITED_NAME }

    const result = await driveHandler(get, {
      seed: plants({ consignor: edited }),
      query: { change: '1' }
    })

    expect(result.view.context.heldCopy).toEqual({
      title: 'Current consignor',
      name: EDITED_NAME,
      summary: '18 Dockside Road, London, E14 9GE, United Kingdom',
      editDetails: 'Edit details',
      editHref: `${hubPath(result.journeyId)}/consignors/edit?return=consignors%2Fselect&change=1`
    })
  })

  it('Should show no current address before one is picked', async () => {
    const result = await driveHandler(get, { seed: plants() })

    expect(result.view.context.heldCopy).toBeNull()
  })
})

describe('consignor scope', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should purge the reference on switching to potatoes and not restore it on switching back', async () => {
    const changed = await driveHandler(postHandlerOf(commodityTypeController), {
      seed: plants({ consignor: copied(TECH_IMPORTS) }),
      payload: { commodityType: 'potatoes' }
    })
    expect(changed.after.consignor).toBeUndefined()
    const restored = await driveHandler(
      postHandlerOf(commodityTypeController),
      {
        seed: changed.after,
        payload: { commodityType: PLANTS_FOR_PLANTING }
      }
    )
    expect(restored.after.consignor).toBeUndefined()
  })

  it('Should neither render nor commit a consignor for potatoes', async () => {
    const seed = { commodityType: 'potatoes' }
    const rendered = await driveHandler(get, { seed })
    expect(rendered.response.redirect).toBe(hubPath(rendered.journeyId))
    const saved = await driveHandler(post, {
      seed,
      payload: { consignor: TECH_IMPORTS }
    })
    expect(saved.after.consignor).toBeUndefined()
    expect(saved.response.redirect).toBe(hubPath(saved.journeyId))
  })

  it.each([
    ['GET', get, undefined],
    ['POST', post, { consignor: TECH_IMPORTS }]
  ])(
    'Should log the redirect once with the journey id and reason on a potato notification %s',
    async (_method, handler, payload) => {
      const result = await driveHandler(handler, {
        seed: { commodityType: 'potatoes' },
        payload
      })

      expectOneRefusalLogged(result.logger, {
        journeyId: result.journeyId,
        errorCodes: [],
        reason: 'consignor-out-of-scope'
      })
    }
  )
})
