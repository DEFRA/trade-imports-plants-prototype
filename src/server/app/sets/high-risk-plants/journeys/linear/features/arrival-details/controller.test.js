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
import { validatorDefaults } from '../../../../../../shared/copy.en.js'
import {
  COMPLETE_NOTIFICATION,
  COMPLETE_PLANTS_NOTIFICATION,
  useStubbedHighRiskPlantsJourney
} from '../../test-support.js'
import { ALREADY_ARRIVED, NOT_YET_ARRIVED } from '../arrival-status/statuses.js'
import { copy } from './copy/copy.en.js'
import * as arrivalDetails from './controller.js'

const get = arrivalDetails.routes.find(
  (route) => route.method === 'GET'
).handler
const post = postHandlerOf(arrivalDetails)

const PLANTS_FOR_PLANTING = 'plants-for-planting'
const POTATOES = 'potatoes'
const DOVER = 'GB DVR'
const A_DATE = '27/3/2026'
const A_DATE_PARTS = { day: '27', month: '3', year: '2026' }
const A_TIME = '14:30'

const potatoes = (answers = {}) => ({ commodityType: POTATOES, ...answers })

const plants = (answers = {}) => ({
  commodityType: PLANTS_FOR_PLANTING,
  ...answers
})

const potatoPayload = (overrides = {}) => ({
  arrivalDate: A_DATE,
  arrivalTime: A_TIME,
  proposedPlaceOfLanding: DOVER,
  ...overrides
})

describe('#meta', () => {
  it('Should own the three arrival-details obligations', () => {
    expect(arrivalDetails.meta).toEqual({
      id: 'arrival-details',
      slug: 'arrival-details',
      collects: ['arrivalDate', 'arrivalTime', 'proposedPlaceOfLanding']
    })
  })
})

describe('GET arrival-details — the question it asks', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should title the page and caption the arrival section', async () => {
    const result = await driveHandler(get, { seed: potatoes() })

    expect(result.view.context.pageTitle).toBe('Arrival details')
    expect(result.view.context.caption).toBe('Arrival')
  })

  it('Should ask potatoes for the expected date of arrival', async () => {
    const result = await driveHandler(get, { seed: potatoes() })

    expect(result.view.context.dateField.label.text).toBe(
      copy.dateLabels.potatoes
    )
    expect(result.view.context.dateField.hint.text).toBe(
      copy.dateHints.potatoes
    )
  })

  it('Should ask a consignment on its way for the expected date of landing', async () => {
    const result = await driveHandler(get, {
      seed: plants({ arrivalStatus: NOT_YET_ARRIVED })
    })

    expect(result.view.context.dateField.label.text).toBe(
      copy.dateLabels['not-yet-arrived']
    )
  })

  it('Should ask a consignment already here when it first arrived', async () => {
    const result = await driveHandler(get, {
      seed: plants({ arrivalStatus: ALREADY_ARRIVED })
    })

    expect(result.view.context.dateField.label.text).toBe(
      copy.dateLabels['already-arrived']
    )
  })

  it('Should ask the pre-arrival question when no status has been chosen', async () => {
    const result = await driveHandler(get, { seed: plants() })

    expect(result.view.context.dateField.label.text).toBe(
      copy.dateLabels['not-yet-arrived']
    )
  })

  it.each([
    ['potatoes', potatoes()],
    ['a consignment on its way', plants({ arrivalStatus: NOT_YET_ARRIVED })],
    ['a consignment already here', plants({ arrivalStatus: ALREADY_ARRIVED })]
  ])(
    'Should set the date label in the medium GOV.UK label size for %s',
    async (_state, seed) => {
      const result = await driveHandler(get, { seed })

      expect(result.view.context.dateField.label.classes).toBe('govuk-label--m')
      expect(result.view.context.questionLabelClasses).toBe('govuk-label--m')
    }
  )

  it('Should cap the picker at today only for a consignment already here', async () => {
    const arrived = await driveHandler(get, {
      seed: plants({ arrivalStatus: ALREADY_ARRIVED })
    })
    const onItsWay = await driveHandler(get, {
      seed: plants({ arrivalStatus: NOT_YET_ARRIVED })
    })

    expect(arrived.view.context.dateField.maxDate).toMatch(
      /^\d{1,2}\/\d{1,2}\/\d{4}$/
    )
    expect(onItsWay.view.context.dateField.maxDate).toBeUndefined()
  })

  it('Should never set a lower bound, so a late notification can be made', async () => {
    const result = await driveHandler(get, {
      seed: plants({ arrivalStatus: ALREADY_ARRIVED })
    })

    expect(result.view.context.dateField.minDate).toBeUndefined()
  })
})

