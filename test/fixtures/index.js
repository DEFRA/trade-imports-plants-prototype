import { configureFulfilmentRegistry } from '../../src/server/app/bridge/fulfilment-registry.js'
import {
  ENFORCED_AT_CONTINUE,
  MAX_ENTRIES_FROM,
  SYSTEM_POPULATED
} from '../../src/server/app/bridge/obligation-source.js'
import { configureObligationSet } from '../../src/server/app/model/obligations/manifest.js'
import { configureJourneyFlow } from '../../src/server/app/flow/journey-flow.js'
import { registerSetMount } from '../../src/server/app/shared/set-context.js'
import {
  SET_BASE,
  SET_ID
} from '../../src/server/app/sets/high-risk-plants/set.js'
import * as fixtureObligationSet from './obligations.js'
import { featureEvaluationBindings } from './bindings.js'
import {
  entryGuardTarget,
  FLOW_ONLY_KEYS,
  LAYOUT,
  nextRunTarget,
  previousRunTarget,
  rowStatus,
  sectionCaptionOf,
  sections,
  taskRows
} from './flow.js'

export {
  SET_BASE,
  SET_ID
} from '../../src/server/app/sets/high-risk-plants/set.js'
export * from './obligations.js'
export * from './values.js'
export { dispatchPages, itemDetailPage, itemsPage } from './pages.js'
export { featureEvaluationBindings } from './bindings.js'
export {
  CAPTIONS,
  entryGuardTarget,
  FLOW_ONLY_KEY,
  FLOW_ONLY_KEYS,
  LAYOUT,
  nextRunTarget,
  previousRunTarget,
  rowParts,
  rowStatus,
  sectionCaptionOf,
  sections,
  taskRowById,
  taskRows
} from './flow.js'

export const fixtureMaxEntriesFrom = { nestedCollection: 'itemCount' }

/** Obligations declared but presented by no page. */
export const fixtureSystemPopulated = ['systemPopulatedField']

export const fixtureEnforcedAtContinue = ['scalarField', 'itemSelector']

const mergeSetDeclarations = () => {
  Object.assign(MAX_ENTRIES_FROM, fixtureMaxEntriesFrom)
  for (const name of fixtureSystemPopulated) {
    SYSTEM_POPULATED.add(name)
  }
  for (const name of fixtureEnforcedAtContinue) {
    ENFORCED_AT_CONTINUE.add(name)
  }
}

/**
 * Configure every journey-shaped port with the fixture set. Idempotent.
 */
export const installFixture = () => {
  mergeSetDeclarations()
  registerSetMount(SET_ID, SET_BASE)
  configureObligationSet(SET_ID, fixtureObligationSet)
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
