import { SET_BASE, SET_ID } from '../../../../set.js'
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
import {
  configureSession,
  openingRunCookie
} from '../../../../../../engine/persistence/session.js'
import { RUN_ACTIVE, RUN_COMPLETE } from '../../../../../../flow/run-state.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  journeyRequest,
  postHandlerOf,
  stubH
} from '../../../../../../engine/test-support.js'
import * as addressBook from '../../../../../../services/address-book/index.js'
import { STUB_BOOK } from '../../../../../../services/address-book/stub/index.js'
import * as ports from '../../../../../../services/ports/index.js'
import {
  COMPLETE_NOTIFICATION,
  installHighRiskPlantsJourney
} from '../../test-support.js'
import {
  sectionEntry,
  nextInTaskRow
} from '../../../../../../flow/navigation.js'
import { sectionGatePasses } from '../../../../../../flow/gates.js'
import { AMEND, makeScope } from '../../../../../../engine/index.js'
import { sections } from '../../flow/flow.js'
import { meta, routes } from './controller.js'
import { copy } from './copy/copy.en.js'
import { copy as arrivalCopy } from '../arrival-details/copy/copy.en.js'
import { copy as destinationCopy } from '../place-of-destination/copy/copy.en.js'
import { changeHref } from './view-model/rows/change-link.js'

const PLANTS_FOR_PLANTING = 'plants-for-planting'
const NOT_YET_ARRIVED = 'not-yet-arrived'
const DESTINATION_CARD = '#place-of-destination'

const get = routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf({ routes })
const cardsOf = (result) =>
  result.view.context.sections.flatMap((section) => section.cards)
const invalidDestinationErrors = (result) => [
  {
    text: copy.errors.parties.placeOfDestination,
    href: `${SET_BASE}/notifications/${result.journeyId}/destinations/edit?return=notification-view`
  }
]
const INVALID_EMAIL = 'not-an-email'
const invalidDestination = {
  ...COMPLETE_NOTIFICATION,
  placeOfDestination: {
    ...COMPLETE_NOTIFICATION.placeOfDestination,
    email: INVALID_EMAIL
  }
}
const invalidOrigin = {
  ...COMPLETE_NOTIFICATION,
  commodityLines: [
    { ...COMPLETE_NOTIFICATION.commodityLines[0], category: 'ware-potatoes' }
  ]
}

beforeAll(() => {
  configureRecords(SET_ID, recordsStub)
  configureSession(SET_ID, sessionStub)
  installHighRiskPlantsJourney()
})
beforeEach(() => store.clear())
afterEach(() => vi.restoreAllMocks())

