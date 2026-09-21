import * as declaration from './sets/high-risk-plants/journeys/linear/features/declaration/controller.js'
import { COMPLETE_NOTIFICATION } from './sets/high-risk-plants/journeys/linear/test-support.js'
import * as state from './engine/index.js'
import { journeyRequest, stubH } from './engine/test-support.js'
import * as checkAnswers from './sets/high-risk-plants/journeys/linear/features/check-answers/controller.js'
const ADDRESS_ID = 'tech-imports-ltd'
import * as contact from './sets/high-risk-plants/journeys/linear/features/consignment-contact-select/controller.js'
import * as identificationNumbers from './sets/high-risk-plants/journeys/linear/features/identification-numbers/controller.js'
import * as consignor from './sets/high-risk-plants/journeys/linear/features/consignor-select/controller.js'
/**
 * The controller <-> model commit contract.
 *
 * One case per collecting controller: a valid POST must commit exactly the
 * committable names the controller declares in `meta.collects`, and nothing
 * else. The table is manual — a controller absent from it does not fail the
 * suite — so every new collecting page adds its case here.
 *
 * The Vitest global setup installs the journey-neutral fixture set, because
 * the engine and the L2 model are journey-agnostic. This file is the
 * exception: it drives real controllers, so it installs the high-risk-plants
 * set for the duration and puts the fixture back afterwards. Read through the
 * configured seam before that install and every name would resolve to nothing,
 * leaving the table comparing an empty set with an empty set.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { installFixture } from '../../../test/fixtures/index.js'
import {
  obligationByName,
  walkObligations
} from './bridge/obligation-source.js'
import { configureRecords } from './engine/persistence/records.js'
import { configureSession } from './engine/persistence/session.js'
import { store } from './engine/store.js'
import { driveHandler, postHandlerOf } from './engine/test-support.js'
import { isAnswered } from './lib/answered.js'
import { records as recordsStub } from './services/persistence/records/stub/index.js'
import { session as sessionStub } from './services/persistence/session/stub.js'
import { installHighRiskPlantsJourney } from './sets/high-risk-plants/journeys/linear/test-support.js'
import * as commodityType from './sets/high-risk-plants/journeys/linear/features/commodity-type/controller.js'
import * as commodities from './sets/high-risk-plants/journeys/linear/features/commodities/list/list.controller.js'
import * as commodityDetails from './sets/high-risk-plants/journeys/linear/features/commodities/details/details.controller.js'
import * as origin from './sets/high-risk-plants/journeys/linear/features/origin/controller.js'
import * as arrivalStatus from './sets/high-risk-plants/journeys/linear/features/arrival-status/controller.js'
import * as arrivalDetails from './sets/high-risk-plants/journeys/linear/features/arrival-details/controller.js'
import * as placeOfDestination from './sets/high-risk-plants/journeys/linear/features/place-of-destination/controller.js'

// Every manifest read is deferred: at module load the configured set is still
// the fixture, and the plants set only arrives in `beforeAll`.
const PLANTS_FOR_PLANTING = 'plants-for-planting'

const manifestNames = () =>
  [...walkObligations()].map((node) => node.obligation.name)

const committedIds = ({ before, after }) =>
  manifestNames().filter(
    (name) => isAnswered(after[name]) && !isAnswered(before[name])
  )

/**
 * The declared names that must be committed, with an unresolved name failing
 * the case rather than being dropped from the expectation. A filter would let
 * a typo or a name this set never declared pass silently as "committed
 * nothing, expected nothing".
 */
const committableCollects = (collects) => {
  expect(collects.filter((name) => !obligationByName(name))).toEqual([])
  return collects
}

