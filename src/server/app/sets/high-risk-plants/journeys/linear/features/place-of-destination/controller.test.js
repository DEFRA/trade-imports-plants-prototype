import { describe, expect, it } from 'vitest'

import { hubPath } from '../../../../../../shared/paths.js'
import {
  COMPLETE_NOTIFICATION,
  useStubbedHighRiskPlantsJourney
} from '../../test-support.js'
import {
  driveHandler,
  postHandlerOf
} from '../../../../../../engine/test-support.js'
import { ALREADY_ARRIVED, NOT_YET_ARRIVED } from '../arrival-status/statuses.js'
import {
  copied,
  describeAddressBookPickerController
} from '../address-book-picker/controller-test-support.js'
import { copy } from './copy/copy.en.js'
import * as placeOfDestination from './controller.js'

const get = placeOfDestination.routes.find(
  (route) => route.method === 'GET'
).handler
const post = postHandlerOf(placeOfDestination)

const PLANTS_FOR_PLANTING = 'plants-for-planting'
const POTATOES = 'potatoes'
const PLACE_OF_DESTINATION_SELECT = 'place-of-destination'
const TECH_IMPORTS = 'tech-imports-ltd'

const potatoes = (answers = {}) => ({ commodityType: POTATOES, ...answers })

const plants = (answers = {}) => ({
  commodityType: PLANTS_FOR_PLANTING,
  ...answers
})

describe('#meta', () => {
  it('Should own the place-of-destination obligation at its own slug', () => {
    expect(placeOfDestination.meta).toEqual({
      id: PLACE_OF_DESTINATION_SELECT,
      slug: 'destinations/select',
      collects: ['placeOfDestination']
    })
  })
})

describe('GET place-of-destination — the question it asks', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should title the page and caption the destination section', async () => {
    const result = await driveHandler(get, { seed: potatoes() })

    expect(result.view.context.pageTitle).toBe('Place of destination')
    expect(result.view.context.caption).toBe('Destination')
  })

  it('Should ask potatoes for the place of destination', async () => {
    const result = await driveHandler(get, { seed: potatoes() })

    expect(result.view.context.heading).toBe(copy.headings.potatoes)
    expect(result.view.context.description).toBe(copy.descriptions.potatoes)
  })

  it('Should ask a consignment on its way for the place of destination', async () => {
    const result = await driveHandler(get, {
      seed: plants({ arrivalStatus: NOT_YET_ARRIVED })
    })

    expect(result.view.context.heading).toBe(copy.headings['not-yet-arrived'])
  })

  it('Should ask a consignment already here where it is now', async () => {
    const result = await driveHandler(get, {
      seed: plants({ arrivalStatus: ALREADY_ARRIVED })
    })

    expect(result.view.context.heading).toBe(copy.headings['already-arrived'])
    expect(result.view.context.description).toBe(
      copy.descriptions['already-arrived']
    )
  })

  it('Should ask the pre-arrival question when no status has been chosen', async () => {
    const result = await driveHandler(get, { seed: plants() })

    expect(result.view.context.heading).toBe(copy.headings['not-yet-arrived'])
  })
})

describeAddressBookPickerController({
  pickerName: PLACE_OF_DESTINATION_SELECT,
  template:
    'high-risk-plants/journeys/linear/features/address-book-picker/template.njk',
  get,
  post,
  seed: potatoes,
  previousStep: { slug: 'arrival-details', seed: COMPLETE_NOTIFICATION },
  fieldName: 'placeOfDestination',
  errorText: copy.errors.placeOfDestination
})

describe('GET place-of-destination — the address this notification holds', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should show the copy with a link to edit its details', async () => {
    const result = await driveHandler(get, {
      seed: potatoes({ placeOfDestination: copied(TECH_IMPORTS) })
    })

    expect(result.view.context.heldCopy).toMatchObject({
      title: 'Current place of destination',
      name: 'Tech Imports Ltd',
      editHref: `${hubPath(result.journeyId)}/destinations/edit?return=destinations%2Fselect`
    })
  })
})