describe('Check your answers', () => {
  it('Should render three numbered sections, stored values and indexed Change links without writing', async () => {
    const result = await driveHandler(get, { seed: COMPLETE_NOTIFICATION })
    expect(meta.collects).toEqual([])
    expect(result.view.context).toMatchObject({
      pageTitle: copy.title,
      readOnly: false,
      backLink: `${SET_BASE}/notifications/${result.journeyId}`,
      copy
    })
    expect(result.view.context.caption).toBeUndefined()
    expect(result.view.context.sections.map(({ heading }) => heading)).toEqual(
      Object.values(copy.sections)
    )
    const cards = cardsOf(result)
    expect(cards.map(({ title }) => title)).not.toContain(copy.cards.consignor)
    expect(cards[0].rows[1]).toMatchObject({
      value: { text: 'France' },
      actions: {
        items: [
          {
            href: `${SET_BASE}/notifications/${result.journeyId}/origin?change=1`
          }
        ]
      }
    })
    expect(cards[1].actions.items[0].href).toBe(
      `${SET_BASE}/notifications/${result.journeyId}/commodities/details?index=0&change=1`
    )
    expect(cards[1].rows.map(({ value }) => value.text)).toEqual([
      'Seed potatoes',
      'Maris Piper',
      '250',
      'Planting'
    ])
    const contact = cards.find(({ title }) => title === copy.cards.contact)
    expect(contact.rows.map(({ value }) => value.text)).toEqual([
      'Tech Imports Ltd',
      '18 Dockside Road, London, E14 9GE, United Kingdom',
      '01632 960000',
      'tech-imports-ltd@example.com'
    ])
    expect(result.after).toEqual(COMPLETE_NOTIFICATION)
  })

  it('Should omit potato-only fields and show the consignor for plants', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: PLANTS_FOR_PLANTING, countryOfOrigin: 'FR' }
    })
    const cards = cardsOf(result)
    expect(cards.map(({ title }) => title)).toContain(copy.cards.consignor)
    const arrival = cards.find(({ title }) => title === copy.cards.arrival)
    expect(arrival.rows.map(({ key }) => key.text)).toEqual([
      copy.labels.arrivalStatus,
      arrivalCopy.dateLabels[NOT_YET_ARRIVED]
    ])
  })

  it('Should name an invalid destination copy by its party error alone', async () => {
    const result = await driveHandler(get, { seed: invalidDestination })
    expect(result.view.context.errorSummary.errorList).toEqual(
      invalidDestinationErrors(result)
    )
  })

  it('Should refuse Continue for an invalid destination copy, naming it once', async () => {
    const result = await driveHandler(post, { seed: invalidDestination })
    expect(result.response.statusCode).toBe(400)
    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.errorSummary.errorList).toEqual(
      invalidDestinationErrors(result)
    )
  })

  it('Should name an unanswered destination as an outstanding task, not a party error', async () => {
    const seed = { ...COMPLETE_NOTIFICATION }
    delete seed.placeOfDestination
    const result = await driveHandler(get, { seed })
    const destination = cardsOf(result).find(
      ({ title }) => title === destinationCopy.headings.potatoes
    )
    expect(
      destination.rows.every(({ value }) => value.text === copy.notProvided)
    ).toBe(true)
    expect(result.view.context.errorSummary.errorList).not.toContainEqual(
      expect.objectContaining({ text: copy.errors.parties.placeOfDestination })
    )
    expect(result.view.context.errorSummary.errorList).toContainEqual({
      text: copy.errors.cards.placeOfDestination,
      href: DESTINATION_CARD
    })
  })

  it.each([
    ['potatoes', COMPLETE_NOTIFICATION],
    [
      NOT_YET_ARRIVED,
      {
        commodityType: PLANTS_FOR_PLANTING,
        countryOfOrigin: 'FR',
        arrivalStatus: NOT_YET_ARRIVED
      }
    ],
    [
      'already-arrived',
      {
        commodityType: PLANTS_FOR_PLANTING,
        countryOfOrigin: 'FR',
        arrivalStatus: 'already-arrived'
      }
    ]
  ])(
    'Should select the arrival label and destination heading for %s',
    async (arrivalState, seed) => {
      const result = await driveHandler(get, { seed })
      const cards = cardsOf(result)
      const arrival = cards.find(({ title }) => title === copy.cards.arrival)
      expect(arrival.rows.map(({ key }) => key.text)).toContain(
        arrivalCopy.dateLabels[arrivalState]
      )
      expect(cards.map(({ title }) => title)).toContain(
        destinationCopy.headings[arrivalState]
      )
    }
  )

  it('Should recheck origin after a commodity change and refuse Continue with a link to origin', async () => {
    for (const handler of [get, post]) {
      const result = await driveHandler(handler, { seed: invalidOrigin })
      expect(result.view.context.errorSummary.errorList[0].href).toBe(
        `${SET_BASE}/notifications/${result.journeyId}/origin?change=1`
      )
      expect(result.view.context.errorSummary.errorList[0].text).toContain(
        'Poland'
      )
      expect(result.after).toEqual(invalidOrigin)
      if (handler === post) {
        expect(result.response.statusCode).toBe(400)
      }
    }
  })

  it('Should continue through the registered review flow and honour the overview exit without writing', async () => {
    for (const payload of [{}, { exit: 'hub' }]) {
      const result = await driveHandler(post, {
        seed: COMPLETE_NOTIFICATION,
        payload
      })
      expect(result.response.redirect).toBe(
        `${SET_BASE}/notifications/${result.journeyId}${payload.exit ? '' : '/declaration'}`
      )
      expect(result.after).toEqual(COMPLETE_NOTIFICATION)
    }
  })

  it('Should refuse Continue on an incomplete notification, naming what is outstanding', async () => {
    const result = await driveHandler(post, {
      seed: { commodityType: 'potatoes', countryOfOrigin: 'FR' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.errorSummary.disableAutoFocus).toBe(false)
    expect(
      result.view.context.errorSummary.errorList.map(({ text }) => text)
    ).toEqual(
      expect.arrayContaining([
        copy.errors.cards.placeOfDestination,
        copy.errors.cards.contact
      ])
    )
  })

  it('Should render a submitted notification read-only and refuse a forged Continue', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, COMPLETE_NOTIFICATION)
    await store.submit(journey.journeyId)
    const request = journeyRequest(journey.journeyId)
    const h = stubH()
    await get(request, h)
    expect(h.captured.view.context.readOnly).toBe(true)
    for (const card of h.captured.view.context.sections.flatMap(
      ({ cards }) => cards
    )) {
      expect(card.actions).toBeUndefined()
      expect(card.rows.every((row) => !row.actions)).toBe(true)
    }
    expect(await post(request, h)).toEqual({
      redirect: `${SET_BASE}/notifications/${journey.journeyId}/notification-view`
    })
  })
})

