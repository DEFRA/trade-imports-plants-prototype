/**
 * The link between the ins-address-book stub (where a design release adds,
 * changes and deletes addresses) and the address book the journey's pickers
 * read (`src/server/app/services/address-book/index.js`, the real service's
 * seam, patched once to call `withExtraParties`).
 *
 * The stub hands a function in here when it loads; `withExtraParties` in
 * `src/server/prototype-data/` asks it on every read. So the pickers see an
 * address as soon as an address book page adds it, without one line of the
 * real seam changing. This file imports nothing, so neither side depends on
 * the other.
 */
let provider = null

/**
 * Hands in what people changed in the address book, for the active set.
 *
 * @param {() => { version: number, added: object[], hiddenIds: Set<string> }} changes
 * - `added` in the pickers' record shape; `version` changes whenever they do.
 */
export const provideAddressBookChanges = (changes) => {
  provider = changes
}

/**
 * What people changed in the address book in the active set, or null when
 * no address book page has been used since the prototype started.
 *
 * @returns {{ version: number, added: object[], hiddenIds: Set<string> } | null}
 */
export const addressBookChanges = () => (provider ? provider() : null)
