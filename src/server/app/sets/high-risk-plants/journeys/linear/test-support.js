import { beforeAll, describe, expect, it } from 'vitest'
import { registerSetMount } from '../../../../shared/set-context.js'
import { dashboardPath, hubPath, pagePath } from '../../../../shared/paths.js'
import { CYA_SLUG, TRAIL_START, withTrail } from '../../../../shared/kit.js'
import {
  driveHandler,
  expectBackLinkIsPath,
  reviewChangeLinkQuery,
  trailQuery,
  useStubbedJourney
} from '../../../../engine/test-support.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../lib/http-status.js'
import { SET_BASE, SET_ID } from '../../set.js'
import { configureReadyForCheckYourAnswers } from '../../../../bridge/readiness-config.js'
import { readyForCheckYourAnswers } from '../../../../flow/section-status.js'
import { configureFulfilmentRegistry } from '../../../../bridge/fulfilment-registry.js'
import { configureObligationSet } from '../../../../model/obligations/manifest.js'
import { configureJourneyFlow } from '../../../../flow/journey-flow.js'
import { buildDispatch } from '../../../../flow/dispatch.js'
import * as highRiskPlantsObligationSet from '../../obligations/index.js'
import { LAYOUT } from './config.js'
import { dispatchPages } from './features/index.js'
import { featureEvaluationBindings } from './features/evaluation.js'
import { FLOW_ONLY_KEYS, sections } from './flow/flow.js'
import { rowStatus, taskRows } from './flow/task-rows.js'
import { entryGuardTarget, insTypeQuestionUrl } from './flow/entry-guard.js'
import { sectionCaptionOf } from './flow/section-captions/index.js'

/** The copy of the stub book's `tech-imports-ltd` record, valid by the
 * address-book rules. */
export const TECH_IMPORTS_COPY = Object.freeze({
  pickedFromId: 'tech-imports-ltd',
  name: 'Tech Imports Ltd',
  phone: '01632 960000',
  email: 'tech-imports-ltd@example.com',
  address: Object.freeze({
    addressLine1: '18 Dockside Road',
    townOrCity: 'London',
    postcode: 'E14 9GE',
    countryCode: 'GB'
  })
})

const POTATOES = 'potatoes'
const PLANTS_FOR_PLANTING = 'plants-for-planting'

export const originSaved = Object.freeze({ countryOfOrigin: 'FR' })

export const COMPLETE_POTATO_CONSIGNMENT = Object.freeze({
  commodityType: 'potatoes',
  commodityLines: [
    {
      category: 'seed-potatoes',
      quantity: '250',
      potatoVariety: 'Maris Piper',
      potatoIntendedUse: 'Planting'
    }
  ]
})

export const COMPLETE_NOTIFICATION = Object.freeze({
  ...COMPLETE_POTATO_CONSIGNMENT,
  contactAddress: TECH_IMPORTS_COPY,
  producerIdentificationNumber: 'P123',
  cropIdentificationNumber: 'C123',
  ...originSaved,
  arrivalDate: Object.freeze({ day: '27', month: '3', year: '2026' }),
  arrivalTime: '14:30',
  proposedPlaceOfLanding: 'GB DVR',
  placeOfDestination: TECH_IMPORTS_COPY
})

/** A plants-for-planting notification with every question in scope answered. */
export const COMPLETE_PLANTS_NOTIFICATION = Object.freeze({
  commodityType: PLANTS_FOR_PLANTING,
  commodityLines: [
    { category: PLANTS_FOR_PLANTING, genus: 'Picea', quantity: '30' }
  ],
  ...originSaved,
  arrivalStatus: 'already-arrived',
  arrivalDate: Object.freeze({ day: '27', month: '3', year: '2026' }),
  placeOfDestination: TECH_IMPORTS_COPY,
  consignor: TECH_IMPORTS_COPY,
  supplierIdentificationNumber: 'S123',
  consignmentNumber: 'N123',
  contactAddress: TECH_IMPORTS_COPY
})

const configureHighRiskPlantsJourneyPorts = () => {
  registerSetMount(SET_ID, SET_BASE)
  configureReadyForCheckYourAnswers(SET_ID, readyForCheckYourAnswers)
  configureObligationSet(SET_ID, highRiskPlantsObligationSet)
  configureFulfilmentRegistry(SET_ID, featureEvaluationBindings)
  configureJourneyFlow(SET_ID, {
    sections,
    taskRows,
    rowStatus,
    insTypeQuestionUrl,
    flowOnlyKeys: FLOW_ONLY_KEYS,
    entryGuardTarget,
    sectionCaption: sectionCaptionOf,
    layout: LAYOUT
  })
}

export const installHighRiskPlantsJourney = () => {
  configureHighRiskPlantsJourneyPorts()
  buildDispatch(SET_ID, dispatchPages)
}

export const useStubbedHighRiskPlantsJourney = () => {
  beforeAll(configureHighRiskPlantsJourneyPorts)
  useStubbedJourney(SET_ID, dispatchPages)
}

