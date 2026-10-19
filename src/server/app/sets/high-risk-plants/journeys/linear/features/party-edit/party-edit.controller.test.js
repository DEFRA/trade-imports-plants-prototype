import { SET_ID } from '../../../../set.js'
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
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../engine/test-support.js'
import * as state from '../../../../../../engine/index.js'
import * as addressBook from '../../../../../../services/address-book/index.js'
import * as countries from '../../../../../../services/countries/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../lib/http-status.js'
import { BackendRequestError } from '../../../../../../services/persistence/records/errors.js'
import { pagePath } from '../../../../../../shared/paths.js'
import { installHighRiskPlantsJourney } from '../../test-support.js'
import { PARTIES, partyOf } from '../../parties/index.js'
import * as partyEdit from './party-edit.controller.js'

const REVIEW_SLUG = 'notification-view'

// The consignor is asked of plants and wood alone; the other two of every type.
const IN_SCOPE = { commodityType: 'plants-for-planting' }

const STORED = {
  name: 'Northgate Trading AG',
  phone: '01632 960000',
  email: 'northgate@example.com',
  address: {
    addressLine1: '43 East Hague Extension',
    addressLine2: '',
    townOrCity: 'Bern',
    county: '',
    postcode: '30055',
    countryCode: 'CH'
  }
}

const FORM = {
  name: 'Northgate Trading GmbH',
  addressLine1: '45 East Hague Extension',
  addressLine2: 'Floor 2',
  townOrCity: 'Bern',
  county: 'Bern',
  postcode: '30056',
  countryCode: 'CH',
  phone: '01632 960001',
  email: 'office@northgate.example.com'
}

// US sits outside the SPS origin block but is in the address book's list.
const ADDRESS_BOOK_COUNTRIES = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' }
]

const handlerFor = (method, party) =>
  partyEdit.routes.find(
    (route) => route.method === method && route.path.endsWith(party.editSlug)
  ).handler

const configure = () => {
  configureRecords(SET_ID, recordsStub)
  configureSession(SET_ID, sessionStub)
  installHighRiskPlantsJourney()
}

describe.each(PARTIES)('Edit $id address details', (party) => {
  beforeAll(configure)
  beforeEach(() => store.clear())
  afterEach(() => vi.restoreAllMocks())

  const get = handlerFor('GET', party)
  const post = handlerFor('POST', party)
  const seed = { ...IN_SCOPE, [party.id]: STORED }

  it('Should pre-fill the form from the copy held on the notification', async () => {
    const result = await driveHandler(get, { seed })
    const { values, partyTitle } = result.view.context

    expect(partyTitle).toBe(party.title)
    expect(values).toEqual({
      name: 'Northgate Trading AG',
      addressLine1: '43 East Hague Extension',
      addressLine2: '',
      townOrCity: 'Bern',
      county: '',
      postcode: '30055',
      countryCode: 'CH',
      phone: '01632 960000',
      email: 'northgate@example.com'
    })
  })

  it('Should send the trader to pick an address when none has been copied yet', async () => {
    const result = await driveHandler(get, { seed: IN_SCOPE })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, party.slug)
    })
  })

  it('Should send the trader to pick an address, saving nothing, when a save arrives with no copy', async () => {
    const result = await driveHandler(post, {
      seed: IN_SCOPE,
      payload: FORM,
      query: { change: '1' }
    })

    expect(result.response).toEqual({
      redirect: `${pagePath(result.journeyId, party.slug)}?change=1`
    })
    expect(result.after[party.id]).toBeUndefined()
  })

  it('Should save the edited copy and return to where the trader came from', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: FORM,
      query: { return: REVIEW_SLUG }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, REVIEW_SLUG)
    })
    expect(result.after[party.id]).toEqual({
      name: 'Northgate Trading GmbH',
      phone: '01632 960001',
      email: 'office@northgate.example.com',
      address: {
        addressLine1: '45 East Hague Extension',
        addressLine2: 'Floor 2',
        townOrCity: 'Bern',
        county: 'Bern',
        postcode: '30056',
        countryCode: 'CH'
      }
    })
  })

  it('Should forget which record the copy was picked from, so the picker no longer pre-selects it', async () => {
    const result = await driveHandler(post, {
      seed: {
        ...seed,
        [party.id]: { ...STORED, pickedFromId: 'tech-imports-ltd' }
      },
      payload: FORM
    })

    expect(result.after[party.id]).not.toHaveProperty('pickedFromId')
  })

  it('Should change only this notification, never the address book', async () => {
    const partySpy = vi.spyOn(addressBook, 'party')
    const searchSpy = vi.spyOn(addressBook, 'search')

    await driveHandler(post, { seed, payload: FORM })

    expect(partySpy).not.toHaveBeenCalled()
    expect(searchSpy).not.toHaveBeenCalled()
  })

  it('Should re-render with the address-book error messages and save nothing', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: { ...FORM, postcode: '', email: 'not-an-email' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      postcode: 'Enter a postcode',
      email: 'Enter an email address in the correct format'
    })
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: 'Enter a postcode', href: '#postcode' },
      {
        text: 'Enter an email address in the correct format',
        href: '#email'
      }
    ])
    expect(result.view.context.values.postcode).toBe('')
    expect(result.after[party.id]).toEqual(STORED)
  })

  it('Should leave the copy unchanged on Cancel and return to the picker', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: { ...FORM, cancel: 'true' }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, party.slug)
    })
    expect(result.after[party.id]).toEqual(STORED)
  })
})

