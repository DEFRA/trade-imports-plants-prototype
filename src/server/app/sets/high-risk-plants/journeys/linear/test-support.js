import { beforeAll, it } from 'vitest'
import { registerSetMount } from '../../../../shared/set-context.js'
import { dashboardPath, hubPath } from '../../../../shared/paths.js'
import {
  driveHandler,
  expectBackLinkIsPath,
  useStubbedJourney
} from '../../../../engine/test-support.js'
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
import { nextRunTarget, previousRunTarget } from './flow/run.js'
import { entryGuardTarget } from './flow/entry-guard.js'
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
  countryOfOrigin: 'FR',
  arrivalDate: Object.freeze({ day: '27', month: '3', year: '2026' }),
  arrivalTime: '14:30',
  proposedPlaceOfLanding: 'GB DVR',
  placeOfDestination: TECH_IMPORTS_COPY
})

/** A plants-for-planting notification with every question the opening run asks answered. */
export const COMPLETE_PLANTS_NOTIFICATION = Object.freeze({
  commodityType: 'plants-for-planting',
  commodityLines: [
    { category: 'plants-for-planting', genus: 'Picea', quantity: '30' }
  ],
  countryOfOrigin: 'FR',
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
    nextRunTarget,
    previousRunTarget,
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

export const itSendsBackToTheDashboardUntilCommodityTypeAnswered = (get) => {
  it('Should send Back to the dashboard while nothing is committed', async () => {
    expectBackLinkIsPath(await driveHandler(get), dashboardPath())
  })

  it('Should send Back to the overview once the commodity type is answered', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: 'potatoes' }
    })

    expectBackLinkIsPath(result, hubPath(result.journeyId))
  })
}