const backCases = ({ previousPage }) => [
  ...(previousPage
    ? [
        [
          'the page Save and continue was pressed on',
          { query: trailQuery(TRAIL_START.overview, previousPage) },
          (journeyId) =>
            withTrail(pagePath(journeyId, previousPage), [TRAIL_START.overview])
        ]
      ]
    : []),
  [
    'Overview when opened from Overview',
    { query: trailQuery(TRAIL_START.overview) },
    (journeyId) => hubPath(journeyId)
  ],
  [
    'the dashboard when opened from a dashboard card',
    { query: trailQuery(TRAIL_START.dashboard) },
    () => dashboardPath()
  ],
  [
    'the review when opened from a Change link',
    { query: reviewChangeLinkQuery() },
    (journeyId) => pagePath(journeyId, CYA_SLUG)
  ],
  [
    'the review when opened from a Change link while amending',
    { query: reviewChangeLinkQuery(), amend: true },
    (journeyId) => pagePath(journeyId, CYA_SLUG)
  ],
  [
    'Overview when the trail names a place the journey does not have',
    { query: trailQuery('not-a-place') },
    (journeyId) => hubPath(journeyId)
  ],
  [
    'Overview when nothing says where the trader came from',
    {},
    (journeyId) => hubPath(journeyId)
  ]
]

/**
 * Registers the Back cases of a page rendered by `get`: one test for each
 * place the trader can have come from.
 */
export const itSendsBackToWhereTheTraderCameFrom = (
  get,
  { seed = {}, previousPage } = {}
) =>
  describe('Back', () => {
    it.each(backCases({ previousPage }))(
      'Should go to %s',
      async (_entryPoint, requestOptions, backLinkFor) => {
        const result = await driveHandler(get, { seed, ...requestOptions })

        expectBackLinkIsPath(result, backLinkFor(result.journeyId))
      }
    )
  })

/**
 * Registers the Back case of a refused save: the page shown again goes Back
 * to the page Save and continue was pressed on.
 */
export const itSendsBackToWhereTheTraderCameFromOnRefusal = (
  post,
  { seed, payload, savedPage }
) =>
  it(`Should go back to ${savedPage}, the page Save and continue was pressed on, from the page shown again after a refused save`, async () => {
    const result = await driveHandler(post, {
      seed,
      payload,
      query: trailQuery(TRAIL_START.overview, savedPage)
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expectBackLinkIsPath(
      result,
      withTrail(pagePath(result.journeyId, savedPage), [TRAIL_START.overview])
    )
  })

const itLinksToTheDashboardUntilCommodityTypeAnswered = (
  get,
  { linkName, linkOf }
) => {
  it(`Should send ${linkName} to the dashboard while nothing is committed`, async () => {
    expect(linkOf(await driveHandler(get))).toBe(dashboardPath())
  })

  it(`Should send ${linkName} to the overview once the commodity type is answered`, async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: 'potatoes' }
    })

    expect(linkOf(result)).toBe(hubPath(result.journeyId))
  })
}

export const itSendsBackToTheDashboardUntilCommodityTypeAnswered = (get) =>
  itLinksToTheDashboardUntilCommodityTypeAnswered(get, {
    linkName: 'Back',
    linkOf: (result) => result.view.context.backLink
  })

export const itSendsCancelToTheDashboardUntilCommodityTypeAnswered = (get) =>
  itLinksToTheDashboardUntilCommodityTypeAnswered(get, {
    linkName: 'Cancel and return to overview',
    linkOf: (result) => result.view.context.hubHref
  })

export const PLANTS_OR_WOOD_IN_SCOPE = [
  'commodityType',
  'commodityLines',
  'countryOfOrigin',
  'arrivalStatus',
  'arrivalDate',
  'placeOfDestination',
  'consignor',
  'consignmentNumber',
  'contactAddress'
]

export const POTATO_IN_SCOPE = [
  'commodityType',
  'commodityLines',
  'countryOfOrigin',
  'arrivalDate',
  'arrivalTime',
  'proposedPlaceOfLanding',
  'placeOfDestination',
  'consignmentNumber',
  'contactAddress'
]

const scopeWith = ({ names, answered }) => ({
  inScope: new Set(names),
  answered
})

export const scopeAnswering = (answeredIds, ...names) =>
  scopeWith({ names, answered: (id) => answeredIds.includes(id) })

export const scopeOf = (...names) => scopeWith({ names, answered: () => true })

const seedOfType = (commodityType, answers) => ({
  ...originSaved,
  commodityType,
  ...answers
})

export const potatoes = (answers = {}) => seedOfType(POTATOES, answers)

export const plants = (answers = {}) => seedOfType(PLANTS_FOR_PLANTING, answers)

export const pagePathFrom = (startPlace, journeyId, slug) =>
  withTrail(pagePath(journeyId, slug), [TRAIL_START[startPlace]])
