import inert from '@hapi/inert'

import { health } from './health/index.js'
import { signout } from './signout/index.js'
import { setsIndex } from './sets-index/index.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'
import { config } from '../config/config.js'
import { highRiskPlants, sampleJourney } from './app/routes.js'
import { SET_BASE as HIGH_RISK_PLANTS_BASE } from './app/sets/high-risk-plants/set.js'
import { SET_BASE as SAMPLE_JOURNEY_BASE } from './app/sets/sample-journey/set.js'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // This is the prototype host: several prototypes run side by side, each
      // one a set under its own prefix, and none at the root. A set at the root
      // would make a link that doubles or drops the prefix still look right for
      // that set, and the mistake would only show up on another one.
      await server.register(highRiskPlants, {
        routes: { prefix: HIGH_RISK_PLANTS_BASE }
      })
      await server.register(sampleJourney, {
        routes: { prefix: SAMPLE_JOURNEY_BASE }
      })

      // Server-wide, NOT per set. /signout registers happily under a set's
      // prefix and fails only when a user tries to sign out, so it is
      // registered outside the prefixed calls and pinned by co-residency.test.js.
      const authEnabled = config.get('auth.enabled')
      if (authEnabled) {
        await server.register([signout])
      }

      // `/` lists the sets rather than redirecting to one: with several
      // prototypes hosted there is no default, and a reader arriving at the
      // service needs to see what is on offer. The mount registry is read per
      // request — the chooser is handed the lookup as a function and calls it
      // inside the handler — so this may be registered in any order relative
      // to the sets.
      await server.register([setsIndex])

      // Static assets
      await server.register([serveStaticFiles])
    }
  }
}
