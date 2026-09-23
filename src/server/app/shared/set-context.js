import { AsyncLocalStorage } from 'node:async_hooks'

const storage = new AsyncLocalStorage()
const mounts = new Map()

export const registerSetMount = (setId, prefix) => {
  if (!prefix?.startsWith('/')) {
    throw new Error(`Set "${setId}" needs a mount prefix`)
  }
  mounts.set(setId, prefix)
}

export const mountedSetIds = () => [...mounts.keys()]

/**
 * Every mounted set as a `[setId, prefix]` pair, so a caller that needs the
 * URL a set actually answers on reads it back rather than rebuilding it from
 * the id.
 *
 * @returns {Array<[string, string]>} one pair per mounted set.
 */
export const mountedSets = () => [...mounts.entries()]

/**
 * Which set a request path belongs to, read off the registered mounts.
 *
 * Longest match wins, so a set mounted at `/high-risk-plants/extra` would beat
 * one at `/high-risk-plants` rather than depending on registration order.
 *
 * This is the one way to name a set when there is no ambient context to read:
 * a path that matched no route ran no set's `onPreAuth`, and hapi-vision
 * marshals a view after the handler's context has gone.
 *
 * @param {string} [path] - the request path.
 * @returns {string|undefined} the set id, or undefined where the path is
 * outside every mount — `/health`, `/signout`, `/auth/*`, or a genuinely
 * unrouted URL.
 */
export const setIdForPath = (path) => {
  if (typeof path !== 'string') {
    return undefined
  }
  let match
  for (const [setId, prefix] of mounts) {
    const under = path === prefix || path.startsWith(`${prefix}/`)
    if (under && (!match || prefix.length > mounts.get(match).length)) {
      match = setId
    }
  }
  return match
}

const soleSetId = () => (mounts.size === 1 ? [...mounts.keys()][0] : undefined)

/**
 * Whether a set can be resolved at all.
 *
 * A server-wide route — the chooser at `/`, `/signout`, the sign-in error page
 * — belongs to no set, so anything set-owned has no answer for it. Ask this
 * before reaching for a set rather than catching the throw.
 */
export const hasSetContext = () =>
  (storage.getStore()?.setId ?? soleSetId()) !== undefined

export const currentSetId = () => {
  const id = storage.getStore()?.setId ?? soleSetId()
  if (!id) {
    // Naming the mounted sets separates the two ways this fires: nothing has
    // booted yet, or several sets are mounted and the caller is outside any
    // request's context.
    throw new Error(
      `No set context — no active set, and ${
        mounts.size === 0
          ? 'no set is mounted'
          : `${mounts.size} sets are mounted (${mountedSetIds().join(', ')})`
      }`
    )
  }
  return id
}

/**
 * The mount prefix the active set registered.
 *
 * A missing entry is a wiring fault, not a root-mounted set: answering `''`
 * would conflate the two, and every link the set builds would come out
 * prefix-free and point at the root instead of at the set. Refusing here makes
 * a set that skipped `registerSetMount` fail at boot.
 *
 * @returns {string} the active set's mount prefix.
 */
export const currentSetBase = () => {
  const setId = currentSetId()
  const base = mounts.get(setId)
  if (base === undefined) {
    throw new Error(`Set "${setId}" has no registered mount`)
  }
  return base
}

export const withSetContext = (setId, fn) => storage.run({ setId }, fn)

export const enterSetContext = (setId) => storage.enterWith({ setId })

const contextualMethod = (setId, method) =>
  typeof method === 'function'
    ? (request, h) => withSetContext(setId, () => method(request, h))
    : method

/**
 * Wraps whatever shape a route's lifecycle entry takes — a bare function, an
 * object carrying `method`, or an array of either. Route `ext` points and
 * `pre` entries both use this grammar, so both go through here.
 *
 * @param {string} setId - the set the entry belongs to.
 * @param {Function|object|Array} entry - the lifecycle entry to wrap.
 * @returns {Function|object|Array} the entry, running inside the set.
 */
const contextualEntry = (setId, entry) => {
  if (Array.isArray(entry)) {
    return entry.map((item) => contextualEntry(setId, item))
  }
  if (typeof entry === 'function') {
    return contextualMethod(setId, entry)
  }
  return {
    ...entry,
    method: contextualMethod(setId, entry.method)
  }
}

const contextualOptions = (setId, options) => {
  const { ext, handler, pre } = options
  return {
    ...options,
    ...(ext && {
      ext: Object.fromEntries(
        Object.entries(ext).map(([point, extension]) => [
          point,
          contextualEntry(setId, extension)
        ])
      )
    }),
    // `options.handler` is the same handler by another name, and `options.pre`
    // runs before it. Both would otherwise resolve whichever set happened to be
    // ambient, so both are wrapped the way `route.handler` is.
    ...(handler && { handler: contextualMethod(setId, handler) }),
    ...(pre && { pre: contextualEntry(setId, pre) })
  }
}

/**
 * A route declaration whose every declared method runs inside its own set.
 *
 * Each key is wrapped only where the route actually declares it: Hapi rejects a
 * route that carries both `handler` and `options.handler`, so writing an
 * `undefined` handler back would turn a valid `options.handler` route into a
 * registration error.
 *
 * @param {string} setId - the set the route belongs to.
 * @param {object} route - the route declaration.
 * @returns {object} the same declaration, wrapped.
 */
export const routeWithSetContext = (setId, route) => ({
  ...route,
  ...(route.options && { options: contextualOptions(setId, route.options) }),
  ...(route.handler && { handler: contextualMethod(setId, route.handler) })
})

/**
 * The seams a mounted set MUST configure, indexed by label as each seam module
 * loads. A seam opts in by naming the function that configures it, so the
 * completeness check at mount reads this rather than a hand-kept list a new
 * seam could quietly fall out of.
 *
 * Seams with a real default register nothing here: the answers-for-read
 * sanitiser, whose default is identity, and the flow-only keys, which
 * `configureJourneyFlow` forwards rather than a gateway configuring directly.
 * A set that leaves those alone is correctly configured.
 */
const requiredSeams = new Map()

/**
 * A per-set store for one configuration seam.
 *
 * @param {string} label - the seam's name, as it appears in error messages.
 * @param {object} [options] - seam options.
 * @param {string} [options.configuredBy] - the configure function a set calls
 * to fill this seam. Naming it marks the seam required, so a set that mounts
 * without calling it is rejected at registration.
 * @returns {{configure: Function, current: Function, has: Function}} the store.
 */
export const setKeyed = (label, { configuredBy } = {}) => {
  const bySet = new Map()
  const has = (setId) => bySet.has(setId)
  if (configuredBy) {
    requiredSeams.set(label, { configuredBy, has })
  }
  return {
    configure: (setId, value) => bySet.set(setId, value),
    current: () => {
      const setId = currentSetId()
      if (!bySet.has(setId)) {
        throw new Error(`${label} not configured for set "${setId}"`)
      }
      return bySet.get(setId)
    },
    has
  }
}

/** Every required seam's label, in the order the seam modules declared them. */
export const requiredSeamLabels = () => [...requiredSeams.keys()]

/**
 * The required seams a set has not configured, each named alongside the call
 * that would configure it.
 *
 * @param {string} setId - the set to check.
 * @returns {string[]} descriptions such as `journey flow (configureJourneyFlow)`,
 * empty when the set has configured every required seam.
 */
export const unconfiguredSeamsOf = (setId) =>
  [...requiredSeams]
    .filter(([, seam]) => !seam.has(setId))
    .map(([label, { configuredBy }]) => `${label} (${configuredBy})`)
