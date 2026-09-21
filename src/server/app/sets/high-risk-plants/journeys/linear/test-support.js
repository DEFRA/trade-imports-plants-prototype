/**
 * Install this journey in place of the synthetic fixture set.
 *
 * The Vitest global setup wires a journey-neutral fixture (`test/fixtures/`)
 * because the engine and the L2 model must not depend on whichever set is
 * installed. A test that drives one of THIS journey's controllers needs the
 * real thing instead: the evaluator has to recognise the answer keys the
 * controller commits, and the derived page gates read this journey's flow and
 * dispatch index.
 *
 * Vitest gives each file its own module registry, so nothing leaks to another
 * file and there is nothing to restore.
 */
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
import { nextRunTarget } from './flow/run.js'
import { entryGuardTarget } from './flow/entry-guard.js'
import { sectionCaptionOf } from './flow/section-captions/index.js'

/**
 * A notification whose commodity section is complete: a potato consignment
 * with one line carrying every field its category asks for. Several suites
 * need "the commodities task is done" and would otherwise each hand-build the
 * same line and drift from the manifest as fields land.
 */
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

/**
 * A notification with every section the journey has built answered — today the
 * commodities, the origin, the arrival and the destination. Whatever asks "is
 * this ready for Check your answers" needs this rather than the commodity
 * fixture above, and each new section's increment adds its own answers here.
 *
 * Seed potatoes narrow the origin to nothing, so any primed country stands.
 * They also carry no arrival status — reg 24A gives potatoes no post-arrival
 * branch — and do owe a time and a place of landing, so the arrival answers
 * here are the potato three, not the plants two.
 *
 * The destination id must be one the stub address book holds, or resolving it
 * in a test returns undefined and the section reads as unanswered.
 */
export const COMPLETE_NOTIFICATION = Object.freeze({
  ...COMPLETE_POTATO_CONSIGNMENT,
  contactAddress: Object.freeze({
    addressId: 'tech-imports-ltd',
    name: 'Tech Imports Ltd',
    address: Object.freeze({
      country: 'United Kingdom',
      telephoneNumber: '01234567890',
      emailAddress: 'contact@example.com'
    })
  }),
  producerIdentificationNumber: 'P123',
  cropIdentificationNumber: 'C123',
  countryOfOrigin: 'FR',
  arrivalDate: Object.freeze({ day: '27', month: '3', year: '2026' }),
  arrivalTime: '14:30',
  proposedPlaceOfLanding: 'GB DVR',
  placeOfDestination: Object.freeze({ addressId: 'tech-imports-ltd' })
})

export const installHighRiskPlantsJourney = () => {
  configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  configureObligationSet(highRiskPlantsObligationSet)
  configureFulfilmentRegistry(featureEvaluationBindings)
  configureJourneyFlow({
    sections,
    taskRows,
    rowStatus,
    nextRunTarget,
    flowOnlyKeys: FLOW_ONLY_KEYS,
    entryGuardTarget,
    sectionCaption: sectionCaptionOf,
    layout: LAYOUT
  })
  buildDispatch(dispatchPages)
}
