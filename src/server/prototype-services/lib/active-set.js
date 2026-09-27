import { currentSetId, hasSetContext } from '../../app/shared/set-context.js'

/**
 * The key a fake service files its state under when no set is active — a unit
 * test, or a script that never entered a set. Never a real set id: set ids are
 * lower-case words and hyphens only.
 */
export const NO_SET = '(no set)'

/**
 * The set the current request belongs to, or `NO_SET` outside every set.
 *
 * Fake services keep one pile of data per set, so "Reset this prototype's
 * data" on one set never empties another set's fake.
 *
 * @returns {string} the active set id.
 */
export const activeSetId = () => (hasSetContext() ? currentSetId() : NO_SET)