describe('GET arrival-details — the potato-only fields', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should show the time and the place of landing on a potato notification', async () => {
    const result = await driveHandler(get, { seed: potatoes() })

    expect(result.view.context.showPotatoFields).toBe(true)
    expect(result.view.context.values).toEqual({
      arrivalDate: '',
      arrivalTime: '',
      proposedPlaceOfLanding: ''
    })
  })

  it('Should hide both on a plants notification', async () => {
    const result = await driveHandler(get, { seed: plants() })

    expect(result.view.context.showPotatoFields).toBe(false)
    expect(result.view.context.values).toEqual({ arrivalDate: '' })
  })

  it('Should offer the ports the service holds behind the select text', async () => {
    const result = await driveHandler(get, { seed: potatoes() })

    const [selectText, ...ports] = result.view.context.portItems
    expect(selectText).toEqual({
      value: '',
      text: copy.placeOfLanding.selectText
    })
    expect(ports).toContainEqual({
      value: DOVER,
      text: 'Port of Dover - GB DVR'
    })
  })

  it('Should prefill every stored answer', async () => {
    const result = await driveHandler(get, {
      seed: potatoes({
        arrivalDate: A_DATE_PARTS,
        arrivalTime: A_TIME,
        proposedPlaceOfLanding: DOVER
      })
    })

    expect(result.view.context.values).toEqual({
      arrivalDate: A_DATE_PARTS,
      arrivalTime: A_TIME,
      proposedPlaceOfLanding: DOVER
    })
    expect(result.view.context.dateField.value).toBe(A_DATE)
  })

  it('Should send Back to the overview when the page is opened from the overview', async () => {
    const result = await driveHandler(get, { seed: potatoes() })

    expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
    expect(result.view.context.errorSummary).toBeNull()
  })

  it('Should send Back to arrival status for plants or wood while the opening run is on', async () => {
    const result = await driveHandler(get, {
      seed: COMPLETE_PLANTS_NOTIFICATION,
      openingRun: RUN_ACTIVE
    })

    expectBackLinkIsPage(result, 'arrival-status')
  })

  it('Should send Back to origin for potatoes while the opening run is on', async () => {
    const result = await driveHandler(get, {
      seed: COMPLETE_NOTIFICATION,
      openingRun: RUN_ACTIVE
    })

    expectBackLinkIsPage(result, 'origin')
  })

  it('Should keep Back on origin when the page is shown again after a refusal in the run', async () => {
    const result = await driveHandler(post, {
      seed: COMPLETE_NOTIFICATION,
      payload: potatoPayload({ arrivalDate: '' }),
      openingRun: RUN_ACTIVE
    })

    expect(result.response.statusCode).toBe(400)
    expectBackLinkIsPage(result, 'origin')
  })
})

describe('GET arrival-details — amend with a stored port the reader no longer offers', () => {
  const STALE_PORT = 'GB ZZZ'

  useStubbedHighRiskPlantsJourney()

  it('Should blank the port in values so the select renders unselected under potatoes', async () => {
    const result = await driveHandler(get, {
      seed: potatoes({ proposedPlaceOfLanding: STALE_PORT })
    })

    expect(result.view.context.showPotatoFields).toBe(true)
    expect(result.view.context.values.proposedPlaceOfLanding).toBe('')
    expect(
      result.view.context.portItems.find((item) => item.value === STALE_PORT)
    ).toBeUndefined()
  })

  it('Should surface a port-no-longer-available error on the port field under potatoes', async () => {
    const result = await driveHandler(get, {
      seed: potatoes({ proposedPlaceOfLanding: STALE_PORT })
    })

    expect(result.view.context.errors.proposedPlaceOfLanding).toBe(
      'The saved port of landing is no longer available. Select a port from the list.'
    )
  })

  it('Should surface no port error under a non-potato commodity where the field is not asked', async () => {
    const result = await driveHandler(get, {
      seed: plants({ proposedPlaceOfLanding: STALE_PORT })
    })

    expect(result.view.context.showPotatoFields).toBe(false)
    expect(result.view.context.errors.proposedPlaceOfLanding).toBeUndefined()
  })

  it('Should leave the stored port intact — GET only reshapes what the page renders', async () => {
    const result = await driveHandler(get, {
      seed: potatoes({ proposedPlaceOfLanding: STALE_PORT })
    })

    expect(result.before.proposedPlaceOfLanding).toBe(STALE_PORT)
    expect(result.after.proposedPlaceOfLanding).toBe(STALE_PORT)
  })
})

