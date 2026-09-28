/**
 * Every stub store that has been loaded, by name: the Reset registry.
 *
 * A prototype-owned service's `stub.js` makes its store with
 * `createFakeStore`, which registers the store here when the module loads.
 * "Reset this prototype's data" on the chooser calls the set's records
 * `clear()`; the records wrapper (`./wrap.js`) then calls
 * `clearFakesFor(setId)`, so every stub store that set used is emptied too,
 * and only for that set.
 *
 * What each service stands in for is not kept here: it is the `CONTRACT` and
 * `NEEDS_A_REAL_SERVICE` each service's `index.js` exports, read by
 * `./contracts.js`.
 */
const stores = new Map()

/**
 * Registers a stub store for Reset.
 *
 * @param {object} store
 * @param {string} store.name - short id, used in file names (`transporters`).
 * @param {(setId: string) => void} store.clear - empties the store for one set.
 */
export const registerFake = ({ name, clear }) => {
  stores.set(name, { name, clear })
}

/**
 * Empties every loaded stub store for one set.
 *
 * @param {string} setId - the set being reset.
 * @returns {string[]} the names of the stores that were emptied.
 */
export const clearFakesFor = (setId) => {
  for (const store of stores.values()) {
    store.clear(setId)
  }
  return [...stores.keys()]
}
