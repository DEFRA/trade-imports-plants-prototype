import { mountedSets } from '../app/shared/set-context.js'
import { setsIndexController } from './controller.js'

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
        }
      ])
    }
  }
}