describe('POST arrival-details — the answers it refuses', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should refuse a missing date', async () => {
    const result = await driveHandler(post, {
      seed: plants(),
      payload: {}
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.arrivalDate).toBe(
      copy.errors.arrivalDate.required
    )
    expect(result.after.arrivalDate).toBeUndefined()
    expectNoRefusalLogged(result.logger)
  })

  it('Should refuse a date that is not a real day', async () => {
    const result = await driveHandler(post, {
      seed: plants(),
      payload: { arrivalDate: '31/2/2026' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.arrivalDate).toBe(
      copy.errors.arrivalDate.invalid
    )
  })

  it('Should refuse a two-digit year rather than reading it as the year 26', async () => {
    const result = await driveHandler(post, {
      seed: plants({ arrivalStatus: ALREADY_ARRIVED }),
      payload: { arrivalDate: '27/3/26' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.arrivalDate).toBe(
      copy.errors.arrivalDate.invalid
    )
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: copy.errors.arrivalDate.invalid, href: '#arrivalDate' }
    ])
    expect(result.after.arrivalDate).toBeUndefined()
  })

  it('Should refuse a future date once the consignment has arrived', async () => {
    const result = await driveHandler(post, {
      seed: plants({ arrivalStatus: ALREADY_ARRIVED }),
      payload: { arrivalDate: '1/1/2099' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.arrivalDate).toBe(
      copy.errors.arrivalDate.inFuture
    )
  })

  it('Should accept a past date, because a late notification is not refused', async () => {
    const result = await driveHandler(post, {
      seed: plants({ arrivalStatus: ALREADY_ARRIVED }),
      payload: { arrivalDate: '1/1/2020' }
    })

    expect(result.after.arrivalDate).toEqual({
      day: '1',
      month: '1',
      year: '2020'
    })
  })

  it('Should accept a future date while the consignment is still on its way', async () => {
    const result = await driveHandler(post, {
      seed: plants({ arrivalStatus: NOT_YET_ARRIVED }),
      payload: { arrivalDate: '1/1/2099' }
    })

    expect(result.after.arrivalDate).toEqual({
      day: '1',
      month: '1',
      year: '2099'
    })
  })

  it('Should refuse a missing time on a potato notification', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: potatoPayload({ arrivalTime: '' })
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.arrivalTime).toBe(copy.errors.arrivalTime)
  })

  it('Should refuse a time that is not on the 24-hour clock', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: potatoPayload({ arrivalTime: '2.30pm' })
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.arrivalTime).toBe(validatorDefaults.time)
  })

  it('Should refuse an hour or minute outside the clock', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: potatoPayload({ arrivalTime: '24:00' })
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.after.arrivalTime).toBeUndefined()
  })

  it('Should refuse a place of landing the ports service does not hold', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: potatoPayload({ proposedPlaceOfLanding: 'GB ZZZ' })
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.proposedPlaceOfLanding).toBe(
      copy.errors.proposedPlaceOfLanding
    )
  })

  it('Should re-render every refused value rather than dropping them', async () => {
    const payload = potatoPayload({
      arrivalDate: 'nonsense',
      arrivalTime: '2.30pm'
    })
    const result = await driveHandler(post, { seed: potatoes(), payload })

    expect(result.view.context.values).toEqual({
      arrivalDate: 'nonsense',
      arrivalTime: '2.30pm',
      proposedPlaceOfLanding: DOVER
    })
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: copy.errors.arrivalDate.invalid, href: '#arrivalDate' },
      { text: validatorDefaults.time, href: '#arrivalTime' }
    ])
  })

  it('Should ask a plants notification for nothing but the date', async () => {
    const result = await driveHandler(post, {
      seed: plants(),
      payload: { arrivalDate: A_DATE }
    })

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after.arrivalTime).toBeUndefined()
  })
})

