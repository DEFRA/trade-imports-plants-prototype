import { AsyncLocalStorage } from 'node:async_hooks'

const storage = new AsyncLocalStorage()
const mounts = new Map()
const seams = new Map()

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

export const currentSetBase = () =>
  // Defensive default only: registered sets never have an empty prefix;
  // `''` means an active set id has no registered mount, not a root-mounted set.
  mounts.get(currentSetId()) ?? ''

export const withSetContext = (setId, fn) => storage.run({ setId }, fn)

export const enterSetContext = (setId) => storage.enterWith({ setId })

const contextualMethod = (setId, method) =>
  typeof method === 'function'
    ? (request, h) => withSetContext(setId, () => method(request, h))
    : method

const contextualExtension = (setId, extension) => {
  if (Array.isArray(extension)) {
    return extension.map((item) => contextualExtension(setId, item))
  }
  if (typeof extension === 'function') {
    return contextualMethod(setId, extension)
  }
  return {
    ...extension,
    method: contextualMethod(setId, extension.method)
  }
}

export const routeWithSetContext = (setId, route) => {
  const ext = route.options?.ext
  return {
    ...route,
    ...(ext && {
      options: {
        ...route.options,
        ext: Object.fromEntries(
          Object.entries(ext).map(([point, extension]) => [
            point,
            contextualExtension(setId, extension)
          ])
        )
      }
    }),
    handler: contextualMethod(setId, route.handler)
  }
}

/**
 * Whether the seam `label` names has been configured for `setId`, or
 * `undefined` when no seam answers to that label — either nothing has imported
 * the module that creates it, or its label has been renamed. The mount check
 * in `set-mount.js` reads the seams through this rather than each seam module
 * exporting a probe of its own.
 *
 * @param {string} label the label the seam passed to `setKeyed`.
 * @param {string} setId the set to ask about.
 * @returns {boolean|undefined} configured, not configured, or no such seam.
 */
export const seamConfiguredFor = (label, setId) => seams.get(label)?.(setId)

export const setKeyed = (label) => {
  const bySet = new Map()
  seams.set(label, (setId) => bySet.has(setId))
  return {
    configure: (setId, value) => bySet.set(setId, value),
    current: () => {
      const setId = currentSetId()
      if (!bySet.has(setId)) {
        throw new Error(`${label} not configured for set "${setId}"`)
      }
      return bySet.get(setId)
    },
    has: (setId) => bySet.has(setId)
  }
}
