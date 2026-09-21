/**
 * SYNTHETIC FIXTURE — owned by the tests, NOT journey content.
 *
 * The single entry point for the fixture obligation set. `installFixture()`
 * configures every journey-shaped port the engine reads through, so the
 * engine suite runs against a stable synthetic set rather than against
 * whichever set happens to be installed under `src/server/app/sets/`.
 *
 * The engine and the L2 obligation model are journey-agnostic by design.
 * Their tests must therefore declare their own manifest: an empty
 * installed set would otherwise fail every test that names an obligation,
 * and a populated one would couple generic behaviour to one journey's
 * domain. Nothing in this directory describes a real journey, and nothing
 * here should be copied into one.
 *
 * See `./obligations.js` for the shapes covered and the naming scheme.
 */

import { configureFulfilmentRegistry } from '../../src/server/app/bridge/fulfilment-registry.js'
import {
  ENFORCED_AT_CONTINUE,
  MAX_ENTRIES_FROM,
  SYSTEM_POPULATED
} from '../../src/server/app/bridge/obligation-source.js'
import { configureObligationSet } from '../../src/server/app/model/obligations/manifest.js'
import { configureJourneyFlow } from '../../src/server/app/flow/journey-flow.js'
import * as fixtureObligationSet from './obligations.js'
import { featureEvaluationBindings } from './bindings.js'
import {
  entryGuardTarget,
  FLOW_ONLY_KEYS,
  LAYOUT,
  nextRunTarget,
  rowStatus,
  sectionCaptionOf,
  sections,
  taskRows
} from './flow.js'

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
  rowParts,
  rowStatus,
  sectionCaptionOf,
  sections,
  taskRowById,
  taskRows
} from './flow.js'

/**
 * The value-linked write cap: `nestedCollection` may hold at most as many
 * entries as its parent entry's `itemCount` says. `appendEntryAt` rejects
 * at the cap.
 */
export const fixtureMaxEntriesFrom = { nestedCollection: 'itemCount' }

/** Obligations declared but presented by no page. */
export const fixtureSystemPopulated = ['systemPopulatedField']

/**
 * Obligations a later page may not be reached without. `scalarField` sits
 * on the first flow page and `itemSelector` inside the first collection,
 * so between them they gate everything downstream.
 */
export const fixtureEnforcedAtContinue = ['scalarField', 'itemSelector']

// `MAX_ENTRIES_FROM`, `SYSTEM_POPULATED` and `ENFORCED_AT_CONTINUE` are
// set-owned declaration data that currently live as module constants in
// the journey-agnostic bridge, so there is no configure* seam to pass
// them through. Merging into them is idempotent and additive.
// Replace this with a configure call once the bridge
// reads them from the configured set.
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
 * Configure every journey-shaped port with the fixture set. Idempotent —
 * safe to call from the vitest global setup and again from any test that
 * reconfigures a port and wants to put the fixture back.
 */
export const installFixture = () => {
  mergeSetDeclarations()
  configureObligationSet(fixtureObligationSet)
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
}
