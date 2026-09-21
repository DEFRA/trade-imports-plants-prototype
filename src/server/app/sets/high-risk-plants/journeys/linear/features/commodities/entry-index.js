/**
 * Whether a request named a line at all.
 *
 * @param {*} raw - the `index` query parameter or form field.
 * @returns {boolean} true when the caller supplied one.
 */
export const hasEntryIndex = (raw) =>
  raw !== undefined && raw !== null && String(raw) !== ''

/**
 * The positional index of the line a request names, or null when it names
 * none the collection holds.
 *
 * A forged or stale index is refused rather than acted on: the engine's own
 * `isValidIndex` stops `splice(NaN, 1)` destroying the first entry, and this
 * keeps a bad index from reaching a render or a write in the first place.
 *
 * @param {*} raw - the `index` query parameter or form field.
 * @param {number} count - how many lines the collection holds.
 * @returns {number|null} the index, or null.
 */
export const entryIndexOf = (raw, count) => {
  if (!hasEntryIndex(raw)) {
    return null
  }
  const index = Number(raw)
  return Number.isInteger(index) && index >= 0 && index < count ? index : null
}