describe('Edit address details — where the trader returns to', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())
  afterEach(() => vi.restoreAllMocks())

  const consignor = partyOf('consignor')
  const get = handlerFor('GET', consignor)
  const post = handlerFor('POST', consignor)
  const seed = { ...IN_SCOPE, consignor: STORED }

  it('Should point Back at the page named in the return parameter', async () => {
    const result = await driveHandler(get, {
      seed,
      query: { return: REVIEW_SLUG }
    })

    expect(result.view.context.backLink).toBe(
      pagePath(result.journeyId, REVIEW_SLUG)
    )
  })

  it('Should keep the change context on the way back to the picker', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: FORM,
      query: { return: consignor.slug, change: '1' }
    })

    expect(result.response).toEqual({
      redirect: `${pagePath(result.journeyId, consignor.slug)}?change=1`
    })
  })

  it('Should ignore a return parameter that is not one of its own pages', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: FORM,
      query: { return: 'https://example.com/elsewhere' }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, consignor.slug)
    })
  })

  it('Should send a potato notification, which has no consignor, back to the picker', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: 'potatoes', consignor: STORED }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, consignor.slug)
    })
  })

  it('Should accept a country the address book allows outside the SPS origin block', async () => {
    vi.spyOn(countries, 'addressBookCountries').mockResolvedValue(
      ADDRESS_BOOK_COUNTRIES
    )

    const result = await driveHandler(post, {
      seed,
      payload: { ...FORM, countryCode: 'US' }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, consignor.slug)
    })
    expect(result.after.consignor.address.countryCode).toBe('US')
  })

  it('Should offer the address-book country list on the form', async () => {
    vi.spyOn(countries, 'addressBookCountries').mockResolvedValue(
      ADDRESS_BOOK_COUNTRIES
    )

    const result = await driveHandler(get, { seed })

    expect(result.view.context.countryItems).toContainEqual({
      value: 'US',
      text: 'United States'
    })
  })

  it('Should re-render the form when saving fails', async () => {
    vi.spyOn(state, 'commit').mockRejectedValue(
      new BackendRequestError('save answers', {
        status: 503,
        statusText: 'Service Unavailable'
      })
    )

    const result = await driveHandler(post, { seed, payload: FORM })

    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after.consignor).toEqual(STORED)
  })
})
