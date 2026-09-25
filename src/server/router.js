import inert from '@hapi/inert'

import { health } from './health/index.js'
import { serviceRoutes } from './app/routes.js'
import { prototypeSets } from './prototype-sets/index.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'
import { config } from '../config/config.js'
import { SET_BASE as HIGH_RISK_PLANTS_BASE } from './app/sets/high-risk-plants/set.js'

export const DEFAULT_SET_BASE = HIGH_RISK_PLANTS_BASE

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      await server.register([health])

      if (config.get('auth.enabled')) {
        await server.register(serviceRoutes, {
          routes: { prefix: HIGH_RISK_PLANTS_BASE }
        })

        // Prototype host: the prototype-only sets, and the chooser at `/` in
        // place of the redirect to the default set.
        await server.register(prototypeSets)
      }

      await server.register([serveStaticFiles])
    }
  }
}
