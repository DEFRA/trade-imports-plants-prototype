import { buildDispatch } from './flow/dispatch.js'
import {
  configureJourneyFlow,
  journeyEntryGuardTarget
} from './flow/journey-flow.js'
import { readyForCheckYourAnswers } from './flow/section-status.js'
import { configureReadyForCheckYourAnswers } from './bridge/readiness-config.js'
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
import {
  nextRunTarget,
  previousRunTarget
} from './sets/high-risk-plants/journeys/linear/flow/run.js'
import { entryGuardTarget } from './sets/high-risk-plants/journeys/linear/flow/entry-guard.js'
import {
  LAYOUT,
  SESSION_COOKIE_NAMES
} from './sets/high-risk-plants/journeys/linear/config.js'
import * as highRiskPlantsObligationSet from './sets/high-risk-plants/obligations/index.js'
import { assertObligationPurity } from './obligation-purity.js'
import { assertSetConfigured } from './set-completeness.js'
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
import {
  enterSetContext,
  registerSetMount,
  routeWithSetContext,
  withSetContext
} from './shared/set-context.js'
import { SET_BASE, SET_ID } from './sets/high-risk-plants/set.js'

export const highRiskPlants = {
  plugin: {
    name: SET_ID,
    register: async (server) => {
      registerSetMount(SET_ID, SET_BASE)
      await withSetContext(SET_ID, async () => {
        server.ext(
          'onPreAuth',
          (_request, h) => {
            enterSetContext(SET_ID)
            return h.continue
          },
          { sandbox: 'plugin' }
        )
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
        configureReadyForCheckYourAnswers(SET_ID, readyForCheckYourAnswers)
        assertObligationPurity()
        assertFulfilmentBindingCoverage()
        buildDispatch(SET_ID, dispatchPages)
        configureRecords(SET_ID, records)
        configureSession(SET_ID, session, SESSION_COOKIE_NAMES)
        registerJourneyCookie(server)
        server.ext(
          'onPreHandler',
          async (request, h) => {
            const target = await withSetContext(SET_ID, () =>
              journeyEntryGuardTarget(request, h)
            )
            return target ? h.redirect(target).takeover() : h.continue
          },
          { sandbox: 'plugin' }
        )
        server.route(
          allRoutes.map((route) => routeWithSetContext(SET_ID, route))
        )
        assertSetConfigured(server, SET_ID)
      })
    }
  }
}