describe('Check your answers — reference-list answers', () => {
  it('Should render the raw ISO code in the origin row when the stored country is no longer offered by the origin block', async () => {
    const UNOFFERED_COUNTRY = 'ZZ'
    const result = await driveHandler(get, {
      seed: { ...COMPLETE_NOTIFICATION, countryOfOrigin: UNOFFERED_COUNTRY }
    })

    expect(cardsOf(result)[0].rows[1]).toMatchObject({
      value: { text: UNOFFERED_COUNTRY }
    })
  })

  it('Should read the place of landing back exactly as the option the trader picked', async () => {
    const result = await driveHandler(get, { seed: COMPLETE_NOTIFICATION })
    const arrival = cardsOf(result).find(
      ({ title }) => title === copy.cards.arrival
    )
    const landing = arrival.rows.find(
      ({ key }) => key.text === copy.labels.proposedPlaceOfLanding
    )
    const picked = (await ports.portOptions()).find(
      ({ value }) => value === COMPLETE_NOTIFICATION.proposedPlaceOfLanding
    )

    expect(landing.value.text).toBe(picked.text)
  })

  it('Should name a territory of origin with its country', async () => {
    const result = await driveHandler(get, {
      seed: { ...COMPLETE_NOTIFICATION, countryOfOrigin: 'ES-CN' }
    })

    expect(cardsOf(result)[0].rows[1]).toMatchObject({
      value: { text: 'Canary Islands (Spain)' }
    })
  })
})