const cases = [
  {
    id: 'consignment-contact-select',
    collects: contact.meta.collects,
    handler: postHandlerOf(contact),
    payload: { contactAddress: ADDRESS_ID }
  },
  {
    id: 'identification-numbers-plants-for-planting',
    collects: identificationNumbers.meta.collects.filter((name) =>
      ['supplierIdentificationNumber', 'consignmentNumber'].includes(name)
    ),
    handler: postHandlerOf(identificationNumbers),
    seed: { commodityType: PLANTS_FOR_PLANTING },
    payload: {
      supplierIdentificationNumber: 'ID_123',
      consignmentNumber: 'ID_123'
    }
  },
  {
    id: 'identification-numbers-potatoes',
    collects: identificationNumbers.meta.collects.filter((name) =>
      [
        'producerIdentificationNumber',
        'cropIdentificationNumber',
        'consignmentNumber'
      ].includes(name)
    ),
    handler: postHandlerOf(identificationNumbers),
    seed: { commodityType: 'potatoes' },
    payload: {
      producerIdentificationNumber: 'ID_123',
      cropIdentificationNumber: 'ID_123',
      consignmentNumber: 'ID_123'
    }
  },
  {
    id: 'identification-numbers-wood-and-cut-trees',
    collects: identificationNumbers.meta.collects.filter((name) =>
      ['consignmentNumber'].includes(name)
    ),
    handler: postHandlerOf(identificationNumbers),
    seed: { commodityType: 'wood-and-cut-trees' },
    payload: { consignmentNumber: 'ID_123' }
  },

  {
    id: 'consignor-select',
    collects: consignor.meta.collects,
    handler: postHandlerOf(consignor),
    seed: { commodityType: PLANTS_FOR_PLANTING },
    payload: { consignor: ADDRESS_ID }
  },
  {
    id: 'commodity-type',
    collects: commodityType.meta.collects,
    handler: postHandlerOf(commodityType),
    payload: { commodityType: 'potatoes' }
  },
  {
    id: 'origin',
    collects: origin.meta.collects,
    handler: postHandlerOf(origin),
    payload: { countryOfOrigin: 'FR' }
  },
  {
    id: 'arrival-status',
    collects: arrivalStatus.meta.collects,
    handler: postHandlerOf(arrivalStatus),
    // The question is only in scope for plants and wood, so the seed has to
    // name one of them before the answer is committable at all.
    seed: { commodityType: PLANTS_FOR_PLANTING },
    payload: { arrivalStatus: 'not-yet-arrived' }
  },
  {
    id: 'arrival-details',
    collects: arrivalDetails.meta.collects,
    handler: postHandlerOf(arrivalDetails),
    // The time and the place of landing are potato matters, so the seed names
    // potatoes to bring all three declared names into scope at once.
    seed: { commodityType: 'potatoes' },
    payload: {
      arrivalDate: '27/3/2026',
      arrivalTime: '14:30',
      proposedPlaceOfLanding: 'GB DVR'
    }
  },
  {
    id: 'place-of-destination',
    collects: placeOfDestination.meta.collects,
    handler: postHandlerOf(placeOfDestination),
    // The picker posts the id of the address-book row the trader ticked. The
    // unit suite runs in stub mode, so this is a record the stub book holds.
    payload: { placeOfDestination: ADDRESS_ID }
  }
]

describe('controller <-> model commit contract', () => {
  beforeAll(() => {
    installHighRiskPlantsJourney()
    configureRecords(recordsStub)
    configureSession(sessionStub)
  })
  afterAll(() => installFixture())
  beforeEach(() => store.clear())

  it.each(cases)(
    'Should commit exactly the committable collects for $id',
    async ({ collects, handler, payload, seed }) => {
      const committable = committableCollects(collects)
      expect(committable.length).toBeGreaterThan(0)

      const result = await driveHandler(handler, { payload, seed })

      expect(new Set(committedIds(result))).toEqual(new Set(committable))
    }
  )

  it('Should commit only the declaration flow key and the system lateness value on declaration POST', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, COMPLETE_NOTIFICATION)
    const request = journeyRequest(journey.journeyId, {
      payload: { declaration: 'confirmed' },
      app: {}
    })
    const h = stubH()
    await postHandlerOf(declaration)(request, h)
    const current = await state.get(request, h)
    expect(declaration.meta.collects).toEqual(['declaration'])
    expect(current.answers.declaration).toBe('confirmed')
    expect(
      committedIds({ before: COMPLETE_NOTIFICATION, after: current.answers })
    ).toEqual(['lateNotificationIndicator'])
    expect((await store.get(journey.journeyId)).status).toBe(state.SUBMITTED)
  })

  it('Should let Check your answers continue without committing any answers', async () => {
    expect(checkAnswers.meta.collects).toEqual([])
    const seed = { commodityType: 'potatoes', countryOfOrigin: 'FR' }
    const result = await driveHandler(postHandlerOf(checkAnswers), { seed })
    expect(result.after).toEqual(seed)
    expect(committedIds(result)).toEqual([])
    expect(result.response.redirect).toBe(`/notifications/${result.journeyId}`)
  })

  // The collection splits the declaration from the write: the list page owns
  // `commodityLines` because it is where the group is read back and where
  // Continue leaves the loop, and the entry sub-page — collecting nothing of
  // its own — is what creates a line. So this case drives the sub-page's POST
  // and holds it to the list page's declaration.
  it('Should commit the commodity line its entry sub-page creates', async () => {
    const committable = committableCollects(commodities.meta.collects)
    expect(committable).toEqual(['commodityLines'])
    expect(commodityDetails.meta.collects).toEqual([])

    const result = await driveHandler(postHandlerOf(commodityDetails), {
      seed: { commodityType: 'potatoes' },
      payload: { category: 'seed-potatoes' }
    })

    expect(new Set(committedIds(result))).toEqual(new Set(committable))
    expect(result.after.commodityLines).toEqual([{ category: 'seed-potatoes' }])
  })
})
