/**
 * SYNTHETIC FIXTURE — owned by the tests, not journey content.
 *
 * The reference-data side of the fixture set: the allowlists the
 * projection gates read.
 *
 * Allowlists are functions, not arrays, because that is how the engine's
 * `allowListed` / `notInUnionOf` / `anyAllowListed` helpers accept a
 * late-bound reference list.
 */

import {
  SELECTOR_ALPHA,
  SELECTOR_BRAVO,
  SELECTOR_CHARLIE,
  SELECTOR_DELTA
} from './values.js'

// Same-level gate (gate and gated both inside `itemCollection`).
export const itemGatedFieldSelectors = () => [SELECTOR_ALPHA, SELECTOR_BRAVO]

// Deeper-level gates (gate inside `itemCollection`, gated inside
// `nestedCollection`), projected through the nested group.
export const nestedGatedFieldASelectors = () => [SELECTOR_ALPHA]
export const nestedGatedFieldBSelectors = () => [SELECTOR_BRAVO]
export const nestedGatedFieldCSelectors = () => [SELECTOR_CHARLIE]
export const nestedGatedFieldDSelectors = () => [SELECTOR_DELTA]
export const nestedCompositeBlockSelectors = () => [SELECTOR_DELTA]

/**
 * The four typed allowlists whose union the fallback fields complement.
 * `SELECTOR_ECHO` is in none of them, so it is the value that puts
 * `nestedFallbackFieldA` / `nestedFallbackFieldB` in scope.
 *
 * @returns {Array<Array<string>>} the allowlists to union.
 */
export const typedNestedSelectorLists = () => [
  nestedGatedFieldASelectors(),
  nestedGatedFieldBSelectors(),
  nestedGatedFieldCSelectors(),
  nestedGatedFieldDSelectors()
]

// Aggregate gates — a top-level scalar reads ANY record's selector value.
export const aggregateGatedFieldSelectors = () => [SELECTOR_ALPHA]
export const aggregateGatedToggleSelectors = () => [SELECTOR_BRAVO]