describe('POST arrival-details — accepted answers', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should commit the date as its parts, not as the typed text', async () => {
    const result = await driveHandler(post, {
      seed: plants({ arrivalStatus: NOT_YET_ARRIVED }),
      payload: { arrivalDate: A_DATE }
    })

    expect(result.after.arrivalDate).toEqual(A_DATE_PARTS)
  })

  it('Should commit all three answers on a potato notification', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: potatoPayload()
    })

    expect(result.after).toEqual({
      commodityType: POTATOES,
      arrivalDate: A_DATE_PARTS,
      arrivalTime: A_TIME,
      proposedPlaceOfLanding: DOVER
    })
  })

  it('Should commit no hidden potato answer a plants notification sends', async () => {
    const result = await driveHandler(post, {
      seed: plants(),
      payload: potatoPayload()
    })

    expect(result.after.arrivalTime).toBeUndefined()
    expect(result.after.proposedPlaceOfLanding).toBeUndefined()
  })

  it('Should redirect to the overview, the page after the arrival section', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: potatoPayload()
    })

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
  })

  it('Should honour Save and return to overview', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: { ...potatoPayload(), exit: 'hub' }
    })

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after.arrivalTime).toBe(A_TIME)
  })
})

describe('POST arrival-details — Save and return to overview', () => {
  useStubbedHighRiskPlantsJourney()

  const exitWith = (seed, payload) =>
    driveHandler(post, { seed, payload: { ...payload, exit: 'hub' } })

  it('Should save an empty potato page and go to the overview', async () => {
    const result = await exitWith(potatoes(), {})

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after.arrivalDate).toEqual({ day: '', month: '', year: '' })
    expect(result.after.arrivalTime).toBe('')
  })

  it('Should save a blank date for a consignment already here', async () => {
    const result = await exitWith(plants({ arrivalStatus: ALREADY_ARRIVED }), {
      arrivalDate: ''
    })

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after.arrivalDate).toEqual({ day: '', month: '', year: '' })
    expect(result.after.commodityType).toBe(PLANTS_FOR_PLANTING)
    expect(result.after.arrivalStatus).toBe(ALREADY_ARRIVED)
  })

  it('Should still refuse a time that is not on the 24-hour clock', async () => {
    const result = await exitWith(
      potatoes(),
      potatoPayload({ arrivalTime: '25:00' })
    )

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.arrivalTime).toBe(validatorDefaults.time)
    expect(result.after).toEqual(result.before)
  })

  it('Should still refuse a date that names no day', async () => {
    const result = await exitWith(potatoes(), {
      arrivalDate: '31/2/2026'
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.arrivalDate).toBe(
      copy.errors.arrivalDate.invalid
    )
  })

  it('Should still refuse a future date once the consignment has arrived', async () => {
    const result = await exitWith(plants({ arrivalStatus: ALREADY_ARRIVED }), {
      arrivalDate: '1/1/2099'
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.arrivalDate).toBe(
      copy.errors.arrivalDate.inFuture
    )
  })

  it('Should still refuse a place of landing the ports service does not hold', async () => {
    const result = await exitWith(
      potatoes(),
      potatoPayload({ proposedPlaceOfLanding: 'XX XXX' })
    )

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.proposedPlaceOfLanding).toBe(
      copy.errors.proposedPlaceOfLanding
    )
  })

  it('Should keep naming every missing answer on Save and continue', async () => {
    const result = await driveHandler(post, { seed: potatoes(), payload: {} })

    expect(result.response.statusCode).toBe(400)
    expect(Object.keys(result.view.context.errors)).toEqual([
      'arrivalDate',
      'arrivalTime',
      'proposedPlaceOfLanding'
    ])
  })
})

describe('POST arrival-details — save failures', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should re-render a backend request failure at 500 with the banner and the values', async () => {
    const failure = unavailableBackendError('save answers')

    const result = await driveHandler(post, {
      saveFailure: failure,
      payload: { arrivalDate: A_DATE }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.view.context.values.arrivalDate).toBe(A_DATE)
  })

  it('Should let a programming error escape to the promoted catch-all', async () => {
    await expect(
      driveHandler(post, {
        payload: { arrivalDate: A_DATE },
        saveFailure: new TypeError('programming failure')
      })
    ).rejects.toThrow(new TypeError('programming failure'))
  })
})
