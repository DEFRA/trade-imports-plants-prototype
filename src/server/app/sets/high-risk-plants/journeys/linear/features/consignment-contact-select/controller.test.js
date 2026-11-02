import { describe, expect, it } from 'vitest'

import { hubPath } from '../../../../../../shared/paths.js'
import {
  COMPLETE_PLANTS_NOTIFICATION,
  useStubbedHighRiskPlantsJourney
} from '../../test-support.js'
import {
  driveHandler,
  postHandlerOf
} from '../../../../../../engine/test-support.js'
import {
  copied,
  describeAddressBookPickerController
} from '../address-book-picker/controller-test-support.js'
import { copy } from './copy/copy.en.js'
import * as contact from './controller.js'

const get = contact.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(contact)

const PLANTS_FOR_PLANTING = 'plants-for-planting'
const TECH_IMPORTS = 'tech-imports-ltd'
const TECH_IMPORTS_NAME = 'Tech Imports Ltd'

const plants = (answers = {}) => ({
  commodityType: PLANTS_FOR_PLANTING,
  ...answers
})

describe('#meta', () => {
  it('Should own the contactAddress obligation at its own slug', () => {
    expect(contact.meta).toEqual({
      id: 'consignment-contact-select',
      slug: 'consignment/contact/select',
      collects: ['contactAddress']
    })
  })
})

describe('GET contact — the question it asks', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should title the page, head it with the question and render no caption', async () => {
    const result = await driveHandler(get, { seed: plants() })

    expect(result.view.context.pageTitle).toBe(copy.title)
    expect(result.view.context.heading).toBe(copy.title)
    expect(result.view.context.description).toBe(copy.description)
    expect(result.view.context.caption).toBeUndefined()
  })
})

describeAddressBookPickerController({
  pickerName: 'contact',
  template:
    'high-risk-plants/journeys/linear/features/address-book-picker/template.njk',
  get,
  post,
  seed: plants,
  previousStep: {
    slug: 'identification-numbers',
    seed: COMPLETE_PLANTS_NOTIFICATION
  },
  fieldName: 'contactAddress',
  errorText: copy.errors.contactAddress
})

describe('POST contact — what it commits', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should commit the chosen record’s name, contact details and address', async () => {
    const result = await driveHandler(post, {
      seed: plants(),
      payload: { action: 'save', contactAddress: TECH_IMPORTS }
    })

    expect(result.after.contactAddress).toEqual({
      pickedFromId: TECH_IMPORTS,
      name: TECH_IMPORTS_NAME,
      phone: '01632 960000',
      email: 'tech-imports-ltd@example.com',
      address: {
        addressLine1: '18 Dockside Road',
        townOrCity: 'London',
        postcode: 'E14 9GE',
        countryCode: 'GB'
      }
    })
  })
})

describe('GET contact — the address this notification holds', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should show the copy held with a link to edit its details', async () => {
    const result = await driveHandler(get, {
      seed: plants({ contactAddress: copied(TECH_IMPORTS) })
    })

    expect(result.view.context.heldCopy).toMatchObject({
      title: 'Current contact address',
      name: TECH_IMPORTS_NAME,
      editHref: `${hubPath(result.journeyId)}/consignment/contact/edit?return=consignment%2Fcontact%2Fselect`
    })
  })
})
