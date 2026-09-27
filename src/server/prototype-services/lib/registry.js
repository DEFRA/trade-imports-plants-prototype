/**
 * Every fake service that has been loaded, by name.
 *
 * A fake registers itself when its module loads. That gives the two things a
 * fake owes the rest of the prototype:
 *
 * - **Reset**: "Reset this prototype's data" on the chooser calls the set's
 *   records `clear()`. The records wrapper (`../records/index.js`) then calls
 *   `clearFakesFor(setId)`, so every fake that set used is emptied too.
 * - **Honesty in the hand-off**: `describeFakes()` names each fake and the real
 *   service it stands in for, so a brief can say "needs a real service".
 */
const fakes = new Map()

/**
 * Registers a fake service.
 *
 * @param {object} fake
 * @param {string} fake.name - short id, used in file names (`transporters`).
 * @param {string} fake.needsARealService - one plain sentence naming what the
 * real service would have to provide.
 * @param {(setId: string) => void} fake.clear - empties the fake for one set.
 */
export const registerFake = ({ name, needsARealService, clear }) => {
  fakes.set(name, { name, needsARealService, clear })
}

/**
 * Empties every loaded fake for one set.
 *
 * @param {string} setId - the set being reset.
 * @returns {string[]} the names of the fakes that were emptied.
 */
export const clearFakesFor = (setId) => {
  for (const fake of fakes.values()) {
    fake.clear(setId)
  }
  return [...fakes.keys()]
}

/**
 * What each loaded fake stands in for.
 *
 * @returns {Array<{name: string, needsARealService: string}>} one entry per fake.
 */
export const describeFakes = () =>
  [...fakes.values()].map(({ name, needsARealService }) => ({
    name,
    needsARealService
  }))
