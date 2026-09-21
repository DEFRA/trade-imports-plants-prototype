/**
 * SYNTHETIC FIXTURE — owned by the tests, not journey content.
 *
 * The literal answer values the fixture obligation set recognises. Every
 * value is abstract on purpose: the engine is journey-agnostic and its
 * tests must not encode any journey's domain. Use these constants rather
 * than inlining strings, so a shape change lands in one place.
 */

// `branchSelector` — the four-way enum that gates four dependants.
export const BRANCH_A = 'branchA'
export const BRANCH_B = 'branchB'
export const BRANCH_C = 'branchC'
export const BRANCH_D = 'branchD'

// `statusToggle` — the yes/no whose value flips `statusFlipField`'s mandate.
export const TOGGLE_YES = 'yes'
export const TOGGLE_NO = 'no'

// `variantSelector` — picks one of two mutually exclusive composite blocks.
export const VARIANT_ONE = 'variantOne'
export const VARIANT_TWO = 'variantTwo'

// `modeSelector` — membership in a list gates `modeGatedList`.
export const MODE_ALPHA = 'modeAlpha'
export const MODE_BRAVO = 'modeBravo'
export const MODE_CHARLIE = 'modeCharlie'

// `itemSelector` — the in-collection enum that gates same-level and
// deeper-level fields. ECHO is in no allowlist, so it is the value that
// drives the `notInUnionOf` fallback fields.
export const SELECTOR_ALPHA = 'selectorAlpha'
export const SELECTOR_BRAVO = 'selectorBravo'
export const SELECTOR_CHARLIE = 'selectorCharlie'
export const SELECTOR_DELTA = 'selectorDelta'
export const SELECTOR_ECHO = 'selectorEcho'

// `itemCategory` / `itemTags` — plain in-collection scalar and array values.
export const CATEGORY_ONE = 'categoryOne'
export const CATEGORY_TWO = 'categoryTwo'
export const TAG_ONE = 'tagOne'
export const TAG_TWO = 'tagTwo'

// `boundedItemType` / `boundedItemMode`.
export const BOUNDED_TYPE_ONE = 'typeOne'
export const BOUNDED_TYPE_TWO = 'typeTwo'
export const BOUNDED_MODE_ONE = 'modeOne'
export const BOUNDED_MODE_TWO = 'modeTwo'

// `scalarField` / `enumScalarField` / `lookupField`.
export const VALUE_ONE = 'valueOne'
export const VALUE_TWO = 'valueTwo'
export const OPTION_ONE = 'optionOne'
export const OPTION_TWO = 'optionTwo'
export const LOOKUP_ONE = 'lookupOne'
export const LOOKUP_TWO = 'lookupTwo'

/**
 * A composite value for the `compositeBlock*` obligations. The engine
 * treats the whole object as one opaque leaf value, so the part names
 * carry no meaning beyond being distinguishable.
 *
 * @param {string} [label] - folded into each part so blocks compare unequal.
 * @returns {{ partOne: string, partTwo: string }} the composite value.
 */
export const compositeBlockValue = (label = 'one') => ({
  partOne: `part one ${label}`,
  partTwo: `part two ${label}`
})

/**
 * A composite date value for `dateField` and `boundedItemDate`.
 *
 * @param {object} [overrides] - day / month / year parts to replace.
 * @returns {{ day: string, month: string, year: string }} the date value.
 */
export const dateValue = (overrides = {}) => ({
  day: '1',
  month: '2',
  year: '2026',
  ...overrides
})
