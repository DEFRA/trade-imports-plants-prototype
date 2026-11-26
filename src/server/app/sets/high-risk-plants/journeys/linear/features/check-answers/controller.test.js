import { SET_BASE } from '../../../../set.js'
import { describe, expect, it } from 'vitest'
import { store } from '../../../../../../engine/store.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import {
  driveHandler,
  expectBackLinkIsPath,
  expectOneRefusalLogged,
  journeyRequest,
  postHandlerOf,
  trailQuery,
  stubH
} from '../../../../../../engine/test-support.js'
import { CYA_SLUG, TRAIL_START } from '../../../../../../shared/kit.js'
import * as cancelAmend from '../cancel-amend/controller.js'
import { STUB_BOOK } from '../../../../../../services/address-book/stub/index.js'
import * as ports from '../../../../../../services/ports/index.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../lib/http-status.js'
import {
  COMPLETE_NOTIFICATION,
  COMPLETE_PLANTS_NOTIFICATION,
  itSendsBackToWhereTheTraderCameFrom,
  useStubbedHighRiskPlantsJourney,
  deleteNotificationButton,
  TECH_IMPORTS_ADDRESS_LINES,
  TECH_IMPORTS_COPY
} from '../../test-support.js'
import { sectionEntry } from '../../../../../../flow/navigation.js'
import { sectionGatePasses } from '../../../../../../flow/gates.js'
import { AMEND, makeScope } from '../../../../../../engine/index.js'
import { sections } from '../../flow/flow.js'
import { meta, routes } from './controller.js'
import { copy } from './copy/copy.en.js'
import { copy as arrivalCopy } from '../arrival-details/copy/copy.en.js'
import { copy as destinationCopy } from '../place-of-destination/copy/copy.en.js'
import { copy as partyEditCopy } from '../party-edit/copy/copy.en.js'
import { changeHref } from './view-model/rows/change-link.js'

const PLANTS_FOR_PLANTING = 'plants-for-planting'
const NOT_YET_ARRIVED = 'not-yet-arrived'
const DESTINATION_CARD = '#place-of-destination'
const ADDRESS_READ_BACK = TECH_IMPORTS_ADDRESS_LINES.join('<br>')
const ERROR_PREFIX_HTML =
  '<p class="govuk-error-message"><span class="govuk-visually-hidden">Error:</span> '

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
const OVERLONG_PHONE = '0'.repeat(21)
const TELEPHONE_ERROR = partyEditCopy.errors.phone.maxLength(20)
const COUNTRY_REQUIRED_ERROR = partyEditCopy.errors.countryCode.required
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

useStubbedHighRiskPlantsJourney()

