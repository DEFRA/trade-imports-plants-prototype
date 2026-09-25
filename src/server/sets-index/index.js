import {
  currentSetBase,
  mountedSetIds,
  withSetContext
} from '../app/shared/set-context.js'
import { setsIndexController } from './controller.js'
import { resetRoute } from './reset-controller.js'

/**
 * Every mounted set as a `[setId, prefix]` pair, read back through the set
 * context's own public API — the prefix is whatever the set registered, not
 * rebuilt from its id — so plants-frontend's set-context.js needs no
 * prototype-only export.
 *
 * @returns {Array<[string, string]>} one pair per mounted set.
 */
export const mountedSets = () =>
  mountedSetIds().map((setId) => [setId, withSetContext(setId, currentSetBase)])

/**
 * The chooser at `/`.
 *
 * This is the prototype host, so the root lists the prototypes it is serving
 * rather than redirecting to one of them: there is no default here, and a
 * reader arriving at the service needs to see what is on offer.
 *
 * Server-wide, so it is registered outside every set's prefix. The mount
 * registry is read per request — the chooser is handed the lookup as a function
 * and calls it inside the handler — so this plugin may be registered in any
 * order relative to the sets.
 */
export const setsIndex = {
  plugin: {
    name: 'sets-index',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/',
          ...setsIndexController(mountedSets)
        },
        resetRoute
      ])
    }
  }
}
