import inert from '@hapi/inert'

import { health } from './health/index.js'
import { signout } from './signout/index.js'
import { prototypeSets } from './prototype-sets/index.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'
import { config } from '../config/config.js'
import { highRiskPlants } from './app/routes.js'
import { SET_BASE as HIGH_RISK_PLANTS_BASE } from './app/sets/high-risk-plants/set.js'

export const DEFAULT_SET_BASE = HIGH_RISK_PLANTS_BASE

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Each set mounts under its own prefix, and none at the root. A set at
      // the root would make a link that doubles or drops the prefix still look
      // right for that set, and the mistake would only show up on another set.
      await server.register(highRiskPlants, {
        routes: { prefix: HIGH_RISK_PLANTS_BASE }
      })

      // Server-wide, NOT per set. /signout registers happily under a set's
      // prefix and fails only when a user tries to sign out, so it is
      // registered outside the prefixed call and pinned by
      // app/co-residency.test.js, test name 'Should serve /signout outside
      // every set prefix'.
      const authEnabled = config.get('auth.enabled')
      if (authEnabled) {
        await server.register([signout])
      }

      // Prototype host: the prototype-only sets, and the chooser at `/` in
      // place of the redirect to the default set.
      await server.register(prototypeSets)

      // Static assets
      await server.register([serveStaticFiles])
    }
  }
}
