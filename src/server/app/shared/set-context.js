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
 * Which set a request path belongs to, read off the registered mounts.
 *
 * The longest matching prefix wins, whatever the registration order.
 *
 * @param {string} [path] - the request path.
 * @returns {string|undefined} the set id, or undefined where the path is
 * outside every mount — `/health`, `/auth/*`, or a genuinely unrouted URL.
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
 * @returns {boolean} true when `currentSetId()` would answer.
 */
export const hasSetContext = () =>
  (storage.getStore()?.setId ?? soleSetId()) !== undefined

export const currentSetId = () => {
  const id = storage.getStore()?.setId ?? soleSetId()
  if (!id) {
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

/**
 * An `onRequest` extension that enters the set whose mount the request path
 * falls under, before routing.
 */
export const setContextExtension = {
  type: 'onRequest',
  method: (request, h) => {
    const setId = setIdForPath(request.path)
    if (setId) {
      enterSetContext(setId)
    }
    return h.continue
  }
}

const contextualMethod = (setId, method) =>
  typeof method === 'function'
    ? (request, h) => withSetContext(setId, () => method(request, h))
    : method

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
    ...(handler && { handler: contextualMethod(setId, handler) }),
    ...(pre && { pre: contextualEntry(setId, pre) })
  }
}

/**
 * A route registered so every method it declares runs inside its own set. Only
 * the keys the route declares are set.
 *
 * @param {string} setId - the set the route belongs to.
 * @param {object} route - the route as the set declared it.
 * @returns {object} the same route with every declared method wrapped.
 */
export const routeWithSetContext = (setId, route) => ({
  ...route,
  ...(route.options && { options: contextualOptions(setId, route.options) }),
  ...(route.handler && { handler: contextualMethod(setId, route.handler) })
})

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
