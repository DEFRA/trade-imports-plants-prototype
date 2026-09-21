import { buildDispatch } from './flow/dispatch.js'
import {
  configureJourneyFlow,
  journeyEntryGuardTarget
} from './flow/journey-flow.js'
import { readyForCheckYourAnswers } from './flow/section-status.js'
import { configureReadyForCheckYourAnswers } from './bridge/readiness-config.js'
import { configureAnswersForRead } from './bridge/answers-read.js'
import {
  allRoutes,
  dispatchPages
} from './sets/high-risk-plants/journeys/linear/features/index.js'
import { featureEvaluationBindings } from './sets/high-risk-plants/journeys/linear/features/evaluation.js'
import {
  FLOW_ONLY_KEYS,
  sections
} from './sets/high-risk-plants/journeys/linear/flow/flow.js'
import {
  rowStatus,
  taskRows
} from './sets/high-risk-plants/journeys/linear/flow/task-rows.js'
import { sectionCaptionOf } from './sets/high-risk-plants/journeys/linear/flow/section-captions/index.js'
import { nextRunTarget } from './sets/high-risk-plants/journeys/linear/flow/run.js'
import { entryGuardTarget } from './sets/high-risk-plants/journeys/linear/flow/entry-guard.js'
import { withoutUnresolvedPartyRefs } from './sets/high-risk-plants/journeys/linear/parties/index.js'
import {
  LAYOUT,
  SESSION_COOKIE_NAMES
} from './sets/high-risk-plants/journeys/linear/config.js'
import * as highRiskPlantsObligationSet from './sets/high-risk-plants/obligations/index.js'
import { assertObligationPurity } from './obligation-purity.js'
import {
  assertFulfilmentBindingCoverage,
  configureFulfilmentRegistry
} from './bridge/fulfilment-registry.js'
import { configureObligationSet } from './model/obligations/manifest.js'
import { configureRecords } from './engine/persistence/records.js'
import { records } from './services/persistence/records/index.js'
import { configureSession } from './engine/persistence/session.js'
import { session } from './services/persistence/session/index.js'
import { registerJourneyCookie } from './engine/journey.js'

export const highRiskPlants = {
  plugin: {
    name: 'high-risk-plants',
    register: async (server) => {
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
      configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
      configureAnswersForRead(withoutUnresolvedPartyRefs)
      assertObligationPurity()
      assertFulfilmentBindingCoverage()
      buildDispatch(dispatchPages)
      configureRecords(records)
      configureSession(session, SESSION_COOKIE_NAMES)
      registerJourneyCookie(server)
      server.ext('onPreHandler', async (request, h) => {
        const target = await journeyEntryGuardTarget(request, h)
        return target ? h.redirect(target).takeover() : h.continue
      })
      server.route(allRoutes)
    }
  }
}