describe('Check your answers — outstanding tasks and the opening run', () => {
  it('Should name every unfinished card on an incomplete notification, in page order, linking to the card on this page', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: 'potatoes', countryOfOrigin: 'FR' }
    })
    expect(result.view.context.errorSummary.errorList).toEqual([
      {
        text: copy.errors.cards.commodities,
        href: '#about-the-consignment'
      },
      { text: copy.errors.cards.arrivalDetails, href: '#arrival-details' },
      {
        text: copy.errors.cards.placeOfDestination,
        href: DESTINATION_CARD
      },
      {
        text: copy.errors.cards.identificationNumbers,
        href: '#identification-numbers'
      },
      { text: copy.errors.cards.contact, href: '#contact' }
    ])
  })

  it('Should name a half-done card once, linking to the card rather than a page', async () => {
    const result = await driveHandler(get, {
      seed: {
        commodityType: PLANTS_FOR_PLANTING,
        countryOfOrigin: 'FR',
        arrivalStatus: NOT_YET_ARRIVED
      }
    })
    const arrivalEntries = result.view.context.errorSummary.errorList.filter(
      ({ text }) => text === copy.errors.cards.arrivalDetails
    )
    expect(arrivalEntries).toEqual([
      { text: copy.errors.cards.arrivalDetails, href: '#arrival-details' }
    ])
  })

  it('Should mark each unfinished card with its anchor and message, and leave finished cards unmarked', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: 'potatoes', countryOfOrigin: 'FR' }
    })
    const [consignment] = result.view.context.sections
    expect(consignment.anchor).toBe('about-the-consignment')
    const cards = cardsOf(result)
    expect(
      cards.find(({ title }) => title === copy.cards.import)
    ).toMatchObject({ anchor: 'import-details', error: null })
    expect(
      cards.find(({ title }) => title === copy.cards.contact)
    ).toMatchObject({ anchor: 'contact', error: copy.errors.cards.contact })
  })

  it('Should mark no card on a complete notification', async () => {
    const result = await driveHandler(get, { seed: COMPLETE_NOTIFICATION })
    expect(result.view.context.errorSummary).toBeNull()
    expect(cardsOf(result).every(({ error }) => !error)).toBe(true)
  })

  it('Should complete the opening run when check your answers is shown', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, COMPLETE_NOTIFICATION)
    const cookies = {}
    const h = {
      ...stubH(),
      state: (name, value) => {
        cookies[name] = value
      }
    }
    await get(
      journeyRequest(journey.journeyId, {
        state: { [openingRunCookie()]: { [journey.journeyId]: RUN_ACTIVE } }
      }),
      h
    )
    expect(cookies[openingRunCookie()]).toEqual({
      [journey.journeyId]: RUN_COMPLETE
    })
  })
})

describe('Check your answers lateness', () => {
  it('Should warn using the request clock without writing lateness on draft GET', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, COMPLETE_NOTIFICATION)
    const request = journeyRequest(journey.journeyId, {
      app: { clock: () => new Date('2026-03-26T00:00:00Z') }
    })
    const h = stubH()
    await get(request, h)
    expect(h.captured.view.context.lateWarning).toBe(true)
    expect(h.captured.view.context.lateNotification).toBe(false)
    expect(h.captured.view.context.lateRule).toContain('2 days before')
    expect((await store.get(journey.journeyId)).answers).toEqual(
      COMPLETE_NOTIFICATION
    )
    request.app.clock = () => new Date('2026-03-25T23:59:59Z')
    await get(request, h)
    expect(h.captured.view.context.lateWarning).toBe(false)
  })

  it.each(['late', 'on-time'])(
    'Should render submitted lateness only from the stored %s value',
    async (indicator) => {
      const journey = await store.create()
      await store.seedAnswers(journey.journeyId, {
        ...COMPLETE_NOTIFICATION,
        lateNotificationIndicator: indicator
      })
      await store.submit(journey.journeyId)
      const request = journeyRequest(journey.journeyId, {
        app: {
          clock: () => {
            throw new Error('must not recompute')
          }
        }
      })
      const h = stubH()
      await get(request, h)
      expect(h.captured.view.context.lateWarning).toBe(false)
      expect(h.captured.view.context.lateNotification).toBe(
        indicator === 'late'
      )
    }
  )

  it('Should offer Cancel amendment only while amending, and the banner only after cancelling', async () => {
    const { journeyId } = await store.create()
    await store.seedAnswers(journeyId, COMPLETE_NOTIFICATION)
    await store.submit(journeyId)
    const submitted = stubH()
    await get(journeyRequest(journeyId), submitted)
    expect(submitted.captured.view.context).toMatchObject({
      readOnly: true,
      deleteHref: `${SET_BASE}/notifications/${journeyId}/delete`,
      amendmentCancelled: false
    })
    expect(
      submitted.captured.view.context.journeyStrip.cancelAmend
    ).toBeUndefined()
    const cancelled = stubH()
    await get(
      journeyRequest(journeyId, { query: { cancelled: '1' } }),
      cancelled
    )
    expect(cancelled.captured.view.context.amendmentCancelled).toBe(true)
    await recordsStub.amend(journeyId)
    const amending = stubH()
    await get(
      journeyRequest(journeyId, { query: { cancelled: '1' } }),
      amending
    )
    expect(amending.captured.view.context).toMatchObject({
      readOnly: false,
      deleteHref: null,
      amendmentCancelled: false
    })
    expect(amending.captured.view.context.journeyStrip.cancelAmend.href).toBe(
      `${SET_BASE}/notifications/${journeyId}/cancel-amend`
    )
  })

  it('Should show no error summary on opening an incomplete amend review', async () => {
    const result = await driveHandler(get, { amend: true })
    expect(result.view.context.errorSummary).toBeNull()
  })

  it('Should refuse Continue on an incomplete amend with the error summary, naming what is outstanding', async () => {
    const result = await driveHandler(post, {
      seed: { commodityType: 'potatoes', countryOfOrigin: 'FR' },
      amend: true
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.errorSummary.disableAutoFocus).toBe(false)
    expect(result.view.context.errorSummary.errorList).toEqual(
      expect.arrayContaining([
        {
          text: copy.errors.cards.placeOfDestination,
          href: DESTINATION_CARD
        },
        { text: copy.errors.cards.contact, href: '#contact' }
      ])
    )
    expect((await store.get(result.journeyId)).status).toBe(AMEND)
  })

  it('Should let a complete amend continue to the declaration', async () => {
    const result = await driveHandler(post, {
      seed: COMPLETE_NOTIFICATION,
      amend: true
    })
    expect(result.response).toEqual({
      redirect: `${SET_BASE}/notifications/${result.journeyId}/declaration`
    })
  })
})

