/**
 * Read-only "live" views over a stub service's own rows, with the active set's
 * extra rows appended after them.
 *
 * Why a view rather than a function each reader calls: the three service seams
 * (`services/address-book`, `services/ports`, `services/countries`) belong to
 * the real service and are only patched here. A view lets each seam change one
 * declaration — `let ports = withExtraPorts([...PORTS])` — and leave every
 * reader below it exactly as upstream wrote it, so the weekly update has one
 * small hunk per file to merge rather than one per reader.
 *
 * The extra rows depend on which set the request is in, so the view reads them
 * on every access rather than once. Read a view inside the request (or
 * `withSetContext`) that asked for it: a view kept and read later answers for
 * whichever set is active then.
 */

const refuse = () => {
  throw new TypeError(
    'The stub rows are read-only here. Add extra rows in src/server/prototype-data instead.'
  )
}

const readOnlyTraps = {
  set: refuse,
  defineProperty: refuse,
  deleteProperty: refuse
}

/**
 * The base rows followed by the extra rows, rebuilt only when the extra rows
 * change, so a reader looping over a few hundred ports does not copy the list
 * on every index it reads.
 */
const combiner = (base, extras) => {
  let lastExtras
  let lastCombined = base
  return () => {
    const more = extras()
    if (more.length === 0) {
      return base
    }
    if (more !== lastExtras) {
      lastExtras = more
      lastCombined = [...base, ...more]
    }
    return lastCombined
  }
}

/**
 * A list that reads like `[...base, ...extras()]` on every access.
 *
 * @param {object[]} base - the stub rows, never changed.
 * @param {() => object[]} extras - the active set's extra rows.
 * @returns {object[]} a read-only array view.
 */
export const liveList = (base, extras) => {
  const current = combiner(base, extras)
  return new Proxy([], {
    ...readOnlyTraps,
    get: (_target, key) => Reflect.get(current(), key),
    has: (_target, key) => Reflect.has(current(), key),
    ownKeys: () => Reflect.ownKeys(current()),
    getOwnPropertyDescriptor: (_target, key) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(current(), key)
      // Only `length` exists on the empty target; every other key must be
      // reported configurable or the Proxy invariants refuse it.
      return descriptor && key !== 'length'
        ? { ...descriptor, configurable: true }
        : descriptor
    }
  })
}

/**
 * A code-to-name lookup that reads like `{ ...base, ...extras() }` on every
 * access.
 *
 * @param {Record<string, string>} base - the stub lookup, never changed.
 * @param {() => Record<string, string>} extras - the active set's extra
 * entries.
 * @returns {Record<string, string>} a read-only object view.
 */
export const liveLookup = (base, extras) => {
  let lastExtras
  let lastCombined = base
  const current = () => {
    const more = extras()
    if (Object.keys(more).length === 0) {
      return base
    }
    if (more !== lastExtras) {
      lastExtras = more
      lastCombined = { ...base, ...more }
    }
    return lastCombined
  }
  return new Proxy(
    {},
    {
      ...readOnlyTraps,
      get: (_target, key) => Reflect.get(current(), key),
      has: (_target, key) => Reflect.has(current(), key),
      ownKeys: () => Reflect.ownKeys(current()),
      getOwnPropertyDescriptor: (_target, key) => {
        const descriptor = Reflect.getOwnPropertyDescriptor(current(), key)
        return descriptor && { ...descriptor, configurable: true }
      }
    }
  )
}