describe('Check your answers', () => {
  it('Should render three numbered sections, stored values and indexed Change links without writing', async () => {
    const result = await driveHandler(get, { seed: COMPLETE_NOTIFICATION })
    expect(meta.collects).toEqual([])
    expect(result.view.context).toMatchObject({
      pageTitle: result.journeyId,
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
            href: `${SET_BASE}/notifications/${result.journeyId}/origin?from=notification-view`
          }
        ]
      }
    })
    expect(cards[1].actions.items[0].href).toBe(
      `${SET_BASE}/notifications/${result.journeyId}/commodities/details?index=0&from=notification-view`
    )
    expect(cards[1].rows.map(({ value }) => value.text)).toEqual([
      'Seed potatoes',
      'Maris Piper',
      '250',
      'Planting'
    ])
    const contact = cards.find(({ title }) => title === copy.cards.contact)
    expect(contact.rows.map(({ key }) => key.text)).toEqual([
      copy.labels.name,
      copy.labels.address
    ])
    expect(contact.rows.map(({ value }) => value)).toEqual([
      { text: 'Tech Imports Ltd' },
      { html: ADDRESS_READ_BACK }
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
    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.errorSummary.errorList).toEqual(
      invalidDestinationErrors(result)
    )
    expectOneRefusalLogged(result.logger, {
      journeyId: result.journeyId,
      errorCodes: ['party:placeOfDestination']
    })
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
        `${SET_BASE}/notifications/${result.journeyId}/origin?from=notification-view`
      )
      expect(result.view.context.errorSummary.errorList[0].text).toContain(
        'Poland'
      )
      expect(result.after).toEqual(invalidOrigin)
      if (handler === post) {
        expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
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
    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
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

describe('Check your answers — outstanding tasks', () => {
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

  it('Should call the consignor Consignor on its unfinished card and in its summary error', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: PLANTS_FOR_PLANTING, countryOfOrigin: 'FR' }
    })
    expect(cardsOf(result).map(({ title }) => title)).toContain('Consignor')
    expect(
      result.view.context.errorSummary.errorList.map(({ text }) => text)
    ).toContain('Complete consignor')
  })

  it('Should name the consignor in the error for an answered consignor that breaks the address rules', async () => {
    const result = await driveHandler(get, {
      seed: {
        commodityType: PLANTS_FOR_PLANTING,
        countryOfOrigin: 'FR',
        consignor: { ...TECH_IMPORTS_COPY, email: INVALID_EMAIL }
      }
    })
    expect(
      result.view.context.errorSummary.errorList.map(({ text }) => text)
    ).toContain('Correct the address details for the consignor')
  })

  it('Should mark no card on a complete notification', async () => {
    const result = await driveHandler(get, { seed: COMPLETE_NOTIFICATION })
    expect(result.view.context.errorSummary).toBeNull()
    expect(cardsOf(result).every(({ error }) => !error)).toBe(true)
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

  const submittedJourneyId = async () => {
    const { journeyId } = await store.create()
    await store.seedAnswers(journeyId, COMPLETE_NOTIFICATION)
    await store.submit(journeyId)
    return journeyId
  }

  it('Should offer the delete path in the header when the notification is submitted', async () => {
    const journeyId = await submittedJourneyId()
    const submitted = stubH()

    await get(journeyRequest(journeyId), submitted)

    expect(submitted.captured.view.context.readOnly).toBe(true)
    expect(submitted.captured.view.context.viewHeader.actions.delete).toEqual(
      deleteNotificationButton(journeyId)
    )
  })

  it('Should head a submitted view with its reference, a header and no strip', async () => {
    const journeyId = await submittedJourneyId()
    const submitted = stubH()
    await get(journeyRequest(journeyId), submitted)

    expect(submitted.captured.view.context.pageTitle).toBe(journeyId)
    expect(submitted.captured.view.context.journeyStrip).toBeNull()
    expect(submitted.captured.view.context.viewHeader.reference).toBe(journeyId)
    expect(submitted.captured.view.context.viewHeader.status.text).toBe(
      'Submitted'
    )
  })

  it('Should head a draft with its reference and a Draft tag in the header, and no strip', async () => {
    const draft = await driveHandler(get, { seed: COMPLETE_NOTIFICATION })

    expect(draft.view.context.pageTitle).toBe(draft.journeyId)
    expect(draft.view.context.journeyStrip).toBeNull()
    expect(draft.view.context.viewHeader.reference).toBe(draft.journeyId)
    expect(draft.view.context.viewHeader.status).toEqual({
      text: 'Draft',
      classes: 'govuk-tag--blue'
    })
  })

  it('Should head an amendment with its title and the strip, and no header', async () => {
    const amendment = await driveHandler(get, { amend: true })

    expect(amendment.view.context.pageTitle).toBe(copy.title)
    expect(amendment.view.context.journeyStrip.status.text).toBe('Amend')
    expect(amendment.view.context.viewHeader).toBeNull()
  })

  it('Should reject the view of a notification that does not exist with not found', async () => {
    await expect(
      get(journeyRequest('GBN-0000-0000-0000'), stubH())
    ).rejects.toMatchObject({ isBoom: true, output: { statusCode: 404 } })
  })

  it('Should offer the cancel-amend path only while amending, with no Cancel amend link in the journey strip', async () => {
    const journeyId = await submittedJourneyId()
    const submitted = stubH()
    await get(journeyRequest(journeyId), submitted)
    expect(submitted.captured.view.context.buttonsAfterPrimary).toEqual([])
    const draft = await driveHandler(get, { seed: COMPLETE_NOTIFICATION })
    expect(draft.view.context.buttonsAfterPrimary).toEqual([])
    await recordsStub.amend(journeyId)
    const amending = stubH()

    await get(journeyRequest(journeyId), amending)

    expect(amending.captured.view.context.buttonsAfterPrimary).toEqual([
      expect.objectContaining({
        href: `${SET_BASE}/notifications/${journeyId}/cancel-amend`
      })
    ])
    expect(
      amending.captured.view.context.journeyStrip.cancelAmend
    ).toBeUndefined()
  })

  it('Should show the amendment-cancelled banner only after cancelling', async () => {
    const journeyId = await submittedJourneyId()
    const opened = stubH()
    const cancelled = stubH()
    await get(journeyRequest(journeyId), opened)
    await get(
      journeyRequest(journeyId, { query: { cancelled: '1' } }),
      cancelled
    )
    await recordsStub.amend(journeyId)
    const amending = stubH()
    await get(
      journeyRequest(journeyId, { query: { cancelled: '1' } }),
      amending
    )

    expect(opened.captured.view.context.amendmentCancelled).toBe(false)
    expect(cancelled.captured.view.context.amendmentCancelled).toBe(true)
    expect(amending.captured.view.context.amendmentCancelled).toBe(false)
  })

  it('Should follow Continue on a draft with no buttons, its Delete sitting in the header', async () => {
    const result = await driveHandler(get, { seed: COMPLETE_NOTIFICATION })

    expect(result.view.context.buttonsAfterPrimary).toEqual([])
    expect(result.view.context.viewHeader.actions.delete).toEqual(
      deleteNotificationButton(result.journeyId)
    )
  })

  it('Should follow Continue on an amendment with a secondary Cancel amend button and no Delete', async () => {
    const result = await driveHandler(get, { amend: true })

    expect(result.view.context.buttonsAfterPrimary).toEqual([
      {
        text: 'Cancel amend',
        href: `${SET_BASE}/notifications/${result.journeyId}/cancel-amend`,
        classes: 'govuk-button--secondary'
      }
    ])
  })

  it('Should show a draft review as editable, headed by its reference with the Draft tag and no Amend', async () => {
    const result = await driveHandler(get, { seed: COMPLETE_NOTIFICATION })

    expect(result.view.context.readOnly).toBe(false)
    expect(result.view.context.viewHeader).toMatchObject({
      reference: result.journeyId,
      status: { text: 'Draft', classes: 'govuk-tag--blue' },
      actions: { amend: null }
    })
    expect(result.view.context.journeyStrip).toBeNull()
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
    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
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

describe('Check your answers — the Back link', () => {
  const submittedViewWith = async (query = {}) => {
    const { journeyId } = await store.create()
    await store.seedAnswers(journeyId, COMPLETE_NOTIFICATION)
    await store.submit(journeyId)
    const h = stubH()
    await get(journeyRequest(journeyId, { query }), h)
    return h.captured.view
  }

  it('Should send Back from a submitted notification to the notification list', async () => {
    const view = await submittedViewWith()
    expect(view.context.backLink).toBe(SET_BASE)
  })

  it('Should send Back from the submitted view shown after an amendment is cancelled to the notification list', async () => {
    const { journeyId } = await store.create()
    await store.seedAnswers(journeyId, COMPLETE_NOTIFICATION)
    await store.submit(journeyId)
    await recordsStub.amend(journeyId)
    await store.seedAnswers(journeyId, {
      ...COMPLETE_NOTIFICATION,
      producerIdentificationNumber: 'P999'
    })
    const cancelRequest = journeyRequest(journeyId)
    await postHandlerOf(cancelAmend)(cancelRequest, stubH(cancelRequest))

    const h = stubH()
    await get(journeyRequest(journeyId, { query: { cancelled: '1' } }), h)

    expect(h.captured.view.context.backLink).toBe(SET_BASE)
  })

  it('Should send Back from an amendment opened with no trail to Overview', async () => {
    const result = await driveHandler(get, {
      seed: COMPLETE_NOTIFICATION,
      amend: true
    })

    expectBackLinkIsPath(
      result,
      `${SET_BASE}/notifications/${result.journeyId}`
    )
  })
})

itSendsBackToWhereTheTraderCameFrom(get, {
  seed: COMPLETE_NOTIFICATION,
  previousPage: 'consignment/contact/select'
})

const cardActionsText = (view, text) =>
  view.context.sections
    .flatMap((section) => section.cards)
    .flatMap((card) => [
      ...(card.actions?.items ?? []),
      ...card.rows.flatMap((row) => row.actions?.items ?? [])
    ])
    .filter((action) => action.text === text)
    .map(({ href }) => href)

const fromParam = (href) =>
  new URL(href, 'http://review.test').searchParams.get('from')

describe.each([
  ['a draft', {}],
  ['an amendment', { amend: true }]
])(
  'Check your answers — the Back link of %s by where the trader came from',
  (_journeyKind, requestOptions) => {
    const backFor = async (query) => {
      const result = await driveHandler(get, {
        seed: COMPLETE_NOTIFICATION,
        ...requestOptions,
        query
      })
      return { journeyId: result.journeyId, view: result.view }
    }

    it('Should push the review onto its own trail on every Change link', async () => {
      const { view } = await backFor(trailQuery(TRAIL_START.dashboard))
      const hrefs = cardActionsText(view, copy.change)

      expect(hrefs).not.toHaveLength(0)
      for (const href of hrefs) {
        expect(fromParam(href)).toBe(`${TRAIL_START.dashboard},${CYA_SLUG}`)
      }
    })

    it('Should keep the review Back unchanged on an Edit details link, which returns to the review', async () => {
      const { view } = await backFor(trailQuery(TRAIL_START.dashboard))
      const editHrefs = cardActionsText(view, copy.editDetails)

      expect(editHrefs).not.toHaveLength(0)
      for (const href of editHrefs) {
        expect(fromParam(href)).toBe(TRAIL_START.dashboard)
      }
    })
  }
)

describe('Check your answers — a refused Continue', () => {
  it('Should keep the Back link the review had', async () => {
    const result = await driveHandler(post, {
      seed: invalidOrigin,
      query: trailQuery(TRAIL_START.dashboard)
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expectBackLinkIsPath(result, SET_BASE)
  })
})

describe('Check your answers — the review section gate', () => {
  it('Should gate the review hub entry on complete tasks', () => {
    const section = sections.find(({ id }) => id === 'review')
    const complete = makeScope(COMPLETE_NOTIFICATION)
    expect(sectionGatePasses(section, makeScope({}))).toBe(false)
    expect(sectionGatePasses(section, complete)).toBe(true)
    expect(sectionEntry('review', complete, 'j-1')).toBe(
      `${SET_BASE}/notifications/j-1/notification-view`
    )
  })
})

describe('Check your answers — copied addresses', () => {
  it('Should show the name on the notification’s copy, not the name of the address book record it was picked from', async () => {
    const edited = {
      ...COMPLETE_NOTIFICATION,
      placeOfDestination: {
        ...COMPLETE_NOTIFICATION.placeOfDestination,
        name: 'Tech Imports Warehouse'
      }
    }
    const pickedFrom = STUB_BOOK.find(
      ({ id }) => id === edited.placeOfDestination.pickedFromId
    )
    const result = await driveHandler(get, { seed: edited })
    const destination = cardsOf(result).find(
      ({ title }) => title === destinationCopy.headings.potatoes
    )
    expect(pickedFrom.name).toBe(TECH_IMPORTS_COPY.name)
    expect(destination.rows[0].value.text).toBe('Tech Imports Warehouse')
    expect(result.view.context.errorSummary).toBeNull()
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
        href: changeHref(
          { journeyId: result.journeyId, changeLinkTrail: [CYA_SLUG] },
          'contactAddress'
        ),
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
        expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
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
    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.view.context.errorSummary.errorList).toContainEqual({
      text: copy.errors.parties.placeOfDestination,
      href: `${SET_BASE}/notifications/${result.journeyId}/destinations/edit?return=notification-view`
    })
  })

  it('Should show the country error above the unchanged address lines and the email error above the name, on the place of destination card', async () => {
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

    expect(destination.rows.map(({ key }) => key.text)).toEqual([
      copy.labels.name,
      copy.labels.address
    ])
    expect(rowFor(copy.labels.address).value.html).toBe(
      `${ERROR_PREFIX_HTML}Enter a valid country</p>${ADDRESS_READ_BACK}`
    )
    expect(rowFor(copy.labels.name).value.html).toBe(
      `${ERROR_PREFIX_HTML}Enter an email address in the correct format</p>Tech Imports Ltd`
    )
  })

  it('Should escape each address line shown in the address row', async () => {
    const seed = {
      ...COMPLETE_NOTIFICATION,
      contactAddress: {
        ...COMPLETE_NOTIFICATION.contactAddress,
        address: {
          ...COMPLETE_NOTIFICATION.contactAddress.address,
          addressLine1: '<b>x</b>'
        }
      }
    }
    const result = await driveHandler(get, { seed })
    const contact = cardsOf(result).find(
      ({ title }) => title === copy.cards.contact
    )
    const address = contact.rows.find(
      ({ key }) => key.text === copy.labels.address
    )

    expect(address.value.html).toBe(
      `&lt;b&gt;x&lt;/b&gt;<br>${TECH_IMPORTS_ADDRESS_LINES.slice(1).join('<br>')}`
    )
  })
})

describe('Check your answers — party card rows', () => {
  const destinationWith = (changes) => ({
    ...COMPLETE_NOTIFICATION,
    placeOfDestination: {
      ...COMPLETE_NOTIFICATION.placeOfDestination,
      ...changes
    }
  })

  const rowOf = async (seed, cardTitle, label) => {
    const result = await driveHandler(get, { seed })
    const card = cardsOf(result).find(({ title }) => title === cardTitle)
    return card.rows.find(({ key }) => key.text === label)
  }

  const destinationRowOf = (seed, label) =>
    rowOf(seed, destinationCopy.headings.potatoes, label)

  it('Should show the telephone error above the name on a copy with an invalid telephone number', async () => {
    const name = await destinationRowOf(
      destinationWith({ phone: OVERLONG_PHONE }),
      copy.labels.name
    )

    expect(name.value.html).toBe(
      `${ERROR_PREFIX_HTML}${TELEPHONE_ERROR}</p>Tech Imports Ltd`
    )
  })

  it('Should render a copy with no country code, showing its address lines joined by line breaks under the country error with no trailing blank line', async () => {
    const address = await destinationRowOf(
      destinationWith({
        address: Object.fromEntries(
          Object.entries(
            COMPLETE_NOTIFICATION.placeOfDestination.address
          ).filter(([field]) => field !== 'countryCode')
        )
      }),
      copy.labels.address
    )

    expect(address.value.html).toBe(
      `${ERROR_PREFIX_HTML}${COUNTRY_REQUIRED_ERROR}</p>${TECH_IMPORTS_ADDRESS_LINES.slice(0, -1).join('<br>')}`
    )
  })

  it('Should read not provided on the Address row of a copy with no address lines', async () => {
    const address = await destinationRowOf(
      destinationWith({ address: {} }),
      copy.labels.address
    )

    expect(address.value.html).toBe(
      [
        'Enter address line 1',
        'Enter a town or city',
        'Enter a postcode',
        'Enter a country'
      ]
        .map((message) => `${ERROR_PREFIX_HTML}${message}</p>`)
        .join('') + copy.notProvided
    )
  })

  it('Should show the consignor card with a Name row and a multi-line Address row', async () => {
    const result = await driveHandler(get, {
      seed: COMPLETE_PLANTS_NOTIFICATION
    })
    const consignor = cardsOf(result).find(
      ({ title }) => title === copy.cards.consignor
    )

    expect(consignor.rows.map(({ key }) => key.text)).toEqual([
      copy.labels.name,
      copy.labels.address
    ])
    expect(consignor.rows[1].value).toEqual({ html: ADDRESS_READ_BACK })
  })
})