describe('review navigation', () => {
  it('Should gate the review hub entry on complete tasks without changing Contact Continue', () => {
    const section = sections.find(({ id }) => id === 'review')
    const complete = makeScope(COMPLETE_NOTIFICATION)
    expect(sectionGatePasses(section, makeScope({}))).toBe(false)
    expect(sectionGatePasses(section, complete)).toBe(true)
    expect(sectionEntry('review', complete, 'j-1')).toBe(
      `${SET_BASE}/notifications/j-1/notification-view`
    )
    expect(nextInTaskRow('consignment-contact-select', complete, 'j-1')).toBe(
      `${SET_BASE}/notifications/j-1`
    )
    expect(
      STUB_BOOK.some(
        ({ id }) => id === COMPLETE_NOTIFICATION.contactAddress.pickedFromId
      )
    ).toBe(true)
  })
})

describe('Check your answers — copied addresses', () => {
  it('Should show the copy held on the notification without reading the address book', async () => {
    const partySpy = vi.spyOn(addressBook, 'party')
    const edited = {
      ...COMPLETE_NOTIFICATION,
      placeOfDestination: {
        ...COMPLETE_NOTIFICATION.placeOfDestination,
        name: 'Tech Imports Warehouse'
      }
    }
    const result = await driveHandler(get, { seed: edited })
    const destination = cardsOf(result).find(
      ({ title }) => title === destinationCopy.headings.potatoes
    )
    expect(destination.rows[0].value.text).toBe('Tech Imports Warehouse')
    expect(result.view.context.errorSummary).toBeNull()
    expect(partySpy).not.toHaveBeenCalled()
  })

  it('Should offer Change and Edit details on an answered address, and only Change on an unanswered one', async () => {
    const seed = { ...COMPLETE_NOTIFICATION }
    delete seed.placeOfDestination
    const result = await driveHandler(get, { seed })
    const cards = cardsOf(result)
    const contact = cards.find(({ title }) => title === copy.cards.contact)
    const destination = cards.find(
      ({ title }) => title === destinationCopy.headings.potatoes
    )

    expect(contact.actions.items).toEqual([
      {
        href: changeHref(result.journeyId, 'contactAddress'),
        text: copy.change,
        visuallyHiddenText: copy.cards.contact
      },
      {
        href: `${SET_BASE}/notifications/${result.journeyId}/consignment/contact/edit?return=notification-view`,
        text: copy.editDetails,
        visuallyHiddenText: copy.cards.contact
      }
    ])
    expect(destination.actions.items.map(({ text }) => text)).toEqual([
      copy.change
    ])
  })

  it('Should refuse Continue while a copy breaks the address-book rules, linking to its edit page', async () => {
    const seed = {
      ...COMPLETE_NOTIFICATION,
      contactAddress: {
        ...COMPLETE_NOTIFICATION.contactAddress,
        email: INVALID_EMAIL
      }
    }
    for (const handler of [get, post]) {
      const result = await driveHandler(handler, { seed })
      expect(result.view.context.errorSummary.errorList).toEqual([
        {
          text: copy.errors.parties.contactAddress,
          href: `${SET_BASE}/notifications/${result.journeyId}/consignment/contact/edit?return=notification-view`
        }
      ])
      expect(result.after).toEqual(seed)
      if (handler === post) {
        expect(result.response.statusCode).toBe(400)
      }
    }
  })

  it('Should refuse Continue for a copy whose country is not in the address book list', async () => {
    const seed = {
      ...COMPLETE_NOTIFICATION,
      placeOfDestination: {
        ...COMPLETE_NOTIFICATION.placeOfDestination,
        address: {
          ...COMPLETE_NOTIFICATION.placeOfDestination.address,
          countryCode: 'United Kingdom'
        }
      }
    }
    const result = await driveHandler(post, { seed })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errorSummary.errorList).toContainEqual({
      text: copy.errors.parties.placeOfDestination,
      href: `${SET_BASE}/notifications/${result.journeyId}/destinations/edit?return=notification-view`
    })
  })

  it('Should mark the row holding each field that breaks the rules, still showing the copy', async () => {
    const seed = {
      ...COMPLETE_NOTIFICATION,
      placeOfDestination: {
        ...COMPLETE_NOTIFICATION.placeOfDestination,
        email: INVALID_EMAIL,
        address: {
          ...COMPLETE_NOTIFICATION.placeOfDestination.address,
          countryCode: 'United Kingdom'
        }
      }
    }
    const result = await driveHandler(get, { seed })
    const destination = cardsOf(result).find(
      ({ title }) => title === destinationCopy.headings.potatoes
    )
    const rowFor = (label) =>
      destination.rows.find(({ key }) => key.text === label)

    expect(rowFor(copy.labels.address).value.html).toBe(
      '<p class="govuk-error-message"><span class="govuk-visually-hidden">Error:</span> Enter a valid country</p>' +
        '18 Dockside Road, London, E14 9GE, United Kingdom'
    )
    expect(rowFor(copy.labels.email).value.html).toContain(
      'Enter an email address in the correct format</p>not-an-email'
    )
    expect(rowFor(copy.labels.name).value).toEqual({
      text: 'Tech Imports Ltd'
    })
    expect(rowFor(copy.labels.phone).value).toEqual({
      text: '01632 960000'
    })
  })

  it('Should escape a copied value shown under its error', async () => {
    const seed = {
      ...COMPLETE_NOTIFICATION,
      contactAddress: {
        ...COMPLETE_NOTIFICATION.contactAddress,
        email: '<b>x</b>'
      }
    }
    const result = await driveHandler(get, { seed })
    const contact = cardsOf(result).find(
      ({ title }) => title === copy.cards.contact
    )
    const email = contact.rows.find(({ key }) => key.text === copy.labels.email)

    expect(email.value.html).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(email.value.html).not.toContain('<b>')
  })
})
